<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/config.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$subtotal = (float) ($_POST['subtotal'] ?? 0);
$tipo     = $_POST['tipo'] ?? 'retirada';
$distanciaKm = (float) ($_POST['distancia_km'] ?? 0);
$cupom    = strtoupper(trim($_POST['cupom'] ?? ''));

/* TAXA */
$taxaPadrao = (float) config($conn, 'taxa_entrega', 0);
$taxaTipo = config($conn, 'taxa_entrega_tipo', 'dinamica');
$taxaGratisAtivo = config($conn, 'taxa_entrega_gratis', '0') === '1';
$pedidoMinimo = (float) config($conn, 'pedido_minimo', 0);
$taxa = 0;

if ($tipo === 'entrega') {
  if ($taxaTipo === 'fixa') {
    $taxa = $taxaPadrao;
  } elseif ($taxaTipo === 'bairro') {
    $bairro = '';
    if (!empty($_POST['endereco']) && preg_match('/Bairro:\\s*([^|]+)/i', (string) $_POST['endereco'], $m)) {
      $bairro = trim($m[1]);
    }
    $mapa = [];
    $raw = config($conn, 'taxas_bairro', '');
    if ($raw) {
      $decoded = json_decode((string) $raw, true);
      if (is_array($decoded)) $mapa = $decoded;
    }
    if ($bairro !== '') {
      foreach ($mapa as $nome => $valor) {
        if (strcasecmp($nome, $bairro) === 0) {
          $taxa = (float) $valor;
          break;
        }
      }
    }
  } elseif ($taxaTipo === 'dinamica' || $taxaTipo === 'area') {
    if (tabelaExiste($conn, 'taxas_dinamicas')) {
      $stmt = $conn->prepare("SELECT distancia_km, valor, tipo FROM taxas_dinamicas WHERE loja_id = ? ORDER BY distancia_km");
      $stmt->execute([$lojaId]);
      $regras = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
      $taxa = 0;
      if ($distanciaKm <= 0) {
        $distanciaKm = 0;
      }
      foreach ($regras as $regra) {
        if ($distanciaKm > 0 && $distanciaKm <= (float) $regra['distancia_km']) {
          $taxa = (float) $regra['valor'];
          if ($taxaTipo === 'area' && ($regra['tipo'] ?? 'fixa') === 'por_km') {
            $taxa = $taxa * $distanciaKm;
          }
          break;
        }
      }
      if ($taxa === 0 && $regras && $distanciaKm > 0) {
        $ultima = end($regras);
        $taxa = (float) ($ultima['valor'] ?? 0);
        if ($taxaTipo === 'area' && ($ultima['tipo'] ?? 'fixa') === 'por_km') {
          $taxa = $taxa * $distanciaKm;
        }
      }
    }
  }
}

if ($taxaGratisAtivo && $pedidoMinimo > 0 && $subtotal >= $pedidoMinimo) {
  $taxa = 0;
}

/* CUPOM (SIMPLES) */
$desconto = 0;

/*
Exemplo simples:
DESCONTO10 = 10%
DESCONTO5  = R$ 5,00
*/
if ($cupom === 'DESCONTO10') {
  $desconto = $subtotal * 0.10;
}
if ($cupom === 'DESCONTO5') {
  $desconto = 5;
}

$total = max(0, $subtotal + $taxa - $desconto);

echo json_encode([
  'subtotal' => $subtotal,
  'taxa' => $taxa,
  'desconto' => $desconto,
  'total' => $total
]);
