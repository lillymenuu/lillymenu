<?php
/*
 * Versao JSON de admin/promo.php (so a leitura/listagem — as acoes de
 * salvar ficam em promo_salvar.php/flyers_*.php) para o novo frontend
 * Next.js (/promotion). Mesma logica de auto-correcao lazy do legado
 * (expira promocoes vencidas, corrige excesso acima do limite), trocando
 * sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

/* Numero maximo de produtos em promocao simultanea — mesmo limite usado
 * em promo_salvar.php (LIMITE_PROMOS_ATIVAS). */
$LIMITE_PROMOS_ATIVAS = 6;

$lojaFlyers = json_decode((string) config($conn, 'loja_flyers', '[]'), true);
if (!is_array($lojaFlyers)) {
  $lojaFlyers = [];
}
$lojaFlyers = array_values(array_filter($lojaFlyers));
$flyersAtivo = config($conn, 'loja_flyers_ativo', '1') === '1';

$produtoColunas = $conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN, 0);
foreach ([
  'preco_promocional' => "ALTER TABLE produtos ADD COLUMN preco_promocional DECIMAL(10,2) NULL DEFAULT NULL",
  'promo_desativado'  => "ALTER TABLE produtos ADD COLUMN promo_desativado TINYINT(1) NOT NULL DEFAULT 1",
  'promo_dias'        => "ALTER TABLE produtos ADD COLUMN promo_dias INT NULL DEFAULT NULL",
  'promo_inicio'      => "ALTER TABLE produtos ADD COLUMN promo_inicio DATE NULL DEFAULT NULL",
  'promo_imagem'      => "ALTER TABLE produtos ADD COLUMN promo_imagem VARCHAR(255) NULL DEFAULT NULL",
  'promo_descricao'   => "ALTER TABLE produtos ADD COLUMN promo_descricao TEXT NULL DEFAULT NULL",
  'promo_etiqueta'    => "ALTER TABLE produtos ADD COLUMN promo_etiqueta VARCHAR(30) NULL DEFAULT NULL",
] as $coluna => $ddl) {
  if (!in_array($coluna, $produtoColunas, true)) {
    try { $conn->exec($ddl); $produtoColunas[] = $coluna; } catch (Throwable $e) {}
  }
}
$temImagem = in_array('imagem', $produtoColunas, true);

/* Desativa lazy as promocoes cuja data de expiracao (inicio + dias) ja passou */
try {
  $conn->prepare("
    UPDATE produtos
    SET promo_desativado = 1
    WHERE loja_id = ? AND promo_desativado = 0
      AND promo_dias IS NOT NULL AND promo_inicio IS NOT NULL
      AND DATE_ADD(promo_inicio, INTERVAL promo_dias DAY) <= CURDATE()
  ")->execute([$lojaId]);
} catch (Throwable $e) {
}

/* Ate LIMITE_PROMOS_ATIVAS promocoes ativas ao mesmo tempo. Auto-correcao
 * lazy caso tenha sobrado mais que isso (dado de antes dessa regra existir,
 * ou uma corrida rara): mantem as mais recentes e desativa o resto. */
try {
  $stmt = $conn->prepare("
    SELECT id FROM produtos
    WHERE loja_id = ? AND promo_desativado = 0 AND preco_promocional > 0
    ORDER BY promo_inicio DESC, id DESC
    LIMIT " . (int) $LIMITE_PROMOS_ATIVAS . "
  ");
  $stmt->execute([$lojaId]);
  $manterPromoIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
  if ($manterPromoIds) {
    $placeholders = implode(',', array_fill(0, count($manterPromoIds), '?'));
    $conn->prepare("
      UPDATE produtos SET promo_desativado = 1
      WHERE loja_id = ? AND promo_desativado = 0 AND id NOT IN ($placeholders)
    ")->execute([$lojaId, ...$manterPromoIds]);
  }
} catch (Throwable $e) {
}

$selectCampos = [
  'p.id', 'p.nome', 'p.preco', 'p.categoria_id', 'c.nome AS categoria',
  'p.preco_promocional', 'p.promo_desativado', 'p.promo_dias', 'p.promo_inicio',
  'p.promo_imagem', 'p.promo_descricao', 'p.promo_etiqueta',
];
if ($temImagem) {
  $selectCampos[] = 'p.imagem';
}

$stmt = $conn->prepare("
  SELECT " . implode(', ', $selectCampos) . "
  FROM produtos p
  LEFT JOIN categorias c ON c.id = p.categoria_id AND c.loja_id = p.loja_id
  WHERE p.loja_id = ? AND p.ativo = 1
  ORDER BY c.ordem IS NULL, c.ordem, c.nome, p.nome
");
$stmt->execute([$lojaId]);
$produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$hoje = new DateTime('today');
foreach ($produtos as &$p) {
  $p['id'] = (int) $p['id'];
  $p['preco'] = (float) $p['preco'];
  $p['categoria_id'] = $p['categoria_id'] !== null ? (int) $p['categoria_id'] : null;
  $p['preco_promocional'] = $p['preco_promocional'] !== null ? (float) $p['preco_promocional'] : null;
  $p['promo_desativado'] = (int) $p['promo_desativado'];
  $p['promo_dias'] = $p['promo_dias'] !== null ? (int) $p['promo_dias'] : null;
  $p['em_promo'] = !$p['promo_desativado'] && $p['preco_promocional'] > 0;
  $p['dias_restantes'] = null;
  if ($p['em_promo'] && $p['promo_dias'] && $p['promo_inicio']) {
    $fim = (new DateTime($p['promo_inicio']))->modify('+' . (int) $p['promo_dias'] . ' days');
    $p['dias_restantes'] = max(0, (int) $hoje->diff($fim)->format('%r%a'));
  }
}
unset($p);

$ativasCount = 0;
foreach ($produtos as $p) {
  if ($p['em_promo']) {
    $ativasCount++;
  }
}

echo json_encode([
  'ok' => true,
  'produtos' => $produtos,
  'limite_ativas' => $LIMITE_PROMOS_ATIVAS,
  'ativas_count' => $ativasCount,
  'flyers' => $lojaFlyers,
  'flyers_ativo' => $flyersAtivo,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
