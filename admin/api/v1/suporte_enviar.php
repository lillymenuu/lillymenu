<?php
/*
 * Versao JSON de admin/api/suporte_enviar.php (lado da loja) para o frontend
 * Next.js: token Bearer + corpo JSON (imagem em base64, igual a
 * pagamento_comprovante_upload.php).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/suporte_chat.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

suporteGarantirTabelas($conn);
suporteLimparExpiradas($conn);

$dados    = json_decode(file_get_contents('php://input'), true) ?: [];
$mensagem = trim((string) ($dados['mensagem'] ?? ''));
$base64   = trim((string) ($dados['imagem_base64'] ?? ''));
$ext      = strtolower(trim((string) ($dados['imagem_ext'] ?? '')));

if (mb_strlen($mensagem) > 2000) {
  echo json_encode(['ok' => false, 'msg' => 'Mensagem muito longa.']);
  exit;
}

$anexo = null;
if ($base64 !== '') {
  if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
    echo json_encode(['ok' => false, 'msg' => 'Imagem invalida (use JPG, PNG ou WebP).']);
    exit;
  }
  $conteudo = base64_decode($base64, true);
  if ($conteudo === false || $conteudo === '') {
    echo json_encode(['ok' => false, 'msg' => 'Imagem invalida.']);
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

try {
  $conn->prepare("
    INSERT INTO suporte_mensagens (loja_id, remetente, mensagem, anexo_arquivo, lida_loja, lida_suporte)
    VALUES (?, 'loja', ?, ?, 1, 0)
  ")->execute([$lojaId, $mensagem, $anexo]);
  $id = (int) $conn->lastInsertId();

  $stmt = $conn->prepare("SELECT id, remetente, mensagem, anexo_arquivo, criado_em FROM suporte_mensagens WHERE id = ?");
  $stmt->execute([$id]);

  echo json_encode(['ok' => true, 'mensagem' => $stmt->fetch(PDO::FETCH_ASSOC)], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao enviar mensagem.']);
}
