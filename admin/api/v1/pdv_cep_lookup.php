<?php
/*
 * Wrapper Bearer-token de admin/api/cep_lookup.php pro POS (/pos) —
 * reaproveita o arquivo legado tal como esta (via ponte de sessao), sem
 * duplicar a geocodificacao/calculo de distancia/taxa por bairro ou
 * dinamica.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

require __DIR__ . '/../cep_lookup.php';
