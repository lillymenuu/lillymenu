<?php
/*
 * Gera o PDF (orcamento ou recibo) a partir de um orcamento JA SALVO no
 * banco (GET ?id=&tipo=orcamento|recibo). Reaproveita o mesmo template
 * HTML/CSS de admin/api/orcamento_pdf.php (que gera a partir de dados
 * efemeros do POST do form legado) via o helper compartilhado
 * orcamentoPdfRenderHtml() — sem duplicar o template. Auth via Bearer
 * (apiAuthExigir), sem protect.php/sessao.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/config.php';
require_once __DIR__ . '/../../helpers/orcamento_pdf_render.php';
require_once __DIR__ . '/../../helpers/orcamentos_module.php';

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
garantirOrcamentosTabelas($conn);

$id = (int) ($_GET['id'] ?? 0);
$outputType = (string) ($_GET['tipo'] ?? 'orcamento');
if ($outputType === 'orcamento') {
  $outputType = 'orçamento'; // aceita sem acento na URL, template espera "orçamento"/"recibo"
}
if (!in_array($outputType, ['orçamento', 'recibo'], true)) {
  $outputType = 'orçamento';
}

$stmt = $conn->prepare("SELECT * FROM orcamentos WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
$orcamento = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$orcamento) {
  http_response_code(404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'msg' => 'Orçamento não encontrado.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$stmtItens = $conn->prepare("SELECT nome, preco, qtd, observacoes FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id");
$stmtItens->execute([$id]);
$itens = array_map(function ($i) {
  return [
    'nome' => $i['nome'],
    'preco' => (float) $i['preco'],
    'qtd' => (int) $i['qtd'],
    'obs' => $i['observacoes'] ?? '',
  ];
}, $stmtItens->fetchAll(PDO::FETCH_ASSOC));

$documentoLabel = $orcamento['cliente_tipo_documento'] === 'juridica' ? 'CNPJ' : 'CPF';

$html = orcamentoPdfRenderHtml(
  $conn,
  $lojaId,
  $outputType,
  (string) $orcamento['cliente_nome'],
  (string) ($orcamento['cliente_whatsapp'] ?? ''),
  (string) ($orcamento['cliente_endereco'] ?? ''),
  $documentoLabel,
  (string) ($orcamento['cliente_documento'] ?? ''),
  (string) $orcamento['desconto_tipo'],
  (float) $orcamento['desconto_valor'],
  $itens
);

$autoloadPath = __DIR__ . '/../../../vendor/autoload.php';
if (!file_exists($autoloadPath)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['ok' => false, 'msg' => 'Gerador de PDF indisponível.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
require_once $autoloadPath;

use Dompdf\Dompdf;

$arquivoDocumento = $outputType === 'recibo' ? 'recibo.pdf' : 'orcamento.pdf';

$dompdf = new Dompdf();
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();
$dompdf->stream($arquivoDocumento, ['Attachment' => false]);
