<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/lista_transmissao_module.php';
require_once __DIR__ . '/../helpers/whats_send.php';

header('Content-Type: application/json; charset=utf-8');

listaTransmissaoEnsureModule($conn);

$lojaId = listaTransmissaoTenantId();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

// ─── LISTAR ─────────────────────────────────────────────────────────────────
if ($action === 'listar') {
  $stmt = $conn->prepare("
    SELECT lt.id, lt.nome, lt.criado_em,
      (SELECT COUNT(*) FROM listas_transmissao_membros ltm WHERE ltm.lista_id = lt.id) AS total_membros
    FROM listas_transmissao lt
    WHERE lt.loja_id = ?
    ORDER BY lt.nome ASC
  ");
  $stmt->execute([$lojaId]);
  echo json_encode(['ok' => true, 'listas' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  exit;
}

// ─── CLIENTES ELEGÍVEIS (com WhatsApp) ────────────────────────────────────────
if ($action === 'clientes_elegiveis') {
  $stmt = $conn->prepare("
    SELECT id, nome, telefone
    FROM clientes
    WHERE loja_id = ? AND telefone IS NOT NULL AND telefone <> ''
    ORDER BY nome ASC
  ");
  $stmt->execute([$lojaId]);
  echo json_encode(['ok' => true, 'clientes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  exit;
}

// ─── DETALHE (lista + membros marcados) ───────────────────────────────────────
if ($action === 'detalhe') {
  $id = (int) ($_GET['id'] ?? 0);
  $stmt = $conn->prepare("SELECT id, nome FROM listas_transmissao WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$id, $lojaId]);
  $lista = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$lista) {
    echo json_encode(['ok' => false, 'msg' => 'Lista não encontrada']);
    exit;
  }
  $stmt = $conn->prepare("SELECT cliente_id FROM listas_transmissao_membros WHERE lista_id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);
  $membros = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
  echo json_encode(['ok' => true, 'lista' => $lista, 'membros' => $membros]);
  exit;
}

// ─── SALVAR (criar ou editar) ─────────────────────────────────────────────────
if ($action === 'salvar') {
  $id = (int) ($_POST['id'] ?? 0);
  $nome = trim((string) ($_POST['nome'] ?? ''));
  $clientesJson = $_POST['clientes'] ?? '[]';
  $clientesIds = json_decode($clientesJson, true);
  if (!is_array($clientesIds)) {
    $clientesIds = [];
  }
  $clientesIds = array_values(array_unique(array_map('intval', $clientesIds)));

  if ($nome === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o nome da lista.']);
    exit;
  }

  try {
    $conn->beginTransaction();

    if ($id > 0) {
      $stmt = $conn->prepare("SELECT id FROM listas_transmissao WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$id, $lojaId]);
      if (!$stmt->fetchColumn()) {
        throw new RuntimeException('Lista não encontrada.');
      }
      $conn->prepare("UPDATE listas_transmissao SET nome = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?")
           ->execute([$nome, $id, $lojaId]);
    } else {
      $conn->prepare("INSERT INTO listas_transmissao (loja_id, nome) VALUES (?, ?)")
           ->execute([$lojaId, $nome]);
      $id = (int) $conn->lastInsertId();
    }

    $conn->prepare("DELETE FROM listas_transmissao_membros WHERE lista_id = ? AND loja_id = ?")
         ->execute([$id, $lojaId]);

    if ($clientesIds) {
      // valida que os clientes pertencem a loja antes de inserir
      $placeholders = implode(',', array_fill(0, count($clientesIds), '?'));
      $stmtValidos = $conn->prepare("SELECT id FROM clientes WHERE loja_id = ? AND id IN ($placeholders)");
      $stmtValidos->execute(array_merge([$lojaId], $clientesIds));
      $validos = array_map('intval', $stmtValidos->fetchAll(PDO::FETCH_COLUMN));

      if ($validos) {
        $stmtMembro = $conn->prepare("INSERT INTO listas_transmissao_membros (lista_id, cliente_id, loja_id) VALUES (?, ?, ?)");
        foreach ($validos as $clienteId) {
          $stmtMembro->execute([$id, $clienteId, $lojaId]);
        }
      }
    }

    $conn->commit();
    echo json_encode(['ok' => true, 'id' => $id]);
  } catch (Throwable $e) {
    $conn->rollBack();
    echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao salvar a lista.']);
  }
  exit;
}

// ─── EXCLUIR ───────────────────────────────────────────────────────────────────
if ($action === 'excluir') {
  $id = (int) ($_POST['id'] ?? 0);
  $stmt = $conn->prepare("DELETE FROM listas_transmissao WHERE id = ? AND loja_id = ?");
  $stmt->execute([$id, $lojaId]);
  echo json_encode(['ok' => true]);
  exit;
}

// ─── ENVIO: INICIAR ────────────────────────────────────────────────────────────
if ($action === 'envio_iniciar') {
  $listaId = (int) ($_POST['lista_id'] ?? 0);
  $mensagem = trim((string) ($_POST['mensagem'] ?? ''));

  if ($mensagem === '') {
    echo json_encode(['ok' => false, 'msg' => 'Escreva uma mensagem antes de enviar.']);
    exit;
  }
  if (!whatsEvolutionConfigurada($conn, $lojaId)) {
    echo json_encode(['ok' => false, 'msg' => 'WhatsApp não configurado para esta loja. Configure a integração antes de enviar.']);
    exit;
  }

  $stmt = $conn->prepare("SELECT id, nome FROM listas_transmissao WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$listaId, $lojaId]);
  $lista = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$lista) {
    echo json_encode(['ok' => false, 'msg' => 'Lista não encontrada.']);
    exit;
  }

  $stmt = $conn->prepare("
    SELECT c.id AS cliente_id, c.nome, c.telefone
    FROM listas_transmissao_membros ltm
    INNER JOIN clientes c ON c.id = ltm.cliente_id AND c.loja_id = ltm.loja_id
    WHERE ltm.lista_id = ? AND ltm.loja_id = ? AND c.telefone IS NOT NULL AND c.telefone <> ''
    ORDER BY c.nome ASC
  ");
  $stmt->execute([$listaId, $lojaId]);
  $destinatarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

  if (!$destinatarios) {
    echo json_encode(['ok' => false, 'msg' => 'Nenhum destinatário com WhatsApp válido neste grupo.']);
    exit;
  }

  $stmt = $conn->prepare("
    INSERT INTO listas_transmissao_envios (lista_id, loja_id, mensagem, total_destinatarios)
    VALUES (?, ?, ?, ?)
  ");
  $stmt->execute([$listaId, $lojaId, $mensagem, count($destinatarios)]);
  $envioId = (int) $conn->lastInsertId();

  echo json_encode(['ok' => true, 'envio_id' => $envioId, 'destinatarios' => $destinatarios]);
  exit;
}

// ─── ENVIO: ITEM (uma mensagem por vez) ───────────────────────────────────────
if ($action === 'envio_item') {
  $envioId = (int) ($_POST['envio_id'] ?? 0);
  $clienteId = (int) ($_POST['cliente_id'] ?? 0);

  $stmt = $conn->prepare("SELECT mensagem FROM listas_transmissao_envios WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$envioId, $lojaId]);
  $mensagem = $stmt->fetchColumn();
  if ($mensagem === false) {
    echo json_encode(['ok' => false, 'enviado' => false, 'erro' => 'Envio não encontrado.']);
    exit;
  }

  $stmt = $conn->prepare("SELECT telefone FROM clientes WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$clienteId, $lojaId]);
  $telefone = $stmt->fetchColumn();
  if (!$telefone) {
    $conn->prepare("UPDATE listas_transmissao_envios SET total_falhas = total_falhas + 1 WHERE id = ? AND loja_id = ?")
         ->execute([$envioId, $lojaId]);
    echo json_encode(['ok' => true, 'enviado' => false, 'erro' => 'Cliente sem telefone cadastrado.']);
    exit;
  }

  $resultado = whatsEnviarMensagem($conn, $lojaId, $telefone, $mensagem);

  $campo = $resultado['ok'] ? 'total_enviados' : 'total_falhas';
  $conn->prepare("UPDATE listas_transmissao_envios SET {$campo} = {$campo} + 1 WHERE id = ? AND loja_id = ?")
       ->execute([$envioId, $lojaId]);

  echo json_encode(['ok' => true, 'enviado' => $resultado['ok'], 'erro' => $resultado['erro']]);
  exit;
}

// ─── ENVIO: FINALIZAR ──────────────────────────────────────────────────────────
if ($action === 'envio_finalizar') {
  $envioId = (int) ($_POST['envio_id'] ?? 0);
  $conn->prepare("UPDATE listas_transmissao_envios SET status = 'concluido', finalizado_em = NOW() WHERE id = ? AND loja_id = ?")
       ->execute([$envioId, $lojaId]);

  $stmt = $conn->prepare("SELECT total_destinatarios, total_enviados, total_falhas FROM listas_transmissao_envios WHERE id = ? AND loja_id = ?");
  $stmt->execute([$envioId, $lojaId]);
  $resumo = $stmt->fetch(PDO::FETCH_ASSOC);

  echo json_encode(['ok' => true, 'resumo' => $resumo]);
  exit;
}

echo json_encode(['ok' => false, 'msg' => 'Ação inválida.']);
