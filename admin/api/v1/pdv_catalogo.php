<?php
/*
 * Catalogo completo pro POS (/pos, overlay de balcao) — categorias,
 * produtos (com estoque, tem_variacoes, pontos, promo) e combos, numa
 * chamada so, igual ao legado admin/pdv.php (que inlina tudo isso no
 * HTML da pagina). Endpoint novo, sem equivalente legado dedicado.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$stmt = $conn->prepare("
  SELECT id, nome, ordem
  FROM categorias
  WHERE loja_id = ? AND ativo = 1
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);
$categorias = array_map(function ($c) {
  return ['id' => (int) $c['id'], 'nome' => $c['nome']];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

$stmtCheck = $conn->prepare("SHOW TABLES LIKE 'estoque_grupo_membros'");
$stmtCheck->execute();
$temGrupoEstoque = (bool) $stmtCheck->fetchColumn();

$joinGrupo = $temGrupoEstoque ? "LEFT JOIN estoque_grupo_membros egm ON egm.produto_id = p.id AND egm.loja_id = p.loja_id" : "";
$campoGrupo = $temGrupoEstoque ? "egm.grupo_id" : "NULL AS grupo_id";

$stmt = $conn->prepare("
  SELECT p.id, p.nome, p.descricao, p.categoria_id, p.preco, p.preco_promocional, p.promo_desativado,
         p.tem_variacoes, p.imagem, p.pontos_ganho, p.pontos_custo,
         COALESCE(e.quantidade, 0) AS estoque, $campoGrupo
  FROM produtos p
  LEFT JOIN estoque e ON e.produto_id = p.id AND e.loja_id = p.loja_id
  $joinGrupo
  WHERE p.loja_id = ? AND p.ativo = 1 AND p.disponivel_catalogo = 1
  ORDER BY p.ordem IS NULL, p.ordem, p.nome
");
$stmt->execute([$lojaId]);
$produtos = array_map(function ($p) {
  $precoPromo = $p['preco_promocional'] !== null ? (float) $p['preco_promocional'] : null;
  $emPromo = $precoPromo !== null && $precoPromo > 0 && (int) $p['promo_desativado'] !== 1;
  return [
    'id' => (int) $p['id'],
    'nome' => $p['nome'],
    'descricao' => $p['descricao'] !== null && trim($p['descricao']) !== '' ? $p['descricao'] : null,
    'categoria_id' => $p['categoria_id'] !== null ? (int) $p['categoria_id'] : null,
    'preco' => (float) $p['preco'],
    'preco_promocional' => $emPromo ? $precoPromo : null,
    'tem_variacoes' => (int) $p['tem_variacoes'] === 1,
    'imagem' => $p['imagem'],
    'pontos_ganho' => (int) ($p['pontos_ganho'] ?? 0),
    'pontos_custo' => (int) ($p['pontos_custo'] ?? 0),
    'estoque' => (int) $p['estoque'],
    'grupo_estoque_id' => $p['grupo_id'] !== null ? (int) $p['grupo_id'] : null,
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt = $conn->prepare("
  SELECT id, nome, categoria_id, imagem, tipo_preco, preco, preco_promocional, promo_desativado
  FROM combos
  WHERE loja_id = ? AND ativo = 1
  ORDER BY ordem IS NULL, ordem, nome
");
$stmt->execute([$lojaId]);
$combos = array_map(function ($c) {
  $precoPromo = $c['preco_promocional'] !== null ? (float) $c['preco_promocional'] : null;
  $emPromo = $precoPromo !== null && $precoPromo > 0 && (int) $c['promo_desativado'] !== 1;
  return [
    'id' => (int) $c['id'],
    'nome' => $c['nome'],
    'categoria_id' => $c['categoria_id'] !== null ? (int) $c['categoria_id'] : null,
    'imagem' => $c['imagem'],
    'tipo_preco' => $c['tipo_preco'],
    'preco' => (float) $c['preco'],
    'preco_promocional' => $emPromo ? $precoPromo : null,
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode([
  'ok' => true,
  'categorias' => $categorias,
  'produtos' => $produtos,
  'combos' => $combos,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
