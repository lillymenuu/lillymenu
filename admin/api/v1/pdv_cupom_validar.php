<?php
/*
 * Wrapper Bearer-token de admin/api/cupons_validar.php pro POS (/pos)
 * — reaproveita o arquivo legado tal como esta (via ponte de sessao).
 * Le $_POST, entao populamos a partir do corpo JSON antes do require.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../cupons_validar.php';
