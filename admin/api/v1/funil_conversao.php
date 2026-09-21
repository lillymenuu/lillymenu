<?php
/*
 * Versao JSON de admin/api/funil_conversao.php para o novo frontend Next.js.
 * Mesma logica (conta eventos de loja_eventos por tipo), so que autenticada
 * por token Bearer em vez de sessao.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json; charset=UTF-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$dias   = max(1, min(90, (int) ($_GET['dias'] ?? 7)));

try {
  $stmt = $conn->prepare("SHOW TABLES LIKE 'loja_eventos'");
  $stmt->execute();
  $temTabela = (bool) $stmt->fetchColumn();

  if (!$temTabela) {
    echo json_encode(['ok' => true, 'dias' => $dias, 'visitas' => 0, 'views' => 0, 'carrinhos' => 0, 'pedidos' => 0, 'conversao' => 0]);
    exit;
  }

  $desde = date('Y-m-d H:i:s', strtotime("-{$dias} days"));

  /* Pessoas unicas por etapa (visitante anonimo). Eventos antigos, sem visitante, nao entram. */
  $temCol = $conn->query("SHOW COLUMNS FROM loja_eventos LIKE 'visitante'")->fetchColumn();
  $rows = [];
  if ($temCol) {
    $stmtEvt = $conn->prepare("
      SELECT tipo, COUNT(DISTINCT visitante) AS cnt
      FROM loja_eventos
      WHERE loja_id = ? AND criado_em >= ? AND visitante IS NOT NULL
      GROUP BY tipo
    ");
    $stmtEvt->execute([$lojaId, $desde]);
    $rows = $stmtEvt->fetchAll(PDO::FETCH_KEY_PAIR);
  }

  /* Funil: cada etapa nunca passa da anterior. */
  $visitas   = (int) ($rows['visita'] ?? 0);
  $views     = min($visitas, (int) ($rows['view_item'] ?? 0));
  $carrinhos = min($views, (int) ($rows['carrinho'] ?? 0));
  $pedidos   = min($carrinhos, (int) ($rows['pedido'] ?? 0));

  $conversao = $visitas > 0 ? round($pedidos / $visitas * 100) : 0;

  echo json_encode([
    'ok'            => true,
    'dias'          => $dias,
    'visitas'       => $visitas,
    'views'         => $views,
    'carrinhos'     => $carrinhos,
    'pedidos'       => $pedidos,
    'conversao'     => $conversao,
    'pct_views'     => $visitas > 0 ? round($views / $visitas * 100) : 0,
    'pct_carrinhos' => $visitas > 0 ? round($carrinhos / $visitas * 100) : 0,
    'pct_pedidos'   => $visitas > 0 ? round($pedidos / $visitas * 100) : 0,
  ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
