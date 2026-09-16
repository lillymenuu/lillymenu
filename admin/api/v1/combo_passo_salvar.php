<?php
/*
 * Ponte de sessao pra admin/api/combo_passo_save.php — cria/atualiza um
 * passo do combo (nome, min/max, obrigatorio, permite_repetir) e
 * substitui as opcoes (produtos) do passo por inteiro.
 *
 * IMPORTANTE: `produto_ids` precisa continuar como STRING separada por
 * virgula ("1,5,9"), nao array/JSON — o legado faz explode(',', ...).
 * O frontend faz .join(',') antes de montar o payload.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../combo_passo_save.php';
