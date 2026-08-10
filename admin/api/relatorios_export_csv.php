<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/pedidos_competencia.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$competencia     = pedidosCompetenciaConfig($conn, 'p', 'cx');
$campoDataPedido = $competencia['date_expr'];
$joinCompetencia = $competencia['join'];

$inicioParam     = $_GET['inicio'] ?? '';
$fimParam        = $_GET['fim'] ?? '';
$statusFiltro    = $_GET['status'] ?? 'todos';
$tipoFiltro      = trim($_GET['tipo'] ?? '');
$pagamentoFiltro = trim($_GET['pagamento'] ?? '');
$periodoFiltro   = $_GET['periodo'] ?? 'hoje';

if ($periodoFiltro === 'customizado') {
  $inicio = $inicioParam ?: date('Y-m-01');
  $fim    = $fimParam    ?: date('Y-m-d');
} elseif ($periodoFiltro === 'hoje') {
  $inicio = $inicioParam ?: date('Y-m-d');
  $fim    = $fimParam    ?: date('Y-m-d');
} elseif ($periodoFiltro === '7dias') {
  $inicio = date('Y-m-d', strtotime('-6 days'));
  $fim    = date('Y-m-d');
} elseif ($periodoFiltro === '30dias') {
  $inicio = date('Y-m-d', strtotime('-29 days'));
  $fim    = date('Y-m-d');
} else {
  $inicio = date('Y-m-d');
  $fim    = date('Y-m-d');
}

$condicoes = ["{$campoDataPedido} BETWEEN ? AND ?", "p.loja_id = ?"];
$params    = [$inicio, $fim, $lojaId];
if ($statusFiltro && $statusFiltro !== 'todos') {
  $condicoes[] = "p.status = ?";
  $params[]    = $statusFiltro;
}
if ($tipoFiltro !== '') {
  $condicoes[] = "p.tipo = ?";
  $params[]    = $tipoFiltro;
}
if ($pagamentoFiltro !== '') {
  $condicoes[] = "p.forma_pagamento = ?";
  $params[]    = $pagamentoFiltro;
}
$where = 'WHERE ' . implode(' AND ', $condicoes);

// ── Helpers ───────────────────────────────────────────────────────────────────
function xlLabelPag($f) {
  return ['pix' => 'Pix', 'dinheiro' => 'Dinheiro', 'credito' => 'Cartão Crédito', 'debito' => 'Cartão Débito'][$f] ?? ucfirst($f ?: '-');
}
function xlLabelTipo($t) {
  return $t === 'retirada' ? 'Retirada' : 'Entrega';
}
function xlStatus($s) {
  return ['pendente' => 'Pendente', 'confirmado' => 'Confirmado', 'em_preparo' => 'Em preparo',
          'saiu_entrega' => 'Saiu p/ entrega', 'entregue' => 'Entregue', 'cancelado' => 'Cancelado'][$s] ?? ucfirst($s ?: '-');
}

// ── Queries ───────────────────────────────────────────────────────────────────

// Resumo geral
$stmtRes = $conn->prepare("
  SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(p.total), 0) AS total_geral
  FROM pedidos p {$joinCompetencia} {$where}
");
$stmtRes->execute($params);
$resumo = $stmtRes->fetch(PDO::FETCH_ASSOC);

$condCanc = ["{$campoDataPedido} BETWEEN ? AND ?", "p.loja_id = ?", "p.status = 'cancelado'"];
$parCanc  = [$inicio, $fim, $lojaId];
if ($tipoFiltro !== '')      { $condCanc[] = "p.tipo = ?";            $parCanc[] = $tipoFiltro; }
if ($pagamentoFiltro !== '') { $condCanc[] = "p.forma_pagamento = ?"; $parCanc[] = $pagamentoFiltro; }
$stmtCanc = $conn->prepare("SELECT COUNT(*) AS qtd, COALESCE(SUM(p.total),0) AS total FROM pedidos p {$joinCompetencia} WHERE " . implode(' AND ', $condCanc));
$stmtCanc->execute($parCanc);
$rowCanc = $stmtCanc->fetch(PDO::FETCH_ASSOC);

