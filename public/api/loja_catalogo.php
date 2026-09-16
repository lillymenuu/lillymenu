<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../helpers/storage.php';
require_once '../../helpers/loja_catalogo.php';

/* Endpoint JSON publico (sem sessao/Bearer) pra Store no Next
   (lillymenu.vercel.app/store/<slug>) — resolve loja_id via ?loja=<slug>
   ou ?loja_id=<id>, mesma resolucao de public/loja.php. Categorias,
   produtos, combos e destaques, via o helper compartilhado
   helpers/loja_catalogo.php. */
$lojaId = obterLojaIdDaRequisicao($conn);

$stmtLoja = $conn->prepare("SELECT id FROM lojas WHERE id = ? LIMIT 1");
$stmtLoja->execute([$lojaId]);
if (!$stmtLoja->fetchColumn()) {
  http_response_code(404);
  echo json_encode(['ok' => false, 'msg' => 'Loja nao encontrada.'], JSON_UNESCAPED_UNICODE);
  exit;
}

$catalogo = montarCatalogoLoja($conn, $lojaId);

echo json_encode(['ok' => true, 'loja_id' => $lojaId] + $catalogo, JSON_UNESCAPED_UNICODE);
