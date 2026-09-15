<?php
/*
 * HTML/CSS do PDF de orcamento/recibo, extraido de admin/api/orcamento_pdf.php
 * pra ser reaproveitado tambem pelo endpoint novo admin/api/v1/orcamentos_pdf.php
 * (que gera o PDF a partir de um orcamento salvo no banco, em vez dos dados
 * efemeros do POST do form legado). Uma funcao so, sem duplicar o template.
 */

function orcamentoPdfImagemParaDataUri(string $path): string {
  $path = trim($path);
  if ($path === '') {
    return '';
  }
  if (strpos($path, 'data:image') === 0) {
    return $path;
  }
  $data = null;
  $mime = null;
  if (preg_match('/^https?:\\/\\//i', $path)) {
    $data = @file_get_contents($path);
    if ($data === false) {
      $ch = curl_init($path);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 6,
      ]);
      $data = curl_exec($ch);
      curl_close($ch);
    }
    $mime = 'image/jpeg';
  } else {
    $path = ltrim($path, '/');
    $candidatos = [
      __DIR__ . '/../../' . $path,
      __DIR__ . '/../' . $path,
      __DIR__ . '/../../public/' . $path,
    ];
    if (strpos($path, 'assets/') === 0) {
      $candidatos[] = __DIR__ . '/../' . $path;
    }
    if (!empty($_SERVER['DOCUMENT_ROOT'])) {
      $candidatos[] = rtrim($_SERVER['DOCUMENT_ROOT'], '/\\') . '/' . $path;
    }
    foreach ($candidatos as $cand) {
      $full = realpath($cand);
      if ($full && is_file($full)) {
        $data = @file_get_contents($full);
        $mime = mime_content_type($full) ?: 'image/jpeg';
        break;
      }
      if (is_file($cand)) {
        $data = @file_get_contents($cand);
        $mime = mime_content_type($cand) ?: 'image/jpeg';
        if ($data) {
          break;
        }
      }
    }
  }
  if (!$data) {
    return '';
  }
  $base64 = base64_encode($data);
  return "data:$mime;base64,$base64";
}

/**
 * Monta o HTML completo do PDF (orcamento ou recibo). $itens: lista de
 * ['nome' => string, 'obs' => string, 'qtd' => int, 'preco' => float].
 */