$totalPedidos      = (int)   ($resumo['total_pedidos'] ?? 0);
$totalGeral        = (float) ($resumo['total_geral']   ?? 0);
$totalCancelados   = (int)   ($rowCanc['qtd']    ?? 0);
$valorCancelados   = (float) ($rowCanc['total']  ?? 0);
$ticketMedio       = $totalPedidos > 0 ? $totalGeral / $totalPedidos : 0;

// Vendas por dia
$stmtDia = $conn->prepare("
  SELECT {$campoDataPedido} AS dia, COUNT(*) AS pedidos, COALESCE(SUM(p.total),0) AS total
  FROM pedidos p {$joinCompetencia} {$where}
  GROUP BY {$campoDataPedido} ORDER BY dia
");
$stmtDia->execute($params);
$vendasDia = $stmtDia->fetchAll(PDO::FETCH_ASSOC);

// Produtos
$vendProdutos = [];
try {
  $stmtProd = $conn->prepare("
    SELECT i.produto_nome AS produto, SUM(i.quantidade) AS qtd, SUM(i.quantidade * i.preco) AS total
    FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id {$joinCompetencia} {$where}
    GROUP BY i.produto_nome ORDER BY total DESC
  ");
  $stmtProd->execute($params);
  $vendProdutos = $stmtProd->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {}

// Pagamentos
$stmtPag = $conn->prepare("
  SELECT p.forma_pagamento AS forma, COUNT(*) AS qtd, COALESCE(SUM(p.total),0) AS total
  FROM pedidos p {$joinCompetencia} {$where}
  GROUP BY p.forma_pagamento ORDER BY total DESC
");
$stmtPag->execute($params);
$vendPagamentos = $stmtPag->fetchAll(PDO::FETCH_ASSOC);

// Pedidos
$selCodigoBase = 0;
try {
  $cbStmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = 'pedido_codigo_base' LIMIT 1");
  $cbStmt->execute([$lojaId]);
  $selCodigoBase = (int) ($cbStmt->fetchColumn() ?: 0);
} catch (Exception $e) {}
$selCodigo = $selCodigoBase > 0
  ? ", IF(p.id > {$selCodigoBase}, p.id - {$selCodigoBase}, p.id) AS codigo_display"
  : ", p.id AS codigo_display";

$stmtPed = $conn->prepare("
  SELECT p.id, p.total, p.status, p.tipo, p.forma_pagamento, p.criado_em,
         c.nome AS cliente {$selCodigo}
  FROM pedidos p
  JOIN clientes c ON c.id = p.cliente_id AND c.loja_id = p.loja_id
  {$joinCompetencia} {$where}
  ORDER BY p.criado_em DESC
");
$stmtPed->execute($params);
$listaPedidos = $stmtPed->fetchAll(PDO::FETCH_ASSOC);

// Clientes
$stmtCli = $conn->prepare("
  SELECT c.nome, COUNT(p.id) AS pedidos, COALESCE(SUM(p.total),0) AS total
  FROM clientes c
  JOIN pedidos p ON p.cliente_id = c.id AND c.loja_id = p.loja_id
  {$joinCompetencia} {$where}
  GROUP BY c.id, c.nome ORDER BY total DESC
");
$stmtCli->execute($params);
$clientes = $stmtCli->fetchAll(PDO::FETCH_ASSOC);

// ── Spreadsheet ───────────────────────────────────────────────────────────────

$spreadsheet = new Spreadsheet();
$spreadsheet->getProperties()
  ->setTitle('Relatório de Vendas')
  ->setCreator('LillyMenu');

// Cores da paleta
$COR_HEADER   = 'FF1a7a4a'; // verde escuro
$COR_HEADER2  = 'FF2d9c60'; // verde médio
$COR_ALT      = 'FFF0FAF4'; // verde clarinho (linhas pares)
$COR_TOTAL    = 'FFECFDF5'; // fundo totais
$COR_WHITE    = 'FFFFFFFF';
$COR_TEXT_HDR = 'FFFFFFFF';
$COR_BORDER   = 'FFD1D5DB';

// ── Helpers de estilo ────────────────────────────────────────────────────────
function applyHeaderStyle($sheet, $range, $bgColor, $textColor = 'FFFFFFFF', $fontSize = 10) {
  $sheet->getStyle($range)->applyFromArray([
    'font'      => ['bold' => true, 'color' => ['argb' => $textColor], 'size' => $fontSize],
    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFB0BEC5']]],
  ]);
}

function applyDataStyle($sheet, $range, $altRow = false) {
  $bg = $altRow ? 'FFF0FAF4' : 'FFFFFFFF';
  $sheet->getStyle($range)->applyFromArray([
    'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFE5E7EB']]],
    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
  ]);
}

function setColWidths($sheet, $widths) {
  foreach ($widths as $col => $w) {
    $sheet->getColumnDimension($col)->setWidth($w);
  }
}

function addSheetTitle($sheet, $title, $subtitle, $cols) {
  $sheet->setCellValue('A1', $title);
  $sheet->getStyle('A1')->applyFromArray([
    'font' => ['bold' => true, 'size' => 14, 'color' => ['argb' => 'FF1a7a4a']],
  ]);
  $sheet->mergeCells("A1:{$cols}1");
  $sheet->setCellValue('A2', $subtitle);
  $sheet->getStyle('A2')->applyFromArray([
    'font' => ['size' => 9, 'color' => ['argb' => 'FF6B7280'], 'italic' => true],
  ]);
  $sheet->mergeCells("A2:{$cols}2");
  $sheet->getRowDimension(1)->setRowHeight(22);
  $sheet->getRowDimension(2)->setRowHeight(16);
}

$periodoLabel = "Período: " . date('d/m/Y', strtotime($inicio)) . " a " . date('d/m/Y', strtotime($fim));

// ════════════════════════════════════════════════════════════════════════════
// ABA 1 — RESUMO
// ════════════════════════════════════════════════════════════════════════════
$sh = $spreadsheet->getActiveSheet();
$sh->setTitle('Resumo');

addSheetTitle($sh, 'Relatório de Vendas', $periodoLabel, 'C');

$sh->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh, 'A4:C4', $COR_HEADER, $COR_TEXT_HDR, 10);
$sh->setCellValue('A4', 'Métrica');
$sh->setCellValue('B4', 'Valor');
$sh->setCellValue('C4', 'Observação');

$metricas = [
  ['Total de Pedidos',        $totalPedidos,   'pedidos no período'],
  ['Total Vendido',           $totalGeral,     'receita bruta'],
  ['Ticket Médio',            $ticketMedio,    'média por pedido'],
  ['Pedidos Cancelados',      $totalCancelados,'cancelados no período'],
  ['Valor Total Cancelado',   $valorCancelados,'receita perdida'],
];

$row = 5;
foreach ($metricas as $i => $m) {
  $sh->setCellValue("A{$row}", $m[0]);
  $sh->setCellValue("B{$row}", $m[1]);
  $sh->setCellValue("C{$row}", $m[2]);
  if (in_array($i, [1,2,4])) {
    $sh->getStyle("B{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  }
  $sh->getStyle("A{$row}")->getFont()->setBold(true);
  applyDataStyle($sh, "A{$row}:C{$row}", $i % 2 === 0);
  $sh->getRowDimension($row)->setRowHeight(18);
  $row++;
}

setColWidths($sh, ['A' => 28, 'B' => 20, 'C' => 30]);
$sh->freezePane('A5');
$sh->getStyle('A4:C4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

// ════════════════════════════════════════════════════════════════════════════
// ABA 2 — VENDAS POR DIA
// ════════════════════════════════════════════════════════════════════════════
$sh2 = $spreadsheet->createSheet();
$sh2->setTitle('Vendas por Dia');

addSheetTitle($sh2, 'Vendas por Dia', $periodoLabel, 'C');

$sh2->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh2, 'A4:C4', $COR_HEADER);
$sh2->setCellValue('A4', 'Data');
$sh2->setCellValue('B4', 'Pedidos');
$sh2->setCellValue('C4', 'Total (R$)');

$row = 5; $totalD = 0; $totalP = 0;
foreach ($vendasDia as $i => $v) {
  $sh2->setCellValue("A{$row}", date('d/m/Y', strtotime($v['dia'])));
  $sh2->setCellValue("B{$row}", (int)$v['pedidos']);
  $sh2->setCellValue("C{$row}", (float)$v['total']);
  $sh2->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  $sh2->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
  applyDataStyle($sh2, "A{$row}:C{$row}", $i % 2 !== 0);
  $sh2->getRowDimension($row)->setRowHeight(17);
  $totalD += (float)$v['total'];
  $totalP += (int)$v['pedidos'];
  $row++;
}
// Linha de totais
$sh2->setCellValue("A{$row}", 'TOTAL');
$sh2->setCellValue("B{$row}", $totalP);
$sh2->setCellValue("C{$row}", $totalD);
$sh2->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
$sh2->getStyle("A{$row}:C{$row}")->applyFromArray([
  'font' => ['bold' => true, 'color' => ['argb' => 'FF1a7a4a']],
  'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COR_TOTAL]],
  'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1a7a4a']]],
]);

setColWidths($sh2, ['A' => 16, 'B' => 14, 'C' => 18]);
$sh2->freezePane('A5');

// ════════════════════════════════════════════════════════════════════════════
// ABA 3 — PRODUTOS
// ════════════════════════════════════════════════════════════════════════════
$sh3 = $spreadsheet->createSheet();
$sh3->setTitle('Vendas por Produto');

addSheetTitle($sh3, 'Vendas por Produto', $periodoLabel, 'C');

$sh3->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh3, 'A4:C4', $COR_HEADER);
$sh3->setCellValue('A4', 'Produto');
$sh3->setCellValue('B4', 'Qtd Vendida');
$sh3->setCellValue('C4', 'Total (R$)');

