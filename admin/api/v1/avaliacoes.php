<?php
/*
 * Versao JSON de admin/avaliacoes.php, para o novo frontend Next.js. Mesma
 * consulta e mesmas regras (paginacao de 6 em 6, filtro por nota/busca,
 * codigo de pedido calculado igual ao gestor de pedidos).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../../helpers/pedido_codigo.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

try {
  $conn->exec("CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT UNSIGNED NOT NULL,
    loja_id INT UNSIGNED NOT NULL,
    cliente_id INT UNSIGNED NULL,
    nota TINYINT NOT NULL,
    descricao TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pedido (pedido_id, loja_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {
}

$filtroNota  = isset($_GET['nota']) && $_GET['nota'] !== '' ? (int) $_GET['nota'] : null;
$filtroBusca = trim($_GET['busca'] ?? '');
$pagina      = max(1, (int) ($_GET['pagina'] ?? 1));
$limite      = 6;

$stats = $conn->prepare("
  SELECT COUNT(*) AS total, ROUND(AVG(nota),1) AS media,
    SUM(nota=5) AS n5, SUM(nota=4) AS n4, SUM(nota=3) AS n3,
    SUM(nota=2) AS n2, SUM(nota=1) AS n1
  FROM avaliacoes WHERE loja_id = ?
");
$stats->execute([$lojaId]);
$stats = $stats->fetch(PDO::FETCH_ASSOC) ?: [];

$total = (int) ($stats['total'] ?? 0);
$media = (float) ($stats['media'] ?? 0);
$distribuicao = [
  5 => (int) ($stats['n5'] ?? 0),
  4 => (int) ($stats['n4'] ?? 0),
  3 => (int) ($stats['n3'] ?? 0),
  2 => (int) ($stats['n2'] ?? 0),
  1 => (int) ($stats['n1'] ?? 0),
];

$where  = ['a.loja_id = ?'];
$params = [$lojaId];
if ($filtroNota !== null) {
  $where[]  = 'a.nota = ?';
  $params[] = $filtroNota;
}
if ($filtroBusca !== '') {
  $where[]  = '(c.nome LIKE ? OR a.descricao LIKE ?)';
  $params[] = "%{$filtroBusca}%";
  $params[] = "%{$filtroBusca}%";
}
$sqlWhere = 'WHERE ' . implode(' AND ', $where);

$stmtCount = $conn->prepare("SELECT COUNT(*) FROM avaliacoes a LEFT JOIN clientes c ON c.id = a.cliente_id AND c.loja_id = a.loja_id LEFT JOIN pedidos p ON p.id = a.pedido_id AND p.loja_id = a.loja_id {$sqlWhere}");
$stmtCount->execute($params);
$totalFiltrado = (int) $stmtCount->fetchColumn();
$paginas       = max(1, (int) ceil($totalFiltrado / $limite));
$pagina        = min($pagina, $paginas);
$offset        = ($pagina - 1) * $limite;

$stmtList = $conn->prepare("
  SELECT a.id, a.nota, a.descricao, a.criado_em, a.pedido_id,
         p.total AS pedido_total, p.criado_em AS pedido_data,
         c.nome AS cliente_nome, c.telefone AS cliente_tel
  FROM avaliacoes a
  LEFT JOIN pedidos  p ON p.id = a.pedido_id  AND p.loja_id = a.loja_id
  LEFT JOIN clientes c ON c.id = a.cliente_id AND c.loja_id = a.loja_id
  {$sqlWhere}
  ORDER BY a.criado_em DESC
  LIMIT {$limite} OFFSET {$offset}
");
$stmtList->execute($params);
$avaliacoes = $stmtList->fetchAll(PDO::FETCH_ASSOC);

$codigoBase = getPedidoCodigoBase($conn, $lojaId);
$saida = array_map(function ($av) use ($codigoBase) {
  return [
    'id'            => (int) $av['id'],
    'nota'          => (int) $av['nota'],
    'descricao'     => $av['descricao'] ?? '',
    'criado_em'     => $av['criado_em'],
    'pedido_id'     => (int) $av['pedido_id'],
    'codigo_pedido' => calcCodigoDisplay((int) $av['pedido_id'], $codigoBase),
    'pedido_total'  => $av['pedido_total'] !== null ? (float) $av['pedido_total'] : null,
    'pedido_data'   => $av['pedido_data'],
    'cliente_nome'  => $av['cliente_nome'] ?? null,
    'cliente_tel'   => $av['cliente_tel'] ?? null,
  ];
}, $avaliacoes);

echo json_encode([
  'ok'           => true,
  'total'        => $total,
  'media'        => $media,
  'distribuicao' => $distribuicao,
  'total_filtrado' => $totalFiltrado,
  'pagina'       => $pagina,
  'paginas'      => $paginas,
  'avaliacoes'   => $saida,
]);