function orcamentoPdfRenderHtml(
  PDO $conn,
  int $lojaId,
  string $outputType,
  string $clienteNome,
  string $clienteWhatsapp,
  string $clienteEndereco,
  string $clienteDocumentoLabel,
  string $clienteDocumentoValor,
  string $descontoTipo,
  float $descontoValor,
  array $itens
): string {
  // $lojaId sempre explicito (nunca deixar o config() cair no fallback
  // $_SESSION['loja_id']) — o endpoint novo (admin/api/v1/orcamentos_pdf.php)
  // autentica por Bearer token, sem sessao PHP, entao o fallback sempre
  // resolvia pra loja_id=1 e mostrava os dados da loja errada no PDF.
  $lojaNome = config($conn, 'nome_loja', 'T&W Confeitaria', $lojaId);
  $lojaContato = config($conn, 'loja_contato', '', $lojaId);
  $lojaLogo = config($conn, 'loja_perfil', '', $lojaId);
  $lojaCapa = config($conn, 'loja_capa', '', $lojaId);
  $lojaRua = config($conn, 'loja_rua', '', $lojaId);
  $lojaNumero = config($conn, 'loja_numero', '', $lojaId);
  $lojaBairro = config($conn, 'loja_bairro', '', $lojaId);
  $lojaCidade = config($conn, 'loja_cidade', '', $lojaId);
  $lojaEstado = config($conn, 'loja_estado', '', $lojaId);
  $lojaCep = config($conn, 'loja_cep', '', $lojaId);

  $enderecoLoja = trim(sprintf(
    '%s, %s - %s, %s/%s - CEP: %s',
    $lojaRua,
    $lojaNumero,
    $lojaBairro,
    $lojaCidade,
    $lojaEstado,
    $lojaCep
  ));

  $total = 0;
  $linhas = '';
  foreach ($itens as $item) {
    $nome = htmlspecialchars((string) ($item['nome'] ?? ''), ENT_QUOTES, 'UTF-8');
    $obs = trim((string) ($item['obs'] ?? ''));
    $obsHtml = $obs !== '' ? "<br><span style='color:#64748b;font-size:10px;'>".htmlspecialchars($obs, ENT_QUOTES, 'UTF-8')."</span>" : '';
    $qtd = (int) ($item['qtd'] ?? 0);
    $preco = (float) ($item['preco'] ?? 0);
    if ($qtd <= 0) {
      continue;
    }
    $subtotal = $preco * $qtd;
    $total += $subtotal;
    $linhas .= "
      <tr>
        <td>{$nome}{$obsHtml}</td>
        <td style='text-align:center'>{$qtd}</td>
        <td style='text-align:right'>R$ ".number_format($preco, 2, ',', '.')."</td>
        <td style='text-align:right'>R$ ".number_format($subtotal, 2, ',', '.')."</td>
      </tr>
    ";
  }

  date_default_timezone_set('America/Fortaleza');
  $dataHoje = date('d/m/Y \a\s H:i');

  $logoSrc = $lojaLogo ? orcamentoPdfImagemParaDataUri($lojaLogo) : '';
  $capaSrc = $lojaCapa ? orcamentoPdfImagemParaDataUri($lojaCapa) : '';

  $logoHtml = '';
  if ($logoSrc) {
    $logoEsc = htmlspecialchars($logoSrc, ENT_QUOTES, 'UTF-8');
    $logoHtml = "<img src='{$logoEsc}' style='width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid #e2e8f0;' alt='Logo'>";
  }

  $capaHtml = '';
  if ($capaSrc) {
    $capaEsc = htmlspecialchars($capaSrc, ENT_QUOTES, 'UTF-8');
    $logoOverlay = '';
    if ($logoHtml) {
      $logoOverlay = "<div class='capa-logo'>{$logoHtml}</div>";
    }
    $capaHtml = "
      <div class='capa-wrap'>
        <img src='{$capaEsc}' class='capa-img' alt='Capa'>
        {$logoOverlay}
      </div>
    ";
  }

  $tituloDocumento = $outputType === 'recibo' ? 'Recibo' : 'Orçamento';
  $isRecibo = $outputType === 'recibo';

  $blocoItens = "
    <div class='box'>
      <strong>Itens do {$tituloDocumento}</strong>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th style='text-align:center'>Qtd</th>
            <th style='text-align:right'>Valor</th>
            <th style='text-align:right'>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {$linhas}
        </tbody>
      </table>
      ".($descontoValor > 0 ? "<div style='margin-top:6px;text-align:right;color:#475569;'>Desconto: ".(
        $descontoTipo === 'percent'
          ? number_format($descontoValor, 2, ',', '.')."%"
          : "R$ ".number_format($descontoValor, 2, ',', '.')
      )."</div>" : "")."
      <div class='total'>Total: R$ ".number_format(max(0, $total - $descontoValor), 2, ',', '.')."</div>
    </div>
  ";

  $blocoCliente = "
    <div class='box'>
      <strong>Cliente</strong><br>
      ".htmlspecialchars($clienteNome, ENT_QUOTES, 'UTF-8')."<br>
      ".($clienteDocumentoValor !== '' ? htmlspecialchars($clienteDocumentoLabel, ENT_QUOTES, 'UTF-8').": ".htmlspecialchars($clienteDocumentoValor, ENT_QUOTES, 'UTF-8')."<br>" : '')."
      ".htmlspecialchars($clienteWhatsapp, ENT_QUOTES, 'UTF-8')."<br>
      ".htmlspecialchars($clienteEndereco, ENT_QUOTES, 'UTF-8')."
    </div>
  ";

  $blocoAssinatura = "
    <div class='signature-date'>Data da assinatura: ____/____/________</div>
    <div class='signature-grid'>
      <div class='signature-wrap'>
        <div class='signature-line'></div>
        <div class='signature-label'>Assinatura do responsavel</div>
      </div>
      <div class='signature-wrap'>
        <div class='signature-line'></div>
        <div class='signature-label'>Assinatura do cliente</div>
      </div>
    </div>
  ";

  $blocoRecibo = "
    <div class='receipt-card'>
      <div class='receipt-head'>
        <div>
          <div class='receipt-kicker'>Comprovante de atendimento</div>
          <div class='receipt-name'>".htmlspecialchars($clienteNome, ENT_QUOTES, 'UTF-8')."</div>
        </div>
        <div class='receipt-issued'>{$dataHoje}</div>
      </div>
      <div class='receipt-meta'>
        ".($clienteDocumentoValor !== '' ? "<div><strong>".htmlspecialchars($clienteDocumentoLabel, ENT_QUOTES, 'UTF-8').":</strong> ".htmlspecialchars($clienteDocumentoValor, ENT_QUOTES, 'UTF-8')."</div>" : "")."
        <div><strong>WhatsApp:</strong> ".htmlspecialchars($clienteWhatsapp, ENT_QUOTES, 'UTF-8')."</div>
        <div><strong>Endereco:</strong> ".htmlspecialchars($clienteEndereco, ENT_QUOTES, 'UTF-8')."</div>
      </div>
      <table class='receipt-table'>
        <thead>
          <tr>
            <th>Descricao</th>
            <th style='text-align:center'>Qtd</th>
            <th style='text-align:right'>Valor</th>
          </tr>
        </thead>
        <tbody>
          {$linhas}
        </tbody>
      </table>
      ".($descontoValor > 0 ? "<div class='receipt-line'><span>Desconto</span><strong>".(
        $descontoTipo === 'percent'
          ? number_format($descontoValor, 2, ',', '.')."%"
          : "R$ ".number_format($descontoValor, 2, ',', '.')
      )."</strong></div>" : "")."
      <div class='receipt-total'>
        <span>Total recebido</span>
        <strong>R$ ".number_format(max(0, $total - $descontoValor), 2, ',', '.')."</strong>
      </div>
      {$blocoAssinatura}
    </div>
  ";

  // No orcamento (nao-recibo), quando ha capa configurada ela ja mostra a
  // logo sobreposta (capa-logo) — repetir no cabecalho duplicava a mesma
  // logo duas vezes seguidas. So mostra a logo isolada no cabecalho quando
  // nao ha capa pra sobrepor.
  $logoHeaderHtml = $isRecibo
    ? ($logoHtml !== '' ? "<div class='receipt-logo-wrap'>{$logoHtml}</div>" : '')
    : ($capaHtml === '' ? $logoHtml : '');
  $capaTopoHtml = $isRecibo ? '' : $capaHtml;
  $classeBody = $isRecibo ? 'receipt-body' : 'budget-body';
  $headerTituloHtml = $isRecibo ? '' : "<div class='title'>{$tituloDocumento}</div>";
  $headerSubtitleHtml = $isRecibo
    ? "<div class='subtitle receipt-subtitle'>Emitido em {$dataHoje}</div>"
    : "<div class='subtitle'>Emitido em {$dataHoje}</div>";
  $blocoLoja = $isRecibo
    ? "
    <div class='receipt-store'>
      <div class='receipt-store-name'>".htmlspecialchars($lojaNome, ENT_QUOTES, 'UTF-8')."</div>
      <div>".htmlspecialchars($lojaContato, ENT_QUOTES, 'UTF-8')."</div>
      <div>".htmlspecialchars($enderecoLoja, ENT_QUOTES, 'UTF-8')."</div>
    </div>
  "
    : "
    <div class='box'>
      <strong>Loja</strong><br>
      ".htmlspecialchars($lojaNome, ENT_QUOTES, 'UTF-8')."<br>
      ".htmlspecialchars($lojaContato, ENT_QUOTES, 'UTF-8')."<br>
      ".htmlspecialchars($enderecoLoja, ENT_QUOTES, 'UTF-8')."
    </div>
  ";

  return "
