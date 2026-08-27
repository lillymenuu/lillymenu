<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/storage.php';
require_once __DIR__ . '/../../helpers/loja_context.php';

$lojaId = (int) ($_SESSION['garcom_loja_id'] ?? 0);
unset($_SESSION['garcom_id'], $_SESSION['garcom_nome'], $_SESSION['garcom_loja_id']);

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$lojaSlug = obterLojaSlug($conn, $lojaId);
$loginUrl = $lojaSlug !== ''
  ? $protocol . $host . storage_base_absoluta() . '/' . rawurlencode($lojaSlug) . '/garcom_login'
  : $protocol . $host . storage_base_absoluta() . '/public/garcom_login.php' . ($lojaId > 0 ? '?loja_id=' . $lojaId : '');

header('Location: ' . $loginUrl);
