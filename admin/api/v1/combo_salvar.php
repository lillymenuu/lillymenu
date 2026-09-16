<?php
/*
 * Ponte de sessao pra admin/api/combo_save.php — cria/atualiza os dados
 * basicos do combo (nome, imagem, preco, categoria, promo, ativo).
 * Reaproveita o legado tal como esta (upload/remocao de imagem via
 * storage_save_base64/storage_delete, auto-criacao das tabelas).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/legacy_session_bridge.php';

$auth = apiAuthExigir($conn);
legacySessionBridge($auth);

$body = json_decode(file_get_contents('php://input'), true);
$_POST = is_array($body) ? $body : [];

require __DIR__ . '/../combo_save.php';
