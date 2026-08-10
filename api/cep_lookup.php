<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../admin/helpers/config.php';
require_once __DIR__ . '/../helpers/loja_context.php';

header('Content-Type: application/json');

function httpGet(string $url): ?string {
  if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt_array($ch, [
      CURLOPT_URL => $url,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 6,
      CURLOPT_FOLLOWLOCATION => true
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false || $err) {
      return null;
    }
    return $resp;
  }
  $context = stream_context_create([
    'http' => [
      'timeout' => 6
    ]
  ]);
  $raw = @file_get_contents($url, false, $context);
  return $raw === false ? null : $raw;
}

function fetchJson(string $url): ?array {
  $raw = httpGet($url);
  if ($raw === null) return null;
  $json = json_decode($raw, true);
  return is_array($json) ? $json : null;
}

function obterCoordsBrasilApi(string $cep): ?array {
  $resp = fetchJson("https://brasilapi.com.br/api/cep/v2/{$cep}");
  if (!$resp || empty($resp['location']['coordinates'])) {
    return null;
  }
  $coords = $resp['location']['coordinates'];
  $lat = isset($coords['latitude']) ? (float) $coords['latitude'] : null;
  $lng = isset($coords['longitude']) ? (float) $coords['longitude'] : null;
  if ($lat === null || $lng === null) return null;
  return [
    'lat' => $lat,
    'lng' => $lng,
    'logradouro' => $resp['street'] ?? '',
    'bairro' => $resp['neighborhood'] ?? '',
    'cidade' => $resp['city'] ?? '',
    'estado' => $resp['state'] ?? ''
  ];
}

function obterCoordsAwesomeApi(string $cep): ?array {
  $resp = fetchJson("https://cep.awesomeapi.com.br/json/{$cep}");
  if (!$resp) {
    return null;
  }
  $lat = isset($resp['lat']) ? (float) $resp['lat'] : null;
  $lng = isset($resp['lng']) ? (float) $resp['lng'] : null;
  if ($lat === null || $lng === null) return null;
  return [
    'lat' => $lat,
    'lng' => $lng,
    'logradouro' => $resp['address'] ?? '',
    'bairro' => $resp['district'] ?? '',
    'cidade' => $resp['city'] ?? '',
    'estado' => $resp['state'] ?? ''
  ];
}

function obterCoordsPorCep(string $cep): ?array {
  $coords = obterCoordsBrasilApi($cep);
  if ($coords) return $coords;
  return obterCoordsAwesomeApi($cep);
}

function calcularDistanciaKm(float $lat1, float $lon1, float $lat2, float $lon2): float {
  $raio = 6371;
  $dLat = deg2rad($lat2 - $lat1);
  $dLon = deg2rad($lon2 - $lon1);
  $a = sin($dLat / 2) * sin($dLat / 2)
     + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
     * sin($dLon / 2) * sin($dLon / 2);
  $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
  return $raio * $c;
}

function normalizarTexto(string $texto): string {
  $lower = function_exists('mb_strtolower')
    ? mb_strtolower($texto, 'UTF-8')
    : strtolower($texto);
  $texto = trim($lower);
  $trans = @iconv('UTF-8', 'ASCII//TRANSLIT', $texto);
  if ($trans !== false) {
    $texto = $trans;
  }
  return preg_replace('/\s+/', ' ', $texto);
}