<!DOCTYPE html>
<html lang='pt-BR'>
<head>
  <meta charset='UTF-8'>
  <style>
    body{font-family:DejaVu Sans, sans-serif; color:#0f172a; font-size:12px;}
    .receipt-body{font-size:11.5px; padding:10px 0;}
    .receipt-container{width:100%; max-width:560px; margin:0 auto;}
    .capa-wrap{position:relative; width:100%; height:140px; margin-bottom:14px;}
    .capa-img{width:100%; height:100%; object-fit:cover; border-radius:12px; border:1px solid #e2e8f0;}
    .capa-logo{position:absolute; left:16px; bottom:-18px; background:#fff; padding:6px; border-radius:14px; border:1px solid #e2e8f0;}
    .capa-logo img{width:64px; height:64px;}
    .header{margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; gap:12px;}
    .brand{display:flex; align-items:center; gap:12px;}
    .title{font-size:18px; font-weight:700; margin:0;}
    .subtitle{color:#64748b; margin:4px 0 0;}
    .box{border:1px solid #e2e8f0; border-radius:10px; padding:10px; margin-bottom:12px;}
    table{width:100%; border-collapse:collapse; margin-top:8px;}
    th,td{padding:8px; border-bottom:1px solid #e2e8f0;}
    th{text-align:left; background:#f8fafc; font-size:11px; text-transform:uppercase; color:#64748b;}
    .total{font-size:14px; font-weight:700; text-align:right; margin-top:8px;}
    .receipt-logo-wrap{display:flex; align-items:center;}
    .receipt-logo-wrap img{width:54px !important; height:54px !important; border-radius:10px !important;}
    .receipt-store{margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e2e8f0; color:#475569;}
    .receipt-store-name{font-size:15px; font-weight:700; color:#0f172a; margin-bottom:4px;}
    .receipt-card{border:1px solid #dbe3ef; border-radius:14px; padding:14px; background:#fff;}
    .receipt-head{display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px;}
    .receipt-kicker{font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; margin-bottom:4px;}
    .receipt-name{font-size:17px; font-weight:700; color:#111827;}
    .receipt-issued{font-size:10.5px; color:#64748b; text-align:right;}
    .receipt-subtitle{font-size:11px; text-align:center; margin:0;}
    .receipt-meta{padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; color:#475569; line-height:1.55; margin-bottom:12px;}
    .receipt-table{width:100%; border-collapse:collapse; margin-top:0;}
    .receipt-table th,.receipt-table td{padding:7px 4px; border-bottom:1px solid #edf2f7;}
    .receipt-table th{background:transparent; font-size:10px; color:#94a3b8;}
    .receipt-table td:first-child{padding-right:10px;}
    .receipt-line{display:flex; justify-content:space-between; gap:12px; margin-top:10px; color:#475569;}
    .receipt-total{display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding:12px 14px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc;}
    .receipt-total span{font-size:12px; font-weight:700; color:#0f172a;}
    .receipt-total strong{font-size:19px; color:#0f172a;}
    .signature-date{margin-top:26px; margin-bottom:18px; font-size:11px; color:#475569;}
    .signature-grid{width:100%; font-size:0; white-space:nowrap;}
    .signature-wrap{display:inline-block; width:48%; padding-top:8px; text-align:center; vertical-align:top; font-size:12px;}
    .signature-wrap + .signature-wrap{margin-left:4%;}
    .signature-line{width:200px; max-width:82%; margin:0 auto 8px; border-top:1px solid #0f172a;}
    .signature-label{font-size:10.5px; color:#64748b;}
  </style>
</head>
<body class='{$classeBody}'>
  <div class='".($isRecibo ? "receipt-container" : "")."'>
    {$capaTopoHtml}
    <div class='header'>
      <div class='brand'>
        {$logoHeaderHtml}
        <div>
          {$headerTituloHtml}
          {$headerSubtitleHtml}
        </div>
      </div>
    </div>

    {$blocoLoja}

    ".($outputType === 'recibo' ? $blocoRecibo : $blocoCliente . $blocoItens . $blocoAssinatura)."
  </div>
</body>
</html>
";
}
