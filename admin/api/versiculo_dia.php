<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function limparVersiculoTexto(string $texto): string {
  $texto = preg_replace('/\s+/', ' ', trim($texto));
  $useMb = function_exists('mb_strlen');
  $texto = trim($texto, "\"'“”’‘ ");
  $cortes = [
    'Gostou?',
    'Versiculo de Ontem',
    'Versiculo de Anteontem',
    'Versiculo do Dia',
    'Versiculo do dia',
    'Versiculo de Hoje',
    'Versículo de Ontem',
    'Versículo de Anteontem',
    'Versículo do Dia',
    'Versículo do dia',
    'Versículo de Hoje'
  ];
  foreach ($cortes as $corte) {
    $pos = $useMb ? mb_stripos($texto, $corte) : stripos($texto, $corte);
    if ($pos !== false) {
      $texto = trim($useMb ? mb_substr($texto, 0, $pos) : substr($texto, 0, $pos));
    }
  }
  $texto = trim($texto, " -–—:;\"'“”’‘");
  $tamanho = $useMb ? mb_strlen($texto) : strlen($texto);
  if ($tamanho > 320) {
    $trecho = $useMb ? mb_substr($texto, 0, 320) : substr($texto, 0, 320);
    $ultimoPonto = $useMb ? mb_strrpos($trecho, '.') : strrpos($trecho, '.');
    if ($ultimoPonto !== false && $ultimoPonto > 120) {
      $trecho = $useMb ? mb_substr($trecho, 0, $ultimoPonto + 1) : substr($trecho, 0, $ultimoPonto + 1);
    }
    $texto = trim($trecho);
  }
  return $texto;
}

function versiculoInvalido(?string $texto): bool {
  if (!$texto) {
    return true;
  }
  $texto = function_exists('mb_strtolower') ? mb_strtolower($texto) : strtolower($texto);
  $tamanho = function_exists('mb_strlen') ? mb_strlen($texto) : strlen($texto);
  if ($tamanho > 360) {
    return true;
  }
  $frases = [
    'diariamente um novo versiculo',
    'diariamente um novo versículo',
    'versiculo diario',
    'versiculo diário',
    'descubra nosso versiculo diario',
    'descubra nosso versículo diário',
    'diariamente um versiculo ou passagem biblica',
    'diariamente um versículo ou passagem bíblica',
    'diariamente um versiculo ou passagem bíblica',
    'diariamente um versículo ou passagem biblica',
    'passagem biblica para melhorar e inspirar',
    'passagem bíblica para melhorar e inspirar',
    'versiculo de ontem',
    'versículo de ontem',
    'versiculo de anteontem',
    'versículo de anteontem',
    'gostou?'
  ];
  foreach ($frases as $frase) {
    if (strpos($texto, $frase) !== false) {
      return true;
    }
  }
  return false;
}

