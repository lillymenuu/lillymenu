<?php
/*
 * Login do superadmin para o frontend Next.js (/superadmin/login). Diferente de
 * auth_login.php: aceita SOMENTE perfil "superadmin" (lojista recebe a mesma
 * mensagem de credencial invalida, sem revelar que o usuario existe).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'erro' => 'Metodo nao permitido.']);
  exit;
}

$dados = json_decode(file_get_contents('php://input'), true) ?: [];
$login = trim((string) ($dados['email'] ?? ''));
$senha = (string) ($dados['senha'] ?? '');

if ($login === '' || $senha === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'erro' => 'Informe email e senha.']);
  exit;
}

try {
  $stmt = $conn->prepare("
    SELECT * FROM admins
    WHERE (LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?))
      AND perfil = 'superadmin' AND ativo = 1
    LIMIT 1
  ");
  $stmt->execute([$login, $login]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'erro' => 'Erro ao consultar credenciais.']);
  exit;
}

if (!$admin || !password_verify($senha, $admin['senha'])) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'erro' => 'Email ou senha invalidos.']);
  exit;
}

$token = apiTokenCriar($conn, (int) $admin['id'], (int) ($admin['loja_id'] ?? 0));

echo json_encode([
  'ok'    => true,
  'token' => $token,
  'admin' => [
    'id'    => (int) $admin['id'],
    'nome'  => $admin['nome'],
    'email' => $admin['email'] ?? '',
  ],
]);