$row = 5; $tQtd = 0; $tVal = 0;
foreach ($vendProdutos as $i => $p) {
  $sh3->setCellValue("A{$row}", $p['produto'] ?? '-');
  $sh3->setCellValue("B{$row}", (int)$p['qtd']);
  $sh3->setCellValue("C{$row}", (float)$p['total']);
  $sh3->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  $sh3->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
  applyDataStyle($sh3, "A{$row}:C{$row}", $i % 2 !== 0);
  $sh3->getRowDimension($row)->setRowHeight(17);
  $tQtd += (int)$p['qtd'];
  $tVal += (float)$p['total'];
  $row++;
}
$sh3->setCellValue("A{$row}", 'TOTAL');
$sh3->setCellValue("B{$row}", $tQtd);
$sh3->setCellValue("C{$row}", $tVal);
$sh3->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
$sh3->getStyle("A{$row}:C{$row}")->applyFromArray([
  'font' => ['bold' => true, 'color' => ['argb' => 'FF1a7a4a']],
  'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COR_TOTAL]],
  'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1a7a4a']]],
]);

setColWidths($sh3, ['A' => 36, 'B' => 16, 'C' => 18]);
$sh3->freezePane('A5');

// ════════════════════════════════════════════════════════════════════════════
// ABA 4 — PAGAMENTOS
// ════════════════════════════════════════════════════════════════════════════
$sh4 = $spreadsheet->createSheet();
$sh4->setTitle('Formas de Pagamento');

