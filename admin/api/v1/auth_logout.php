<?php
require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json');

$header = $_SERVER['HTTP_AUTHORIZATION'] ?? (apache_request_headers()['Authorization'] ?? '');
if (preg_match('/^Bearer\s+([a-f0-9]{96})$/i', trim($header), $m)) {
  apiTokenRevogar($conn, $m[1]);
}

echo json_encode(['ok' => true]);
