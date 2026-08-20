<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/loja_context.php';

header('Content-Type: application/json; charset=utf-8');

function geoRevCfg(PDO $db, string $chave, string $default = ''): string {
  $s = $db->prepare("SELECT valor FROM configuracoes WHERE chave=? AND loja_id=0 LIMIT 1");
  $s->execute([$chave]);
  $v = $s->fetchColumn();
  return $v !== false ? (string) $v : $default;
}

function geoRevUf(string $estado): string {
  $mapa = [
    'acre' => 'AC', 'alagoas' => 'AL', 'amapa' => 'AP', 'amazonas' => 'AM',
    'bahia' => 'BA', 'ceara' => 'CE', 'distrito federal' => 'DF', 'espirito santo' => 'ES',
    'goias' => 'GO', 'maranhao' => 'MA', 'mato grosso' => 'MT', 'mato grosso do sul' => 'MS',
    'minas gerais' => 'MG', 'para' => 'PA', 'paraiba' => 'PB', 'parana' => 'PR',
    'pernambuco' => 'PE', 'piaui' => 'PI', 'rio de janeiro' => 'RJ', 'rio grande do norte' => 'RN',
    'rio grande do sul' => 'RS', 'rondonia' => 'RO', 'roraima' => 'RR', 'santa catarina' => 'SC',
    'sao paulo' => 'SP', 'sergipe' => 'SE', 'tocantins' => 'TO',
  ];
  $chave = mb_strtolower(trim($estado), 'UTF-8');
  $chave = strtr($chave, [
    'á' => 'a', 'â' => 'a', 'ã' => 'a', 'à' => 'a',
    'é' => 'e', 'ê' => 'e',
    'í' => 'i',
    'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
    'ú' => 'u', 'ç' => 'c',
  ]);
  if (isset($mapa[$chave])) return $mapa[$chave];
  if (mb_strlen($estado) === 2) return mb_strtoupper($estado, 'UTF-8');
  return '';
}

try {
  $lojaId = definirLojaIdSessao($conn);

  if (geoRevCfg($conn, 'saas_nominatim_ativo', '1') !== '1') {
    echo json_encode(['ok' => false, 'msg' => 'Recurso de localizacao automatica desativado.']);
    exit;
  }

  $lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
  $lng = filter_input(INPUT_GET, 'lng', FILTER_VALIDATE_FLOAT);
  if ($lat === null || $lat === false || $lng === null || $lng === false || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    echo json_encode(['ok' => false, 'msg' => 'Coordenadas invalidas.']);
    exit;
  }

  $url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2'
    . '&lat=' . urlencode((string) $lat)
    . '&lon=' . urlencode((string) $lng)
    . '&addressdetails=1&accept-language=pt-BR&zoom=18';

  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 8,
    CURLOPT_HTTPHEADER => ['User-Agent: LillyMenu/1.0 (contato@lillymenu.com)'],
  ]);
  $resposta = curl_exec($ch);
  $erroCurl = curl_error($ch);
  curl_close($ch);

  if ($resposta === false || $erroCurl) {
    echo json_encode(['ok' => false, 'msg' => 'Nao foi possivel consultar o endereco no momento.']);
    exit;
  }

  $dados = json_decode($resposta, true);
  if (!is_array($dados) || empty($dados['address'])) {
    echo json_encode(['ok' => false, 'msg' => 'Endereco nao encontrado para esta localizacao.']);
    exit;
  }

  $end = $dados['address'];
  $rua = $end['road'] ?? $end['pedestrian'] ?? '';
  $bairro = $end['suburb'] ?? $end['neighbourhood'] ?? $end['quarter'] ?? $end['city_district'] ?? '';
  $cidade = $end['city'] ?? $end['town'] ?? $end['village'] ?? $end['municipality'] ?? '';
  $estado = geoRevUf((string) ($end['state'] ?? ''));
  $cep = preg_replace('/\D+/', '', (string) ($end['postcode'] ?? ''));
  $numero = $end['house_number'] ?? '';

  if ($rua === '' && $bairro === '' && $cidade === '') {
    echo json_encode(['ok' => false, 'msg' => 'Nao conseguimos identificar seu endereco. Preencha manualmente.']);
    exit;
  }

  echo json_encode([
    'ok' => true,
    'rua' => $rua,
    'numero' => $numero,
    'bairro' => $bairro,
    'cidade' => $cidade,
    'estado' => $estado,
    'cep' => $cep,
  ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao consultar localizacao.']);
}
