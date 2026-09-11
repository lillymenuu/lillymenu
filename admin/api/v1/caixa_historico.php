<?php
/*
 * Versao JSON do bloco 'historico_ajax=1' de admin/controle_caixa.php
 * (paginacao do historico de turnos) para o novo frontend Next.js
 * (/cashcontrol), trocando sessao por token Bearer e resposta HTML parcial
 * por JSON.
 *
 * tipo=fechado: so turnos fechados (LIMIT 50, 9 por pagina) — usado quando
 * nao ha caixa aberto no momento.
 * tipo=completo: todos os turnos, incluindo o aberto se houver (LIMIT 80, 10
 * por pagina) — usado quando ha caixa aberto.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$tipo = ($_GET['tipo'] ?? 'fechado') === 'completo' ? 'completo' : 'fechado';
$porPagina = $tipo === 'completo' ? 10 : 9;
$limite = $tipo === 'completo' ? 80 : 50;

$where = ["c.loja_id = ?"];
$params = [$lojaId];
if ($tipo === 'fechado') {
  $where[] = "c.status <> 'aberto'";
}

$stmt = $conn->prepare("
  SELECT c.id, c.status, c.aberto_em, c.fechado_em, a.nome AS operador
  FROM caixa_turnos c
  LEFT JOIN admins a ON a.id = c.operador_id
  WHERE " . implode(' AND ', $where) . "
  ORDER BY c.id DESC
  LIMIT $limite
");
$stmt->execute($params);
$todos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total = count($todos);
$totalPaginas = max(1, (int) ceil($total / $porPagina));
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
if ($pagina > $totalPaginas) {
  $pagina = $totalPaginas;
}
$offset = ($pagina - 1) * $porPagina;
$itens = array_slice($todos, $offset, $porPagina);

echo json_encode([
  'ok' => true,
  'tipo' => $tipo,
  'itens' => array_map(function ($item) {
    return [
      'id' => (int) $item['id'],
      'status' => $item['status'],
      'aberto_em' => $item['aberto_em'],
      'fechado_em' => $item['fechado_em'],
      'operador' => $item['operador'],
    ];
  }, $itens),
  'pagina' => $pagina,
  'total_paginas' => $totalPaginas,
  'total' => $total,
  'mostrando_de' => $total > 0 ? $offset + 1 : 0,
  'mostrando_ate' => min($offset + $porPagina, $total),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
