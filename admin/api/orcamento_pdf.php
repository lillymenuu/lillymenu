<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../helpers/orcamento_pdf_render.php';
require_once __DIR__ . '/../protect.php';

$autoloadPath = __DIR__ . '/../../vendor/autoload.php';
$temDompdf = file_exists($autoloadPath);
if ($temDompdf) {
  require_once $autoloadPath;
}

use Dompdf\Dompdf;

$clienteNome = trim((string) ($_POST['cliente_nome'] ?? ''));
$clienteWhatsapp = trim((string) ($_POST['cliente_whatsapp'] ?? ''));
$clienteEndereco = trim((string) ($_POST['cliente_endereco'] ?? ''));
$clienteDocumentoLabel = trim((string) ($_POST['cliente_documento_label'] ?? ''));
$clienteDocumentoValor = trim((string) ($_POST['cliente_documento_valor'] ?? ''));
$outputType = trim((string) ($_POST['output_type'] ?? 'orçamento'));
$descontoTipo = (string) ($_POST['desconto_tipo'] ?? 'valor');
$descontoValor = (float) ($_POST['desconto_valor'] ?? 0);
$itensJson = (string) ($_POST['itens_json'] ?? '[]');

$itens = json_decode($itensJson, true);
if (!is_array($itens)) {
  $itens = [];
}

$html = orcamentoPdfRenderHtml(
  $conn,
  (int) ($_SESSION['loja_id'] ?? 1),
  $outputType,
  $clienteNome,
  $clienteWhatsapp,
  $clienteEndereco,
  $clienteDocumentoLabel,
  $clienteDocumentoValor,
  $descontoTipo,
  $descontoValor,
  $itens
);

$arquivoDocumento = $outputType === 'recibo' ? 'recibo.pdf' : 'orçamento.pdf';

if ($temDompdf) {
  $dompdf = new Dompdf();
  $dompdf->loadHtml($html);
  $dompdf->setPaper('A4', 'portrait');
  $dompdf->render();
  $dompdf->stream($arquivoDocumento, ['Attachment' => false]);
  exit;
}

// fallback: abre em documento em branco para evitar cabecalho com localhost
$htmlJson = json_encode($html, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
echo "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Orçamento</title></head><body>";
echo "<script>
  const conteudo = {$htmlJson};
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(conteudo);
    win.document.close();
    setTimeout(() => { try { win.focus(); win.print(); } catch(e) {} }, 300);
  } else {
    document.write(conteudo);
    window.print();
  }
</script>";
echo "</body></html>";
exit;
