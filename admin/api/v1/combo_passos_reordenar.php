<?php
/*
 * Ponte de sessao pra admin/api/combo_passos_reordenar.php — define a
 * ordem dos passos do combo.
 *
 * IMPORTANTE: `passo_ids` precisa continuar como STRING separada por
 * virgula ("12,5,7"), nao array/JSON — o legado faz explode(',', ...).
 * O frontend faz .join(',') antes de montar o payload.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../combo_passos_reordenar.php';
