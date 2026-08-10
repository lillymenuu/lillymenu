<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$action = $_GET['action'] ?? ($_POST['action'] ?? '');

// ─── CONVERSAS ────────────────────────────────────────────────────────────────
if ($action === 'conversas') {
  $busca  = trim($_GET['busca'] ?? '');
  $params = [$lojaId];
  $busaCond = '';

  if ($busca !== '') {
    $busaCond = 'AND (wc.nome LIKE ? OR wc.numero LIKE ?)';
    $params[] = "%{$busca}%";
    $params[] = "%{$busca}%";
  }

  $stmt = $conn->prepare("
    SELECT
      wc.id,
      wc.numero,
      COALESCE(wc.nome, wc.numero) AS nome,
      wc.ultimo_msg,
      wc.ultimo_msg_em,
      wc.nao_lidas
    FROM whats_conversas wc
    WHERE wc.loja_id = ? {$busaCond}
    ORDER BY wc.ultimo_msg_em DESC
    LIMIT 60
  ");
  $stmt->execute($params);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  // total não lidas
  $stmtNl = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
  $stmtNl->execute([$lojaId]);
  $totalNl = (int) $stmtNl->fetchColumn();

  echo json_encode(['ok' => true, 'data' => $rows, 'total_nao_lidas' => $totalNl]);
  exit;
}

// ─── MENSAGENS ────────────────────────────────────────────────────────────────
if ($action === 'mensagens') {
  $conversaId = (int) ($_GET['conversa_id'] ?? 0);
  $afterId    = (int) ($_GET['after_id'] ?? 0);

  $stmt = $conn->prepare("SELECT id, numero, COALESCE(nome, numero) AS nome FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$conversaId, $lojaId]);
  $conversa = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$conversa) {
    echo json_encode(['ok' => false, 'msg' => 'Conversa não encontrada']);
    exit;
  }

  $afterCond = $afterId > 0 ? 'AND m.id > ?' : '';
  $params    = [$conversaId];
  if ($afterId > 0) $params[] = $afterId;

  $stmt = $conn->prepare("
    SELECT m.id, m.direcao, m.tipo, m.mensagem, m.pedido_id, m.whats_msg_id,
           DATE_FORMAT(m.created_at, '%H:%i') AS hora,
           DATE_FORMAT(m.created_at, '%d/%m/%Y') AS data_fmt,
           m.created_at
    FROM whats_mensagens m
    WHERE m.conversa_id = ? {$afterCond}
    ORDER BY m.id ASC
    LIMIT 200
  ");
  $stmt->execute($params);
  $msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);
  foreach ($msgs as &$msgRow) {
    $msgRow['falhou'] = ($msgRow['direcao'] === 'saida' && empty($msgRow['whats_msg_id']));
  }
  unset($msgRow);

  // Zera não-lidas
  $conn->prepare("UPDATE whats_conversas SET nao_lidas = 0 WHERE id = ?")->execute([$conversaId]);

  // Pedidos do cliente pelo número
  $numSuffix = '%' . substr(preg_replace('/\D/', '', $conversa['numero']), -9) . '%';
  $stmt = $conn->prepare("
    SELECT p.id, p.total, p.status, p.criado_em,
           DATE_FORMAT(p.criado_em, '%d/%m/%Y %H:%i') AS criado_fmt
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
    WHERE p.loja_id = ?
      AND REPLACE(REPLACE(REPLACE(REPLACE(c.telefone,'(',''),')',''),'-',''),' ','') LIKE ?
    ORDER BY p.id DESC
    LIMIT 10
  ");
  $stmt->execute([$lojaId, $numSuffix]);
  $pedidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode([
    'ok'       => true,
    'conversa' => $conversa,
    'mensagens' => $msgs,
    'pedidos'  => $pedidos,
  ]);
  exit;
}

// ─── ENVIAR ───────────────────────────────────────────────────────────────────
if ($action === 'enviar') {
  $conversaId = (int) ($_POST['conversa_id'] ?? 0);
  $texto      = trim($_POST['mensagem'] ?? '');

  if (!$texto) {
    echo json_encode(['ok' => false, 'msg' => 'Mensagem vazia']);
    exit;
  }

  $stmt = $conn->prepare("SELECT id, numero FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$conversaId, $lojaId]);
  $conversa = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$conversa) {
    echo json_encode(['ok' => false, 'msg' => 'Conversa não encontrada']);
    exit;
  }

  $numero = $conversa['numero'];
  if (strlen($numero) <= 11) $numero = '55' . $numero;

  // Busca config Evolution API (loja específica → global)
  $cfgGet = function (string $chave) use ($conn, $lojaId): string {
    $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = ? LIMIT 1");
    $stmt->execute([$lojaId, $chave]);
    $val = $stmt->fetchColumn();
    if ($val === false || $val === '') {
      $stmt->execute([0, $chave]);
      $val = $stmt->fetchColumn();
    }
    return (string) ($val ?: '');
  };

  $evolutionUrl   = $cfgGet('evolution_url');
  $evolutionToken = $cfgGet('evolution_token');
  $evolutionInst  = $cfgGet('evolution_instance');

  $whatsId    = null;
  $enviado    = false;
  $erroEnvio  = null;

  if ($evolutionUrl && $evolutionToken && $evolutionInst) {
    $ch = curl_init(rtrim($evolutionUrl, '/') . '/message/sendText/' . $evolutionInst);
    curl_setopt_array($ch, [
      CURLOPT_POST            => true,
      CURLOPT_RETURNTRANSFER  => true,
      CURLOPT_TIMEOUT         => 10,
      CURLOPT_SSL_VERIFYPEER  => false,
      CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'apikey: ' . $evolutionToken],
      CURLOPT_POSTFIELDS      => json_encode([
        'number' => $numero,
        'text'   => $texto,
      ]),
    ]);
    $resp      = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErro  = curl_error($ch);
    curl_close($ch);

    if ($curlErro) {
      $erroEnvio = 'Erro de conexão com a Evolution API: ' . $curlErro;
    } elseif ($httpCode >= 200 && $httpCode < 300) {
      $enviado  = true;
      $respData = json_decode($resp, true);
      $whatsId  = $respData['key']['id'] ?? null;
    } else {
      $respData    = json_decode($resp, true);
      $motivoBruto = $respData['message'] ?? $respData['error'] ?? $resp;
      $motivo      = is_string($motivoBruto) ? $motivoBruto : json_encode($motivoBruto);
      $erroEnvio   = 'Evolution API retornou HTTP ' . $httpCode . ': ' . $motivo;
    }
  } else {
    $erroEnvio = 'WhatsApp não configurado para esta loja (verifique a conexão em Configurações).';
  }

  // Salva no banco
  $stmt = $conn->prepare("
    INSERT INTO whats_mensagens (conversa_id, loja_id, direcao, mensagem, whats_msg_id)
    VALUES (?, ?, 'saida', ?, ?)
  ");
  $stmt->execute([$conversaId, $lojaId, $texto, $whatsId]);
  $newId = (int) $conn->lastInsertId();

  $conn->prepare("UPDATE whats_conversas SET ultimo_msg = ?, ultimo_msg_em = NOW() WHERE id = ?")
       ->execute([mb_substr($texto, 0, 200), $conversaId]);

  echo json_encode([
    'ok'       => true,
    'enviado'  => $enviado,
    'erro'     => $enviado ? null : $erroEnvio,
    'id'       => $newId,
    'hora'     => date('H:i'),
    'data_fmt' => date('d/m/Y'),
  ]);
  exit;
}

// ─── NOVA CONVERSA (por número) ───────────────────────────────────────────────
if ($action === 'nova_conversa') {
  $numero = preg_replace('/\D/', '', trim($_POST['numero'] ?? ''));
  $nome   = trim($_POST['nome'] ?? '');

  if (strlen($numero) < 10) {
    echo json_encode(['ok' => false, 'msg' => 'Número inválido (mínimo 10 dígitos com DDD)']);
    exit;
  }

  if (!$nome) {
    $numSuffix = '%' . substr($numero, -9) . '%';
    $stmt = $conn->prepare("
      SELECT nome FROM clientes
      WHERE loja_id = ? AND REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),'-',''),' ','') LIKE ?
      LIMIT 1
    ");
    $stmt->execute([$lojaId, $numSuffix]);
    $nome = (string) ($stmt->fetchColumn() ?: '');
  }

  $stmt = $conn->prepare("
    INSERT INTO whats_conversas (loja_id, numero, nome)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE id = id
  ");
  $stmt->execute([$lojaId, $numero, $nome ?: null]);

  $stmt = $conn->prepare("SELECT id FROM whats_conversas WHERE loja_id = ? AND numero = ? LIMIT 1");
  $stmt->execute([$lojaId, $numero]);
  $id = (int) $stmt->fetchColumn();

  echo json_encode(['ok' => true, 'conversa_id' => $id, 'nome' => $nome ?: $numero]);
  exit;
}

// ─── POLL (só novas msgs) ─────────────────────────────────────────────────────
if ($action === 'poll') {
  $conversaId = (int) ($_GET['conversa_id'] ?? 0);
  $afterId    = (int) ($_GET['after_id'] ?? 0);

  $stmt = $conn->prepare("SELECT id FROM whats_conversas WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$conversaId, $lojaId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false]);
    exit;
  }

  $stmt = $conn->prepare("
    SELECT m.id, m.direcao, m.mensagem,
           DATE_FORMAT(m.created_at, '%H:%i') AS hora,
           DATE_FORMAT(m.created_at, '%d/%m/%Y') AS data_fmt
    FROM whats_mensagens m
    WHERE m.conversa_id = ? AND m.id > ?
    ORDER BY m.id ASC
    LIMIT 50
  ");
  $stmt->execute([$conversaId, $afterId]);
  $msgs = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if ($msgs) {
    $conn->prepare("UPDATE whats_conversas SET nao_lidas = 0 WHERE id = ?")->execute([$conversaId]);
  }

  // total não lidas (para badge sidebar)
  $stmtNl = $conn->prepare("SELECT COALESCE(SUM(nao_lidas),0) FROM whats_conversas WHERE loja_id = ?");
  $stmtNl->execute([$lojaId]);
  $totalNl = (int) $stmtNl->fetchColumn();

  echo json_encode(['ok' => true, 'mensagens' => $msgs, 'total_nao_lidas' => $totalNl]);
  exit;
}

// ─── EXCLUIR MENSAGENS ───────────────────────────────────────────────────────
if ($action === 'excluir_mensagens') {
  $body = json_decode(file_get_contents('php://input'), true) ?? [];
  $ids  = array_values(array_filter(array_map('intval', $body['ids'] ?? [])));

  if (!$ids) {
    echo json_encode(['ok' => false, 'msg' => 'Nenhuma mensagem selecionada']);
    exit;
  }

  $ph   = implode(',', array_fill(0, count($ids), '?'));
  $stmt = $conn->prepare(
    "DELETE wm FROM whats_mensagens wm
     JOIN whats_conversas wc ON wc.id = wm.conversa_id
     WHERE wm.id IN ($ph) AND wc.loja_id = ?"
  );
  $stmt->execute([...$ids, $lojaId]);

  echo json_encode(['ok' => true, 'deletadas' => $stmt->rowCount()]);
  exit;
}

// ─── EXCLUIR CONVERSAS ───────────────────────────────────────────────────────
if ($action === 'excluir_conversas') {
  $body = json_decode(file_get_contents('php://input'), true) ?? [];
  $ids  = array_values(array_filter(array_map('intval', $body['ids'] ?? [])));

  if (!$ids) {
    echo json_encode(['ok' => false, 'msg' => 'Nenhuma conversa selecionada']);
    exit;
  }

  $ph = implode(',', array_fill(0, count($ids), '?'));

  $stmt = $conn->prepare(
    "DELETE wm FROM whats_mensagens wm
     JOIN whats_conversas wc ON wc.id = wm.conversa_id
     WHERE wm.conversa_id IN ($ph) AND wc.loja_id = ?"
  );
  $stmt->execute([...$ids, $lojaId]);

  $stmt = $conn->prepare("DELETE FROM whats_conversas WHERE id IN ($ph) AND loja_id = ?");
  $stmt->execute([...$ids, $lojaId]);

  echo json_encode(['ok' => true, 'deletadas' => $stmt->rowCount()]);
  exit;
}

echo json_encode(['ok' => false, 'msg' => 'Ação inválida']);