addSheetTitle($sh4, 'Vendas por Forma de Pagamento', $periodoLabel, 'C');

$sh4->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh4, 'A4:C4', $COR_HEADER);
$sh4->setCellValue('A4', 'Forma de Pagamento');
$sh4->setCellValue('B4', 'Qtd Pedidos');
$sh4->setCellValue('C4', 'Total (R$)');

$row = 5; $tPag = 0; $tValPag = 0;
foreach ($vendPagamentos as $i => $pg) {
  $sh4->setCellValue("A{$row}", xlLabelPag($pg['forma'] ?? ''));
  $sh4->setCellValue("B{$row}", (int)$pg['qtd']);
  $sh4->setCellValue("C{$row}", (float)$pg['total']);
  $sh4->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  $sh4->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
  applyDataStyle($sh4, "A{$row}:C{$row}", $i % 2 !== 0);
  $sh4->getRowDimension($row)->setRowHeight(17);
  $tPag += (int)$pg['qtd'];
  $tValPag += (float)$pg['total'];
  $row++;
}
$sh4->setCellValue("A{$row}", 'TOTAL');
$sh4->setCellValue("B{$row}", $tPag);
$sh4->setCellValue("C{$row}", $tValPag);
$sh4->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
$sh4->getStyle("A{$row}:C{$row}")->applyFromArray([
  'font' => ['bold' => true, 'color' => ['argb' => 'FF1a7a4a']],
  'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COR_TOTAL]],
  'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1a7a4a']]],
]);

setColWidths($sh4, ['A' => 26, 'B' => 16, 'C' => 18]);
$sh4->freezePane('A5');

