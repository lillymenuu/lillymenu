<?php
/*
 * Versao JSON de admin/api/caixa_fechar.php para o novo frontend Next.js
 * (/cashcontrol), trocando sessao por token Bearer e corpo POST tradicional
 * por JSON.
 */

date_default_timezone_set('America/Fortaleza');

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['loja_id']  = $lojaId;

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$caixaId = $dados['caixa_id'] ?? null;
$saldoFinal = (float) ($dados['saldo_final'] ?? 0);
$observacoes = trim((string) ($dados['observacoes'] ?? ''));

if (!$caixaId) {
  echo json_encode(['ok' => false, 'msg' => 'Dados incompletos']);
  exit;
}

$stmt = $conn->prepare("
  SELECT id, status, saldo_inicial
  FROM caixa_turnos
  WHERE id = ? AND status = 'aberto' AND loja_id = ?
  LIMIT 1
");
$stmt->execute([$caixaId, $lojaId]);
$caixa = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$caixa) {
  echo json_encode(['ok' => false, 'msg' => 'Caixa nao encontrado']);
  exit;
}

try {
  // Data/hora calculada em PHP (fuso America/Fortaleza) — nao usar NOW() do
  // MySQL, que segue o fuso do servidor do banco (pode ser UTC).
  $agora = date('Y-m-d H:i:s');
  $stmt = $conn->prepare("
    UPDATE caixa_turnos
    SET status = 'fechado',
        saldo_final = ?,
        fechado_em = ?,
        obs_fechamento = ?
    WHERE id = ? AND loja_id = ?
  ");
  $stmt->execute([$saldoFinal, $agora, $observacoes ?: null, $caixaId, $lojaId]);

  registrarOperacao($conn, 'caixa_fechado', 'caixa:' . $caixaId, [
    'saldo_final' => $saldoFinal,
  ]);

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao fechar caixa']);
}
