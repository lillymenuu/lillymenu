<?php
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/google_oauth.php';

if (!googleOauthConfigurado()) {
  header("Location: login?erro=google_nao_configurado");
  exit;
}

$state = bin2hex(random_bytes(16));
$_SESSION['google_oauth_state'] = $state;

header("Location: " . googleOauthAuthUrl($state));
exit;