// ════════════════════════════════════════════════════════════════════════════
// ABA 5 — PEDIDOS
// ════════════════════════════════════════════════════════════════════════════
$sh5 = $spreadsheet->createSheet();
$sh5->setTitle('Pedidos');

addSheetTitle($sh5, 'Lista de Pedidos', $periodoLabel, 'G');

$sh5->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh5, 'A4:G4', $COR_HEADER);
$sh5->setCellValue('A4', '#');
$sh5->setCellValue('B4', 'Cliente');
$sh5->setCellValue('C4', 'Data / Hora');
$sh5->setCellValue('D4', 'Tipo');
$sh5->setCellValue('E4', 'Pagamento');
$sh5->setCellValue('F4', 'Status');
$sh5->setCellValue('G4', 'Valor (R$)');

$row = 5; $tPed = 0;
foreach ($listaPedidos as $i => $pd) {
  $codigo = $pd['codigo_display'] ?? $pd['id'];
  $sh5->setCellValue("A{$row}", '#' . $codigo);
  $sh5->setCellValue("B{$row}", $pd['cliente'] ?? '-');
  $sh5->setCellValue("C{$row}", date('d/m/Y H:i', strtotime($pd['criado_em'])));
  $sh5->setCellValue("D{$row}", xlLabelTipo($pd['tipo'] ?? ''));
  $sh5->setCellValue("E{$row}", xlLabelPag($pd['forma_pagamento'] ?? ''));
  $sh5->setCellValue("F{$row}", xlStatus($pd['status'] ?? ''));
  $sh5->setCellValue("G{$row}", (float)$pd['total']);
  $sh5->getStyle("G{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  applyDataStyle($sh5, "A{$row}:G{$row}", $i % 2 !== 0);
  $sh5->getRowDimension($row)->setRowHeight(17);
  $tPed += (float)$pd['total'];
  $row++;
}
$sh5->setCellValue("A{$row}", 'TOTAL');
$sh5->mergeCells("A{$row}:F{$row}");
$sh5->setCellValue("G{$row}", $tPed);
$sh5->getStyle("G{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
$sh5->getStyle("A{$row}:G{$row}")->applyFromArray([
  'font' => ['bold' => true, 'color' => ['argb' => 'FF1a7a4a']],
  'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $COR_TOTAL]],
  'borders' => ['top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1a7a4a']]],
]);

setColWidths($sh5, ['A' => 10, 'B' => 28, 'C' => 18, 'D' => 12, 'E' => 20, 'F' => 18, 'G' => 18]);
$sh5->freezePane('A5');

// ════════════════════════════════════════════════════════════════════════════
// ABA 6 — CLIENTES
// ════════════════════════════════════════════════════════════════════════════
$sh6 = $spreadsheet->createSheet();
$sh6->setTitle('Melhores Clientes');

addSheetTitle($sh6, 'Melhores Clientes', $periodoLabel, 'C');

$sh6->getRowDimension(4)->setRowHeight(18);
applyHeaderStyle($sh6, 'A4:C4', $COR_HEADER);
$sh6->setCellValue('A4', 'Cliente');
$sh6->setCellValue('B4', 'Pedidos');
$sh6->setCellValue('C4', 'Total Gasto (R$)');

$row = 5;
foreach ($clientes as $i => $cl) {
  $sh6->setCellValue("A{$row}", $cl['nome'] ?? '-');
  $sh6->setCellValue("B{$row}", (int)$cl['pedidos']);
  $sh6->setCellValue("C{$row}", (float)$cl['total']);
  $sh6->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"R$ "#,##0.00');
  $sh6->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
  applyDataStyle($sh6, "A{$row}:C{$row}", $i % 2 !== 0);
  $sh6->getRowDimension($row)->setRowHeight(17);
  $row++;
}

setColWidths($sh6, ['A' => 32, 'B' => 14, 'C' => 20]);
$sh6->freezePane('A5');

// ── Ativa primeira aba ────────────────────────────────────────────────────────
$spreadsheet->setActiveSheetIndex(0);

// ── Output ────────────────────────────────────────────────────────────────────
$filename = 'relatorio_' . $inicio . '_' . $fim . '.xlsx';

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: max-age=0');

$writer = new Xlsx($spreadsheet);
$writer->save('php://output');
exit;
