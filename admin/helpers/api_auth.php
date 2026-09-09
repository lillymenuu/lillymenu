<?php

/**
 * Autenticacao por token Bearer para o novo frontend Next.js (hospedado na
 * Vercel, fora do dominio da loja). O Next.js roda como BFF: guarda o token
 * num cookie httpOnly proprio dele e chama esses endpoints servidor-a-servidor
 * com "Authorization: Bearer <token>" — o token nunca chega ao navegador do
 * cliente, entao nao precisamos de CORS nem de cookie cross-domain aqui.
 */

if (!function_exists('garantirApiTokensTabela')) {
  function garantirApiTokensTabela(PDO $conn): void {
    $conn->exec("CREATE TABLE IF NOT EXISTS admin_api_tokens (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      admin_id INT UNSIGNED NOT NULL,
      loja_id INT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expira_em DATETIME NOT NULL,
      UNIQUE KEY uq_token_hash (token_hash),
      KEY idx_admin (admin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  }
}

/**
 * Gera um token opaco de 48 bytes (64 chars hex), guarda so o hash (sha256)
 * no banco — mesmo racional de nunca guardar senha em texto puro, aqui
 * aplicado a um token de acesso de longa duracao (30 dias).
 * @return string o token em texto puro (so existe esse momento, devolver ao cliente)
 */
if (!function_exists('apiTokenCriar')) {
  function apiTokenCriar(PDO $conn, int $adminId, int $lojaId): string {
    garantirApiTokensTabela($conn);
    $token = bin2hex(random_bytes(48));
    $hash  = hash('sha256', $token);
    $stmt  = $conn->prepare("INSERT INTO admin_api_tokens (admin_id, loja_id, token_hash, expira_em) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))");
    $stmt->execute([$adminId, $lojaId, $hash]);
    return $token;
  }
}

/**
 * Le o header Authorization: Bearer <token>, valida contra o banco e devolve
 * os dados do admin autenticado. Em caso de falha, ja responde 401 e encerra
 * (mesmo padrao de "early exit" usado no restante da API do projeto).
 * @return array{admin_id:int, loja_id:int, perfil:string}
 */
if (!function_exists('apiAuthExigir')) {
  function apiAuthExigir(PDO $conn): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? (apache_request_headers()['Authorization'] ?? '');
    if (!preg_match('/^Bearer\s+([a-f0-9]{96})$/i', trim($header), $m)) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'erro' => 'Nao autenticado.']);
      exit;
    }

    garantirApiTokensTabela($conn);
    $hash = hash('sha256', $m[1]);
    $stmt = $conn->prepare("
      SELECT t.admin_id, t.loja_id, a.perfil, a.ativo AS admin_ativo, l.ativo AS loja_ativo
      FROM admin_api_tokens t
      INNER JOIN admins a ON a.id = t.admin_id
      LEFT JOIN lojas l ON l.id = t.loja_id
      WHERE t.token_hash = ? AND t.expira_em > NOW()
      LIMIT 1
    ");
    $stmt->execute([$hash]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || (int) $row['admin_ativo'] !== 1 || (int) $row['loja_ativo'] !== 1) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'erro' => 'Sessao invalida ou expirada.']);
      exit;
    }

    return [
      'admin_id' => (int) $row['admin_id'],
      'loja_id'  => (int) $row['loja_id'],
      'perfil'   => (string) ($row['perfil'] ?? 'admin'),
    ];
  }
}

if (!function_exists('apiTokenRevogar')) {
  function apiTokenRevogar(PDO $conn, string $token): void {
    garantirApiTokensTabela($conn);
    $hash = hash('sha256', $token);
    $conn->prepare("DELETE FROM admin_api_tokens WHERE token_hash = ?")->execute([$hash]);
  }
}
