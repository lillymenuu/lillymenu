<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/financial_module.php';
require_once __DIR__ . '/../../services/SaleFinancialIntegrationService.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$modo   = $_POST['modo'] ?? 'mes'; // 'mes' ou 'todos'
$mes    = (int) ($_POST['mes'] ?? date('n'));
$ano    = (int) ($_POST['ano'] ?? date('Y'));

// DDL fora de qualquer transação
financialEnsureModule($conn);

$svc = new SaleFinancialIntegrationService();

try {
    if ($modo === 'todos') {
        // Busca todos os meses com pedidos finalizados sem lançamento
        $stmt = $conn->prepare("
            SELECT DISTINCT YEAR(p.criado_em) AS ano, MONTH(p.criado_em) AS mes
            FROM pedidos p
            WHERE p.loja_id = ?
              AND p.status = 'finalizado'
              AND p.total > 0
              AND NOT EXISTS (
                SELECT 1 FROM financial_transactions ft
                WHERE ft.tenant_id = p.loja_id
                  AND ft.order_id = p.id
                  AND ft.type = 'income'
              )
            ORDER BY ano ASC, mes ASC
        ");
        $stmt->execute([$lojaId]);
        $periodos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCriados = 0;
        $totalAtualizados = 0;
        $totalPedidos = 0;
        $mesesSincronizados = [];

        foreach ($periodos as $periodo) {
            $result = $svc->syncFinalizedOrdersForPeriod(
                $conn,
                $lojaId,
                (int) $periodo['mes'],
                (int) $periodo['ano']
            );
            $totalCriados    += (int) ($result['created'] ?? 0);
            $totalAtualizados += (int) ($result['updated'] ?? 0);
            $totalPedidos    += (int) ($result['orders'] ?? 0);
            $mesesSincronizados[] = $periodo['mes'] . '/' . $periodo['ano'];
        }

        echo json_encode([
            'ok'       => true,
            'modo'     => 'todos',
            'periodos' => $mesesSincronizados,
            'created'  => $totalCriados,
            'updated'  => $totalAtualizados,
            'orders'   => $totalPedidos,
            'msg'      => "Sincronizados {$totalPedidos} pedido(s) — {$totalCriados} lançamento(s) criado(s).",
        ], JSON_UNESCAPED_UNICODE);

    } else {
        // Sincroniza apenas o mês/ano informado
        $result = $svc->syncFinalizedOrdersForPeriod($conn, $lojaId, $mes, $ano);
        echo json_encode([
            'ok'      => true,
            'modo'    => 'mes',
            'mes'     => $mes,
            'ano'     => $ano,
            'created' => $result['created'] ?? 0,
            'updated' => $result['updated'] ?? 0,
            'orders'  => $result['orders'] ?? 0,
            'msg'     => "Sincronizados {$result['orders']} pedido(s) de {$mes}/{$ano} — {$result['created']} lançamento(s) criado(s).",
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Erro: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
