<?php
/*
 * Versao Bearer-token de admin/api/lista_transmissao_api.php?action=salvar
 * — cria ou atualiza (id presente decide qual) uma lista de transmissao,
 * substituindo seus membros por inteiro (delete+reinsert), validando que
 * os ids de cliente pertencem a loja antes de inserir.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/lista_transmissao_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
listaTransmissaoEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$id   = (int) ($dados['id'] ?? 0);
$nome = trim((string) ($dados['nome'] ?? ''));
$clientesIds = is_array($dados['clientes'] ?? null) ? $dados['clientes'] : [];
$clientesIds = array_values(array_unique(array_map('intval', $clientesIds)));

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome da lista.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
  echo json_encode(['ok' => true, 'id' => $id], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao salvar a lista.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
