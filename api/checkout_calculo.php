<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../admin/helpers/config.php';
require_once __DIR__ . '/../helpers/loja_context.php';

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

function fetchJson(string $url): ?array {
  $context = stream_context_create([
    'http' => [
      'timeout' => 6
    ]
  ]);
  $raw = @file_get_contents($url, false, $context);
  if ($raw === false) {
    return null;
  }
  $json = json_decode($raw, true);
  return is_array($json) ? $json : null;
}

function obterCepBrasilApi(string $cep): ?array {
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
    'bairro' => $resp['neighborhood'] ?? ''
  ];
}

function obterCepAwesomeApi(string $cep): ?array {
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
    'bairro' => $resp['district'] ?? ''
  ];
}

function obterCepCoordenadas(string $cep): ?array {
  $coords = obterCepBrasilApi($cep);
  if ($coords) return $coords;
  return obterCepAwesomeApi($cep);
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

$lojaId = definirLojaIdSessao($conn);

$subtotal = (float) ($_POST['subtotal'] ?? 0);
$tipo = $_POST['tipo'] ?? 'entrega';
$cep = preg_replace('/\D/', '', (string) ($_POST['cep'] ?? ''));
$bairro = trim((string) ($_POST['bairro'] ?? ''));
$distanciaKm = (float) ($_POST['distancia_km'] ?? 0);

$taxaPadrao = (float) config($conn, 'taxa_entrega', 0);
$taxaTipo = (string) config($conn, 'taxa_entrega_tipo', 'fixa');
$taxaGratisAtivo = config($conn, 'taxa_entrega_gratis', '0') === '1';
$pedidoMinimo = (float) config($conn, 'pedido_minimo', 0);

$taxa = 0;
$bairroCalculado = $bairro;
$distanciaCalculada = $distanciaKm;
$distanciaFoiCalculada = false;

if ($tipo === 'entrega') {
  if ($taxaTipo === 'sem') {
    $taxa = 0;
  } elseif ($taxaTipo === 'fixa') {
    $taxa = $taxaPadrao;
  } elseif ($taxaTipo === 'bairro') {
    if ($bairroCalculado === '' && strlen($cep) === 8) {
      $destino = obterCepCoordenadas($cep);
      if ($destino && !empty($destino['bairro'])) {
        $bairroCalculado = $destino['bairro'];
      }
    }
    $mapa = [];
    $raw = config($conn, 'taxas_bairro', '');
    if ($raw) {
      $decoded = json_decode((string) $raw, true);
      if (is_array($decoded)) $mapa = $decoded;
    }
    if ($bairroCalculado !== '') {
      $alvo = normalizarTexto($bairroCalculado);
      foreach ($mapa as $nome => $valor) {
        if (normalizarTexto((string) $nome) === $alvo) {
          $taxa = (float) $valor;
          break;
        }
      }
    }
  } elseif ($taxaTipo === 'dinamica' || $taxaTipo === 'area') {
    if ($distanciaCalculada <= 0 && strlen($cep) === 8) {
      $lojaCep = preg_replace('/\D/', '', (string) config($conn, 'loja_cep', ''));
      if (strlen($lojaCep) === 8) {
        $origem = obterCepCoordenadas($lojaCep);
        $destino = obterCepCoordenadas($cep);
        if ($origem && $destino) {
          $distanciaRota = calcularDistanciaRotaKm(
            $origem['lat'],
            $origem['lng'],
            $destino['lat'],
            $destino['lng']
          );
          $fatorCorrecaoRota = 2.0;
          if ($distanciaRota !== null) {
            $distanciaRota = $distanciaRota * $fatorCorrecaoRota;
          }
          $distanciaCalculada = $distanciaRota ?? calcularDistanciaKm(
            $origem['lat'],
            $origem['lng'],
            $destino['lat'],
            $destino['lng']
          );
          $distanciaFoiCalculada = true;
        }
      }
    }
    if (($distanciaCalculada > 0 || $distanciaFoiCalculada || strlen($cep) === 8)
      && tabelaExiste($conn, 'taxas_dinamicas')
    ) {
      $colsDyn = $conn->query("SHOW COLUMNS FROM taxas_dinamicas")->fetchAll(PDO::FETCH_COLUMN, 0);
      $temLojaDyn = in_array('loja_id', $colsDyn, true);
      if ($temLojaDyn) {
        $stmt = $conn->prepare("SELECT distancia_km, valor, tipo FROM taxas_dinamicas WHERE loja_id = ? ORDER BY distancia_km");
        $stmt->execute([$lojaId]);
        $regras = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } else {
        $stmt = $conn->query("SELECT distancia_km, valor, tipo FROM taxas_dinamicas ORDER BY distancia_km");
        $regras = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
      }
      $taxa = 0;
      foreach ($regras as $regra) {
        if ($distanciaCalculada > 0 && $distanciaCalculada <= (float) $regra['distancia_km']) {
          $taxa = (float) $regra['valor'];
          if (($regra['tipo'] ?? 'fixa') === 'por_km') {
            $kmBase = max($distanciaCalculada, 1);
            $taxa = $taxa * $kmBase;
          }
          break;
        }
      }
      if ($taxa === 0 && $regras && $distanciaCalculada > 0) {
        $ultima = end($regras);
        $taxa = (float) ($ultima['valor'] ?? 0);
        if (($ultima['tipo'] ?? 'fixa') === 'por_km') {
          $kmBase = max($distanciaCalculada, 1);
          $taxa = $taxa * $kmBase;
        }
      }
    }
  }
}

if ($taxaGratisAtivo && $pedidoMinimo > 0 && $subtotal >= $pedidoMinimo) {
  $taxa = 0;
}

$total = $subtotal + $taxa;

echo json_encode([
  'subtotal' => $subtotal,
  'taxa_entrega' => $taxa,
  'pedido_minimo' => $pedidoMinimo,
  'total' => $total,
  'atinge_minimo' => $subtotal >= $pedidoMinimo,
  'taxa_tipo' => $taxaTipo,
  'bairro' => $bairroCalculado,
  'distancia_km' => $distanciaCalculada
]);
