<?php
/*
 * Versao JSON de admin/api/cliente_stats.php para o novo frontend Next.js
 * (aba "Perfil" do modal de cliente, aberto a partir do Gestor de Pedidos).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth      = apiAuthExigir($conn);
$lojaId    = $auth['loja_id'];
$clienteId = (int) ($_GET['cliente_id'] ?? 0);

if ($clienteId <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente invalido.']);
  exit;
}

$cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$campos = ['id', 'nome', 'telefone', 'email', 'endereco', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'complemento', 'cep', 'criado_em', 'nivel', 'aniversario'];
$select = array_map(fn($c) => in_array($c, $cols, true) ? $c : "NULL AS {$c}", $campos);

$select[] = in_array('cashback_saldo', $cols, true) ? 'cashback_saldo' : '0.00 AS cashback_saldo';
$select[] = in_array('pontos_saldo', $cols, true) ? 'pontos_saldo' : '0 AS pontos_saldo';
$select[] = in_array('saldo_fiado', $cols, true) ? 'saldo_fiado' : '0.00 AS saldo_fiado';

$stmt = $conn->prepare("SELECT " . implode(', ', $select) . " FROM clientes WHERE id = ? AND loja_id = ?");
$stmt->execute([$clienteId, $lojaId]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$cliente) {
  echo json_encode(['ok' => false, 'msg' => 'Cliente nao encontrado.']);
  exit;
}

$stmt = $conn->prepare("
  SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS gasto, MAX(criado_em) AS ultimo
  FROM pedidos
  WHERE cliente_id = ? AND loja_id = ? AND status NOT IN ('cancelado')
");
$stmt->execute([$clienteId, $lojaId]);
$stats = $stmt->fetch(PDO::FETCH_ASSOC);

$totalPed   = (int) ($stats['total'] ?? 0);
$totalGasto = (float) ($stats['gasto'] ?? 0);
$ticketMed  = $totalPed > 0 ? $totalGasto / $totalPed : 0;
$ultimoPed  = $stats['ultimo'] ?? null;

$avaliacaoMedia = null;
try {
  $stmtAv = $conn->prepare("SELECT AVG(nota) FROM avaliacoes WHERE cliente_id = ? AND loja_id = ?");
  $stmtAv->execute([$clienteId, $lojaId]);
  $avg = $stmtAv->fetchColumn();
  $avaliacaoMedia = $avg !== false && $avg !== null ? round((float) $avg, 1) : null;
} catch (Exception $e) {
}

$saldoFiado = (float) ($cliente['saldo_fiado'] ?? 0);

echo json_encode([
  'ok'              => true,
  'nome'            => $cliente['nome'] ?? '',
  'telefone'        => $cliente['telefone'] ?? '',
  'email'           => $cliente['email'] ?? '',
  'nivel'           => $cliente['nivel'] ?? '',
  'endereco'        => [
    'rua'         => trim((string) ($cliente['rua'] ?? $cliente['endereco'] ?? '')),
    'numero'      => trim((string) ($cliente['numero'] ?? '')),
    'bairro'      => trim((string) ($cliente['bairro'] ?? '')),
    'cidade'      => trim((string) ($cliente['cidade'] ?? '')),
    'estado'      => trim((string) ($cliente['estado'] ?? '')),
    'complemento' => trim((string) ($cliente['complemento'] ?? '')),
    'cep'         => trim((string) ($cliente['cep'] ?? '')),
  ],
  'aniversario'     => $cliente['aniversario'] ?? '',
  'criado_em'       => $cliente['criado_em'] ?? '',
  'cashback'        => round((float) $cliente['cashback_saldo'], 2),
  'pontos'          => (int) $cliente['pontos_saldo'],
  'saldo_fiado'     => $saldoFiado,
  'ticket_medio'    => round($ticketMed, 2),
  'ultimo_pedido'   => $ultimoPed,
  'pedidos_feitos'  => $totalPed,
  'avaliacao_media' => $avaliacaoMedia,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
