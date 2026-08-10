<?php
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'msg' => 'sessao_expirada']);
  exit;
}

echo json_encode(['ok' => true, 't' => time()]);
