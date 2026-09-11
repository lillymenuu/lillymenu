<?php
/*
 * Versao JSON de admin/api/motoboys_entregas.php para o novo frontend
 * Next.js (/motoboys), trocando sessao por token Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/motoboy_module.php';
require_once __DIR__ . '/../../../helpers/pedido_codigo.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

motoboyEnsureModule($conn);

try {
  $tz = new DateTimeZone('America/Fortaleza');
  $agora = new DateTimeImmutable('now', $tz);

  $periodo = (string) ($_GET['periodo'] ?? 'hoje');
  $dataInicioInput = (string) ($_GET['data_inicio'] ?? '');
  $dataFimInput = (string) ($_GET['data_fim'] ?? '');

  if ($periodo === '7dias') {
    $inicio = $agora->setTime(0, 0)->modify('-6 days');
    $fim = $agora->setTime(23, 59, 59);
  } elseif ($periodo === 'customizado' && $dataInicioInput !== '' && $dataFimInput !== '') {
    try {
      $inicio = (new DateTimeImmutable($dataInicioInput, $tz))->setTime(0, 0, 0);
      $fim = (new DateTimeImmutable($dataFimInput, $tz))->setTime(23, 59, 59);
    } catch (Throwable $e) {
      $inicio = $agora->setTime(0, 0, 0);
      $fim = $agora->setTime(23, 59, 59);
    }
  } else {
    $inicio = $agora->setTime(0, 0, 0);
    $fim = $agora->setTime(23, 59, 59);
  }

  $allowedPerPage = [5, 10, 25];
  $perPageInput = (int) ($_GET['per_page'] ?? 10);
  $perPage = in_array($perPageInput, $allowedPerPage, true) ? $perPageInput : 10;
  $page = max(1, (int) ($_GET['page'] ?? 1));

  $stmtTotal = $conn->prepare("
    SELECT COUNT(*)
    FROM pedidos p
    WHERE p.loja_id = ?
      AND p.tipo = 'entrega'
      AND p.motoboy_id IS NOT NULL
      AND p.status = 'finalizado'
      AND p.criado_em BETWEEN ? AND ?
  ");
  $stmtTotal->execute([$lojaId, $inicio->format('Y-m-d H:i:s'), $fim->format('Y-m-d H:i:s')]);
  $total = (int) $stmtTotal->fetchColumn();
  $totalPages = max(1, (int) ceil($total / $perPage));
  $page = min($page, $totalPages);
  $offset = ($page - 1) * $perPage;

  $stmtEntregas = $conn->prepare("
    SELECT
      p.id, p.status, p.criado_em, p.endereco_entrega, p.taxa_entrega,
      c.nome AS cliente_nome, c.telefone AS cliente_telefone,
      m.nome AS motoboy_nome, m.whatsapp AS motoboy_whatsapp
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
    JOIN motoboys m ON m.id = p.motoboy_id AND m.loja_id = p.loja_id
    WHERE p.loja_id = ?
      AND p.tipo = 'entrega'
      AND p.motoboy_id IS NOT NULL
      AND p.status = 'finalizado'
      AND p.criado_em BETWEEN ? AND ?
    ORDER BY p.criado_em DESC, p.id DESC
    LIMIT ? OFFSET ?
  ");
  $stmtEntregas->bindValue(1, $lojaId, PDO::PARAM_INT);
  $stmtEntregas->bindValue(2, $inicio->format('Y-m-d H:i:s'), PDO::PARAM_STR);
  $stmtEntregas->bindValue(3, $fim->format('Y-m-d H:i:s'), PDO::PARAM_STR);
  $stmtEntregas->bindValue(4, $perPage, PDO::PARAM_INT);
  $stmtEntregas->bindValue(5, $offset, PDO::PARAM_INT);
  $stmtEntregas->execute();
  $entregas = $stmtEntregas->fetchAll(PDO::FETCH_ASSOC);

  $codigoBase = getPedidoCodigoBase($conn, $lojaId);

  echo json_encode([
    'ok' => true,
    'entregas' => array_map(function ($e) use ($codigoBase) {
      return [
        'id' => (int) $e['id'],
        'codigo' => calcCodigoDisplay((int) $e['id'], $codigoBase),
        'status' => $e['status'],
        'criado_em' => $e['criado_em'],
        'endereco_entrega' => $e['endereco_entrega'],
        'taxa_entrega' => (float) $e['taxa_entrega'],
        'cliente_nome' => $e['cliente_nome'],
        'cliente_telefone' => $e['cliente_telefone'],
        'motoboy_nome' => $e['motoboy_nome'],
        'motoboy_whatsapp' => $e['motoboy_whatsapp'],
      ];
    }, $entregas),
    'total' => $total,
    'page' => $page,
    'per_page' => $perPage,
    'total_pages' => $totalPages,
    'mostrando_de' => $total > 0 ? $offset + 1 : 0,
    'mostrando_ate' => min($page * $perPage, $total),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}
