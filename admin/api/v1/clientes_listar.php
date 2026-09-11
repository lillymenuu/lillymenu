<?php
/*
 * Versao JSON de admin/clientes.php (tabela de clientes) para o novo
 * frontend Next.js (/clients). Mesma logica de busca/paginacao do
 * legado, trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../../helpers/telefone.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$busca  = trim($_GET['busca'] ?? '');
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$limite = 10;
$offset = ($pagina - 1) * $limite;

$where  = 'WHERE c.loja_id = ?';
$params = [$lojaId];
$buscaTel = apenasDigitosTel($busca);

if ($busca !== '') {
  $whereParts = ['c.nome LIKE ?'];
  $params[] = "%$busca%";
  if ($buscaTel !== '') {
    $whereParts[] = sqlTelStrip('c.telefone') . ' LIKE ?';
    $params[] = "%$buscaTel%";
  }
  $where = 'WHERE c.loja_id = ? AND (' . implode(' OR ', $whereParts) . ')';
}

$stmt = $conn->prepare("
  SELECT COUNT(*)
  FROM clientes c
  $where
");
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($total / $limite));

$clientesColunas = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
$temCashbackSaldoCliente = in_array('cashback_saldo', $clientesColunas, true);
$temPontosSaldoCliente = in_array('pontos_saldo', $clientesColunas, true);
$temPontosCliente = in_array('pontos', $clientesColunas, true);
$temSaldoFiadoCliente = in_array('saldo_fiado', $clientesColunas, true);
$selectCashbackSaldo = $temCashbackSaldoCliente ? 'c.cashback_saldo' : '0 AS cashback_saldo';
$selectPontosSaldo = $temPontosSaldoCliente
  ? 'c.pontos_saldo AS pontos_saldo'
  : ($temPontosCliente ? 'c.pontos AS pontos_saldo' : '0 AS pontos_saldo');
$selectSaldoFiado = $temSaldoFiadoCliente ? 'c.saldo_fiado' : '0 AS saldo_fiado';

$stmt = $conn->prepare("
  SELECT
    c.id,
    c.nome,
    c.telefone,
    c.endereco,
    c.aniversario,
    c.cep,
    c.rua,
    c.numero,
    c.bairro,
    c.cidade,
    c.estado,
    c.complemento,
    c.criado_em,
    $selectCashbackSaldo,
    $selectPontosSaldo,
    $selectSaldoFiado,
    COUNT(p.id) AS total_pedidos,
    IFNULL(SUM(p.total), 0) AS total_gasto
  FROM clientes c
  LEFT JOIN pedidos p ON p.cliente_id = c.id AND p.status = 'finalizado' AND p.loja_id = c.loja_id
  $where
  GROUP BY c.id
  ORDER BY total_gasto DESC
  LIMIT $limite OFFSET $offset
");
$stmt->execute($params);
$clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

function clientesListarEnderecoTexto(array $c): string {
  $partes = [];
  $rua = trim($c['rua'] ?? '');
  $numero = trim($c['numero'] ?? '');
  $bairro = trim($c['bairro'] ?? '');
  $cidade = trim($c['cidade'] ?? '');
  $estado = trim($c['estado'] ?? '');
  $cep = trim($c['cep'] ?? '');
  $complemento = trim($c['complemento'] ?? '');

  if ($rua !== '') {
    $partes[] = $numero !== '' ? "{$rua}, {$numero}" : $rua;
  }
  if ($bairro !== '') $partes[] = $bairro;
  $cidadeEstado = trim($cidade . ($estado ? " / {$estado}" : ''));
  if ($cidadeEstado !== '') $partes[] = $cidadeEstado;
  if ($cep !== '') $partes[] = $cep;
  if ($complemento !== '') $partes[] = $complemento;

  $texto = implode(' - ', $partes);
  return $texto !== '' ? $texto : ($c['endereco'] ?? '-');
}

foreach ($clientes as &$c) {
  $c['id'] = (int) $c['id'];
  $c['cashback_saldo'] = (float) ($c['cashback_saldo'] ?? 0);
  $c['pontos_saldo'] = (int) ($c['pontos_saldo'] ?? 0);
  $c['saldo_fiado'] = (float) ($c['saldo_fiado'] ?? 0);
  $c['total_pedidos'] = (int) $c['total_pedidos'];
  $c['total_gasto'] = (float) $c['total_gasto'];
  $c['endereco_texto'] = clientesListarEnderecoTexto($c);
}
unset($c);

echo json_encode([
  'ok' => true,
  'clientes' => $clientes,
  'total' => $total,
  'paginas' => $paginas,
  'pagina' => $pagina,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
