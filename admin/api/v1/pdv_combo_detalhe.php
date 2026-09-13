<?php
/*
 * Wrapper Bearer-token de admin/api/combo_get.php pro POS (/pos) —
 * reaproveita o arquivo legado tal como esta (via ponte de sessao), sem
 * duplicar a logica de passos/opcoes/estoque do combo.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

require __DIR__ . '/../combo_get.php';
