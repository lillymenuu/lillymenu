<?php
/*
 * Login para o novo frontend Next.js (chamado servidor-a-servidor pelo BFF
 * na Vercel, nunca direto do navegador do cliente). Mesma checagem de
 * credenciais de admin/auth.php, mas devolve um token Bearer em JSON em vez
 * de sessao PHP + redirect.
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
    SELECT a.*, l.ativo AS loja_ativo
    FROM admins a
    LEFT JOIN lojas l ON l.id = a.loja_id
    WHERE (LOWER(a.email) = LOWER(?) OR LOWER(a.usuario) = LOWER(?))
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

if ((int) ($admin['ativo'] ?? 0) !== 1 || (int) ($admin['loja_ativo'] ?? 0) !== 1) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'erro' => 'Conta ou loja inativa. Acesse pelo painel atual para regularizar.']);
  exit;
}

$token = apiTokenCriar($conn, (int) $admin['id'], (int) $admin['loja_id']);

echo json_encode([
  'ok'    => true,
  'token' => $token,
  'admin' => [
    'id'     => (int) $admin['id'],
    'nome'   => $admin['nome'],
    'email'  => $admin['email'] ?? '',
    'perfil' => $admin['perfil'] ?? 'admin',
  ],
]);
