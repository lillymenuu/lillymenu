<?php
/*
 * Versao JSON de admin/api/assinatura_transacao_detalhe.php para o novo
 * frontend Next.js (/plan-details), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth       = apiAuthExigir($conn);
$lojaId     = $auth['loja_id'];
$cobrancaId = (int) ($_GET['cobranca_id'] ?? 0);

if ($cobrancaId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Transacao invalida.']);
  exit;
}

$stmt = $conn->prepare("
  SELECT c.id, c.valor, c.status, c.origem, c.vencimento, c.pago_em, c.criado_em
  FROM cobrancas c
  INNER JOIN assinaturas a ON a.id = c.assinatura_id
  WHERE c.id = ? AND a.loja_id = ?
  LIMIT 1
");
$stmt->execute([$cobrancaId, $lojaId]);
$transacao = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$transacao) {
  echo json_encode(['ok' => false, 'msg' => 'Transacao nao encontrada.']);
  exit;
}

$stmt = $conn->prepare("SELECT nome, email FROM admins WHERE id = ? LIMIT 1");
$stmt->execute([$auth['admin_id']]);
$admin = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['nome' => '', 'email' => ''];

$stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('cobranca_cpf','cobranca_telefone')");
$stmt->execute([$lojaId]);
$cfg = [];
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
  $cfg[$row['chave']] = $row['valor'];
}

echo json_encode([
  'ok' => true,
  'transacao' => $transacao,
  'pagador' => [
    'nome' => $admin['nome'] ?? '',
    'email' => $admin['email'] ?? '',
    'cpf' => $cfg['cobranca_cpf'] ?? '',
    'telefone' => $cfg['cobranca_telefone'] ?? '',
  ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