function calcularDistanciaRotaKm(float $lat1, float $lon1, float $lat2, float $lon2): ?float {
  $url = sprintf(
    'https://router.project-osrm.org/route/v1/driving/%F,%F;%F,%F?overview=false&alternatives=false',
    $lon1,
    $lat1,
    $lon2,
    $lat2
  );
  $resp = fetchJson($url);
  if (!$resp || empty($resp['routes'][0]['distance'])) {
    return null;
  }
  $metros = (float) $resp['routes'][0]['distance'];
  if ($metros <= 0) return null;
  return $metros / 1000;
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function calcularTaxaDinamica(PDO $conn, float $distancia, bool $porKm = false, int $lojaId = 0): float {
  if (!tabelaExiste($conn, 'taxas_dinamicas')) {
    return 0.0;
  }
  $cols = $conn->query("SHOW COLUMNS FROM taxas_dinamicas")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLoja = in_array('loja_id', $cols, true);
  if ($temLoja) {
    $stmt = $conn->prepare("SELECT distancia_km, valor, tipo FROM taxas_dinamicas WHERE loja_id = ? ORDER BY distancia_km");
    $stmt->execute([$lojaId]);
    $regras = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $stmt = $conn->query("SELECT distancia_km, valor, tipo FROM taxas_dinamicas ORDER BY distancia_km");
    $regras = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  }
  if (!$regras) return 0.0;
  if ($distancia <= 0) {
    return 0.0;
  }
  $regra = null;
  foreach ($regras as $item) {
    if ($distancia <= (float) $item['distancia_km']) {
      $regra = $item;
      break;
    }
  }
  if (!$regra) {
    $regra = end($regras);
  }
  if (!$regra) return 0.0;
  $valor = (float) ($regra['valor'] ?? 0);
  if ($porKm && ($regra['tipo'] ?? 'fixa') === 'por_km') {
    $valor = $valor * $distancia;
  }
  return $valor < 0 ? 0.0 : $valor;
}

$lojaId = definirLojaIdSessao($conn);

$cep = preg_replace('/\D/', '', (string) ($_GET['cep'] ?? $_POST['cep'] ?? ''));
if (strlen($cep) !== 8) {
  echo json_encode(['ok' => false, 'msg' => 'CEP invalido.']);
  exit;
}

$lojaCep = preg_replace('/\D/', '', (string) config($conn, 'loja_cep', ''));
if (strlen($lojaCep) !== 8) {
  echo json_encode(['ok' => false, 'msg' => 'CEP da loja nao configurado.']);
  exit;
}

$origem = obterCoordsPorCep($lojaCep);
$destino = obterCoordsPorCep($cep);

if (!$origem || !$destino) {
  echo json_encode(['ok' => false, 'msg' => 'Nao foi possivel localizar o CEP.']);
  exit;
}

if (empty($destino['bairro']) || empty($destino['cidade']) || empty($destino['logradouro'])) {
  $via = fetchJson("https://viacep.com.br/ws/{$cep}/json/");
  if (is_array($via) && empty($via['erro'])) {
    if (empty($destino['logradouro']) && !empty($via['logradouro'])) {
      $destino['logradouro'] = $via['logradouro'];
    }
    if (empty($destino['bairro']) && !empty($via['bairro'])) {
      $destino['bairro'] = $via['bairro'];
    }
    if (empty($destino['cidade']) && !empty($via['localidade'])) {
      $destino['cidade'] = $via['localidade'];
    }
    if (empty($destino['estado']) && !empty($via['uf'])) {
      $destino['estado'] = $via['uf'];
    }
  }
}

$distanciaRota = calcularDistanciaRotaKm($origem['lat'], $origem['lng'], $destino['lat'], $destino['lng']);
$fatorCorrecaoRota = 2.0;
if ($distanciaRota !== null) {
  $distanciaRota = $distanciaRota * $fatorCorrecaoRota;
}
$distancia = $distanciaRota ?? calcularDistanciaKm($origem['lat'], $origem['lng'], $destino['lat'], $destino['lng']);
$taxaEntrega = 0.0;
$tipoTaxa = (string) config($conn, 'taxa_entrega_tipo', 'fixa');
if ($tipoTaxa === 'bairro' && tabelaExiste($conn, 'taxas_bairro') && !empty($destino['bairro'])) {
  $cols = $conn->query("SHOW COLUMNS FROM taxas_bairro")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLoja = in_array('loja_id', $cols, true);
  if ($temLoja) {
    $stmt = $conn->prepare("SELECT bairro, taxa FROM taxas_bairro WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
    $lista = $stmt->fetchAll(PDO::FETCH_ASSOC);
  } else {
    $stmt = $conn->query("SELECT bairro, taxa FROM taxas_bairro");
    $lista = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  }
  $bairroAlvo = normalizarTexto($destino['bairro']);
  foreach ($lista as $row) {
    if (normalizarTexto((string) ($row['bairro'] ?? '')) === $bairroAlvo) {
      $taxaEntrega = (float) ($row['taxa'] ?? 0);
      break;
    }
  }
} elseif (in_array($tipoTaxa, ['dinamica', 'area'], true) && tabelaExiste($conn, 'taxas_dinamicas')) {
  $colsDyn = $conn->query("SHOW COLUMNS FROM taxas_dinamicas")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temLojaDyn = in_array('loja_id', $colsDyn, true);
  if ($temLojaDyn) {
    $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM taxas_dinamicas WHERE loja_id = ?");
    $stmtCheck->execute([$lojaId]);
    $temDinamica = (int) $stmtCheck->fetchColumn() > 0;
  } else {
    $stmtCheck = $conn->query("SELECT COUNT(*) FROM taxas_dinamicas");
    $temDinamica = $stmtCheck ? (int) $stmtCheck->fetchColumn() > 0 : false;
  }
  if ($temDinamica) {
    $taxaEntrega = calcularTaxaDinamica($conn, $distancia, $tipoTaxa === 'area', $lojaId);
  }
}

echo json_encode([
  'ok' => true,
  'cep' => substr($cep, 0, 5) . '-' . substr($cep, 5),
  'logradouro' => $destino['logradouro'],
  'bairro' => $destino['bairro'],
  'cidade' => $destino['cidade'],
  'estado' => $destino['estado'],
  'distancia_km' => round($distancia, 2),
  'taxa_entrega' => $taxaEntrega
]);
