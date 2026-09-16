<?php
/*
 * Ponte de sessao pra admin/api/combo_get.php — mesmo padrao ja usado
 * por admin/api/v1/pdv_combo_detalhe.php (POS), so que sob o namespace
 * de Produtos pro admin novo. Reaproveita o legado tal como esta, sem
 * duplicar a logica de passos/opcoes/estoque do combo.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

require __DIR__ . '/../combo_get.php';
