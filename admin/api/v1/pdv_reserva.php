<?php
/*
 * Reserva de estoque do PDV: o balcao envia aqui o que esta no "Resumo do
 * pedido" (POST {sessao, itens:[{produto_id, qtd}]}; lista vazia libera). A
 * loja publica desconta essas unidades enquanto o PDV continuar enviando —
 * ver admin/helpers/pdv_reserva_module.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/pdv_reserva_module.php';

header('Content-Type: application/json');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido.']);
  exit;
}

$dados  = json_decode(file_get_contents('php://input'), true) ?: [];
$sessao = substr(preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($dados['sessao'] ?? '')), 0, 64);
if ($sessao === '') {
  echo json_encode(['ok' => false, 'msg' => 'Sessao invalida.']);
  exit;
}

$somados = [];
foreach (is_array($dados['itens'] ?? null) ? $dados['itens'] : [] as $it) {
  $pid = (int) ($it['produto_id'] ?? 0);
  $qtd = (int) ($it['qtd'] ?? 0);
  if ($pid > 0 && $qtd > 0) {
    $somados[$pid] = ($somados[$pid] ?? 0) + $qtd;
  }
}

try {
  /* So reserva produto desta loja (ignora ids de outra loja / combos). */
  if ($somados) {
    $ids = array_keys($somados);
    $ph  = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare("SELECT id FROM produtos WHERE id IN ($ph) AND loja_id = ?");
    $stmt->execute([...$ids, $lojaId]);
    $validos = array_flip(array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN, 0)));
    $somados = array_intersect_key($somados, $validos);
  }
  pdvReservaSalvar($conn, $lojaId, $sessao, $somados);
  echo json_encode(['ok' => true]);
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao reservar estoque.']);
}
