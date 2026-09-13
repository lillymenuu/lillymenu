<?php
/*
 * Wrapper Bearer-token de admin/api/pdv_salvar.php pro POS (/pos) —
 * reaproveita o arquivo legado tal como esta (via ponte de sessao), sem
 * re-derivar a mao a regra de negocio critica (estoque, caixa,
 * cashback, pontos, fiado, cupom, taxa de entrega, integracao
 * financeira). Ver admin/helpers/legacy_session_bridge.php.
 *
 * O legado le $_POST (hoje populado por FormData multipart do
 * navegador); aqui populamos a partir do corpo JSON. IMPORTANTE: os
 * campos `itens` e `pagamentos` continuam como STRINGS JSON dentro do
 * corpo (o legado faz json_decode($_POST['itens'], true) — um array PHP
 * ja decodificado quebraria essa chamada). O frontend faz
 * JSON.stringify() nesses dois campos antes de montar o payload.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../pdv_salvar.php';
