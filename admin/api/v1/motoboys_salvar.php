<?php
/*
 * Versao JSON de admin/motoboys.php (acao 'save') para o novo frontend
 * Next.js (/motoboys), trocando sessao por token Bearer e POST
 * tradicional + redirect por corpo/resposta JSON.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/motoboy_module.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

motoboyEnsureModule($conn);

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$id = (int) ($dados['id'] ?? 0);
$nome = trim((string) ($dados['nome'] ?? ''));
$whatsapp = preg_replace('/\D+/', '', (string) ($dados['whatsapp'] ?? ''));
$dataCadastro = trim((string) ($dados['data_cadastro'] ?? '')) ?: date('Y-m-d');
$ativo = (int) ($dados['ativo'] ?? 1) === 1 ? 1 : 0;

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome do motoboy.']);
  exit;
}
if ($whatsapp === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o WhatsApp do motoboy.']);
  exit;
}

try {
  if ($id > 0) {
    $stmt = $conn->prepare("
      UPDATE motoboys
      SET nome = ?, whatsapp = ?, data_cadastro = ?, ativo = ?, atualizado_em = NOW()
      WHERE id = ? AND loja_id = ?
    ");
    $stmt->execute([$nome, $whatsapp, $dataCadastro, $ativo, $id, $lojaId]);
    echo json_encode(['ok' => true, 'msg' => 'Motoboy atualizado com sucesso.']);
  } else {
    $stmt = $conn->prepare("
      INSERT INTO motoboys (loja_id, nome, whatsapp, data_cadastro, ativo)
      VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$lojaId, $nome, $whatsapp, $dataCadastro, $ativo]);
    echo json_encode(['ok' => true, 'msg' => 'Motoboy cadastrado com sucesso.', 'id' => (int) $conn->lastInsertId()]);
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar motoboy.']);
}
