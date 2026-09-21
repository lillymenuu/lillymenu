<?php
/*
 * Chat de suporte do lado do superadmin (Next.js). Mesmas regras de
 * admin/api/suporte_conversas|mensagens|enviar|digitando|unread.php, num unico
 * endpoint com `acao`:
 *   GET  ?acao=conversas[&apenas_com_mensagens=1]
 *   GET  ?acao=mensagens&loja_id=N[&after_id=N]
 *   GET  ?acao=digitando&loja_id=N
 *   GET  ?acao=unread
 *   POST {acao:"enviar", loja_id, mensagem, imagem_base64?, imagem_ext?}
 *   POST {acao:"digitando", loja_id, ativo}
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

apiSuperadminExigir($conn);
suporteGarantirTabelas($conn);
suporteLimparExpiradas($conn);

$post = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
$d = $post ? (json_decode(file_get_contents('php://input'), true) ?: []) : $_GET;
$acao   = (string) ($d['acao'] ?? '');
$lojaId = (int) ($d['loja_id'] ?? 0);

try {
  if ($acao === 'unread') {
    $total = (int) $conn->query("SELECT COUNT(*) FROM suporte_mensagens WHERE remetente = 'loja' AND lida_suporte = 0")->fetchColumn();
    echo json_encode(['ok' => true, 'unread' => $total]);
    exit;
  }

  if ($acao === 'conversas') {
    $having = !empty($d['apenas_com_mensagens']) ? 'HAVING ultima_em IS NOT NULL' : '';
    $stmt = $conn->query("
      SELECT
        l.id AS loja_id,
        l.nome,
        (SELECT valor FROM configuracoes c WHERE c.loja_id = l.id AND c.chave = 'loja_perfil' LIMIT 1) AS logo,
        (SELECT mensagem FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultima_mensagem,
        (SELECT anexo_arquivo FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultimo_anexo,
        (SELECT criado_em FROM suporte_mensagens sm WHERE sm.loja_id = l.id ORDER BY sm.id DESC LIMIT 1) AS ultima_em,
        (SELECT COUNT(*) FROM suporte_mensagens sm WHERE sm.loja_id = l.id AND sm.remetente = 'loja' AND sm.lida_suporte = 0) AS nao_lidas
      FROM lojas l
      {$having}
      ORDER BY (nao_lidas > 0) DESC, ultima_em IS NULL ASC, ultima_em DESC, l.nome ASC
    ");
    echo json_encode(['ok' => true, 'conversas' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($lojaId <= 0) {
    echo json_encode(['ok' => false, 'msg' => 'Loja invalida.']);
    exit;
  }

  if ($acao === 'mensagens') {
    $afterId = max(0, (int) ($d['after_id'] ?? 0));
    $stmt = $conn->prepare("
      SELECT id, remetente, mensagem, anexo_arquivo, criado_em
      FROM suporte_mensagens
      WHERE loja_id = ? AND id > ?
      ORDER BY id ASC
    ");
    $stmt->execute([$lojaId, $afterId]);
    $mensagens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $conn->prepare("UPDATE suporte_mensagens SET lida_suporte = 1 WHERE loja_id = ? AND remetente = 'loja' AND lida_suporte = 0")
      ->execute([$lojaId]);
    echo json_encode(['ok' => true, 'mensagens' => $mensagens], JSON_UNESCAPED_UNICODE);
    exit;
  }

  if ($acao === 'digitando') {
    if ($post) {
      if (!empty($d['ativo'])) {
        $conn->prepare("
          INSERT INTO suporte_digitando (loja_id, quem, atualizado_em) VALUES (?, 'suporte', NOW())
          ON DUPLICATE KEY UPDATE atualizado_em = NOW()
        ")->execute([$lojaId]);
      } else {
        $conn->prepare("DELETE FROM suporte_digitando WHERE loja_id = ? AND quem = 'suporte'")->execute([$lojaId]);
      }
      echo json_encode(['ok' => true]);
    } else {
      $stmt = $conn->prepare("
        SELECT 1 FROM suporte_digitando
        WHERE loja_id = ? AND quem = 'loja' AND atualizado_em > (NOW() - INTERVAL 5 SECOND)
        LIMIT 1
      ");
      $stmt->execute([$lojaId]);
      echo json_encode(['ok' => true, 'digitando' => (bool) $stmt->fetchColumn()]);
    }
    exit;
  }

  if ($acao === 'enviar' && $post) {
    $mensagem = trim((string) ($d['mensagem'] ?? ''));
    $base64   = trim((string) ($d['imagem_base64'] ?? ''));
    $ext      = strtolower(trim((string) ($d['imagem_ext'] ?? '')));

    if (mb_strlen($mensagem) > 2000) {
      echo json_encode(['ok' => false, 'msg' => 'Mensagem muito longa.']);
      exit;
    }

    $anexo = null;
    if ($base64 !== '') {
      $conteudo = base64_decode($base64, true);
      if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) || $conteudo === false || $conteudo === '') {
        echo json_encode(['ok' => false, 'msg' => 'Imagem invalida (use JPG, PNG ou WebP).']);
        exit;
      }
      if (strlen($conteudo) > 5242880) {
        echo json_encode(['ok' => false, 'msg' => 'Imagem muito grande (maximo 5MB).']);
        exit;
      }
      $dirRel = storage_dir_relativa('suporte', $lojaId);
      $dirAbs = storage_dir_absoluta('suporte', $lojaId);
      $nome   = 'suporte_' . $lojaId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
      if (storage_r2_configurado()) {
        $chaveRel = $dirRel . '/' . $nome;
        if (storage_r2_put($chaveRel, $conteudo, storage_r2_content_type($ext))) {
          $anexo = storage_r2_url($chaveRel);
        }
      } else {
        if (!is_dir($dirAbs)) {
          @mkdir($dirAbs, 0775, true);
        }
        if (file_put_contents($dirAbs . '/' . $nome, $conteudo) !== false) {
          $anexo = $dirRel . '/' . $nome;
        }
      }
      if ($anexo === null) {
        echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar a imagem.']);
        exit;
      }
    }

    if ($mensagem === '' && $anexo === null) {
      echo json_encode(['ok' => false, 'msg' => 'Informe uma mensagem ou anexe uma imagem.']);
      exit;
    }

    $conn->prepare("
      INSERT INTO suporte_mensagens (loja_id, remetente, mensagem, anexo_arquivo, lida_loja, lida_suporte)
      VALUES (?, 'suporte', ?, ?, 0, 1)
    ")->execute([$lojaId, $mensagem, $anexo]);
    $stmt = $conn->prepare("SELECT id, remetente, mensagem, anexo_arquivo, criado_em FROM suporte_mensagens WHERE id = ?");
    $stmt->execute([(int) $conn->lastInsertId()]);
    echo json_encode(['ok' => true, 'mensagem' => $stmt->fetch(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);
    exit;
  }

  echo json_encode(['ok' => false, 'msg' => 'Ação inválida.']);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao processar o suporte.']);
}
