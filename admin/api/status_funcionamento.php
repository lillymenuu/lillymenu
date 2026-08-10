<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../admin/helpers/config.php';
require_once __DIR__ . '/../admin/helpers/whatsapp.php';

header('Content-Type: application/json');

$aberto = estaAberto($conn);

echo json_encode([
  'aberto' => $aberto,
  'abertura' => config($conn, 'horario_abertura'),
  'fechamento' => config($conn, 'horario_fechamento')
]);
