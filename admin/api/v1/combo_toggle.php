<?php
/*
 * Ponte de sessao pra admin/api/combo_toggle.php — liga/desliga um
 * combo (ativo/inativo).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../combo_toggle.php';