function extrairVersiculo(string $html): array {
  libxml_use_internal_errors(true);
  $dom = new DOMDocument();
  if (function_exists('mb_convert_encoding')) {
    $html = mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8');
  }
  $dom->loadHTML($html);
  $xpath = new DOMXPath($dom);

  $headingNodes = $xpath->query('//h1|//h2|//h3|//h4|//strong|//b');
  if ($headingNodes && $headingNodes->length) {
    foreach ($headingNodes as $heading) {
      $titulo = trim((string) $heading->textContent);
      if ($titulo === '') {
        continue;
      }
      $tituloLower = function_exists('mb_strtolower') ? mb_strtolower($titulo) : strtolower($titulo);
      if ((strpos($tituloLower, 'versiculo de hoje') === false && strpos($tituloLower, 'versiculo do dia') === false && strpos($tituloLower, 'versículo de hoje') === false && strpos($tituloLower, 'versículo do dia') === false)
        || strpos($tituloLower, 'ontem') !== false || strpos($tituloLower, 'anteontem') !== false) {
        continue;
      }
      $containers = [];
      $parent = $heading->parentNode;
      for ($i = 0; $i < 3 && $parent; $i++) {
        $containers[] = $parent;
        $parent = $parent->parentNode;
      }
      foreach ($containers as $container) {
        $ref = '';
        $refNode = $xpath->query(".//a[contains(@href,'/versiculo') or contains(@href,'/versiculos')][normalize-space()!=''][1]", $container);
        if ($refNode && $refNode->length) {
          $ref = trim((string) $refNode->item(0)->textContent);
        }

        $candNodes = $xpath->query(".//p[normalize-space()][1] | .//blockquote[normalize-space()][1]", $container);
        if ($candNodes && $candNodes->length) {
          $textoVerso = trim((string) $candNodes->item(0)->textContent);
          $textoVerso = limparVersiculoTexto($textoVerso);
          if ($textoVerso !== '' && !versiculoInvalido($textoVerso)) {
            if ($ref === '' && preg_match('/([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u', $textoVerso, $m)) {
              $ref = $m[1];
              $textoVerso = trim(str_replace($ref, '', $textoVerso));
              $textoVerso = limparVersiculoTexto($textoVerso);
            }
            libxml_clear_errors();
            return [$textoVerso, $ref];
          }
        }
      }
    }
  }

  $remover = $xpath->query('//script|//style|//noscript');
  if ($remover) {
    foreach ($remover as $node) {
      if ($node->parentNode) {
        $node->parentNode->removeChild($node);
      }
    }
  }
  $texto = $dom->textContent ?? '';
  libxml_clear_errors();

  $texto = preg_replace('/\s+/', ' ', $texto);
  $inicio = stripos($texto, 'Versiculo do dia');
  if ($inicio === false) {
    $inicio = stripos($texto, 'Versiculo de Hoje');
  }
  if ($inicio !== false) {
    $bloco = substr($texto, $inicio);
    $bloco = preg_replace('/Vers[ií]culo (do dia|de hoje)/i', '', $bloco);
    $bloco = preg_replace('/\b\w+,\s*\d{1,2}\s*de\s*\w+\s*de\s*\d{4}\b/u', '', $bloco);
    $bloco = trim(preg_replace('/\s+/', ' ', $bloco));
    if ($bloco !== '') {
      $referencia = '';
      $textoVerso = $bloco;
      if (preg_match('/([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u', $bloco, $matches)) {
        $referencia = $matches[1];
        $textoVerso = trim(str_replace($referencia, '', $bloco));
      }
      $textoVerso = trim($textoVerso, " -–—:;\t\n\r\0\x0B");
      return [limparVersiculoTexto($textoVerso), $referencia];
    }
  }

  $refAnchors = $xpath->query("//a[contains(@href,'/versiculo') or contains(@href,'/versiculos')][normalize-space()!='']");
  if ($refAnchors && $refAnchors->length) {
    foreach ($refAnchors as $anchor) {
      $ref = trim((string) $anchor->textContent);
      if ($ref === '' || !preg_match('/\d+:\d+/', $ref)) {
        continue;
      }
      $prevNodes = $xpath->query("preceding::p[normalize-space()][1] | preceding::blockquote[normalize-space()][1]", $anchor);
      if ($prevNodes && $prevNodes->length) {
        $textoVerso = trim((string) $prevNodes->item(0)->textContent);
        $textoVerso = limparVersiculoTexto($textoVerso);
        if ($textoVerso !== '' && !versiculoInvalido($textoVerso)) {
          libxml_clear_errors();
          return [$textoVerso, $ref];
        }
      }
    }
  }

  if (preg_match('/[“"“”\'‘’]([^“”"\']{20,320})[”"“”\'‘’]\s*([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u', $texto, $match)) {
    $verso = trim($match[1]);
    $ref = trim($match[2]);
    $verso = limparVersiculoTexto($verso);
    if ($verso !== '' && !versiculoInvalido($verso)) {
      return [$verso, $ref];
    }
  }

  $metaNodes = $xpath->query("//meta[@property='og:description' or @name='description']");
  if ($metaNodes && $metaNodes->length) {
    foreach ($metaNodes as $meta) {
      $content = trim((string) $meta->getAttribute('content'));
      if ($content !== '') {
        $content = preg_replace('/Vers[ií]culo do dia[:\s-]*/i', '', $content);
        $content = preg_replace('/\s+-\s+.*$/u', '', $content);
        $content = trim($content);
        if ($content !== '' && !versiculoInvalido($content)) {
          $ref = '';
          if (preg_match('/([1-3]?\s?[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)*\s+\d+:\d+(?:-\d+)?)/u', $content, $m)) {
            $ref = $m[1];
            $content = trim(str_replace($ref, '', $content));
          }
          libxml_clear_errors();
          return [limparVersiculoTexto($content), $ref];
        }
      }
    }
  }

  return [null, null];
}

// O versiculo nunca e gravado no banco — busca direto na fonte a cada
// chamada, entao o dia seguinte ja mostra outro automaticamente (o proprio
// site de origem muda o versiculo por dia, sem precisarmos guardar nada).
$hoje = date('Y-m-d');
$fonteUrl = 'https://www.bibliaon.com/versiculo_do_dia/';
$temReacoes = tabelaExiste($conn, 'versiculo_reacoes');
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

$context = stream_context_create([
  'http' => [
    'timeout' => 6,
    'user_agent' => 'Mozilla/5.0 (compatible; DiggyDashboard/1.0)'
  ]
]);
$html = @file_get_contents($fonteUrl, false, $context);
if (!$html && function_exists('curl_init')) {
  $ch = curl_init($fonteUrl);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 6);
  curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; DiggyDashboard/1.0)');
  $html = curl_exec($ch);
  curl_close($ch);
}

if (!$html) {
  echo json_encode(['ok' => false, 'msg' => 'Sem conexao para atualizar.']);
  exit;
}

[$textoVerso, $referencia] = extrairVersiculo($html);
if (!$textoVerso || versiculoInvalido($textoVerso)) {
  echo json_encode(['ok' => false, 'msg' => 'Nao foi possivel obter o versiculo.']);
  exit;
}

$reacaoAtual = null;
if ($temReacoes && $adminId > 0) {
  $stmt = $conn->prepare("SELECT reacao FROM versiculo_reacoes WHERE admin_id = ? AND data_versiculo = ? LIMIT 1");
  $stmt->execute([$adminId, $hoje]);
  $reacaoAtual = $stmt->fetchColumn() ?: null;
}

echo json_encode([
  'ok' => true,
  'texto' => $textoVerso,
  'referencia' => $referencia,
  'data' => $hoje,
  'reacao' => $reacaoAtual,
  'fonte_url' => $fonteUrl
]);
