<?php
/*
 * Autenticacao do superadmin no frontend Next.js (/superadmin/*). Usa a mesma
 * tabela de tokens Bearer das lojas (admin_api_tokens), mas exige perfil
 * "superadmin" em TODA chamada — um token de lojista nunca passa por aqui,
 * mesmo que alguem chame o endpoint direto.
 */

require_once __DIR__ . '/api_auth.php';

if (!function_exists('apiSuperadminExigir')) {
  /**
   * @return array{admin_id:int, loja_id:int, perfil:string, nome:string}
   */
  function apiSuperadminExigir(PDO $conn): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? (apache_request_headers()['Authorization'] ?? '');
    if (!preg_match('/^Bearer\s+([a-f0-9]{96})$/i', trim($header), $m)) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'erro' => 'Nao autenticado.']);
      exit;
    }

    garantirApiTokensTabela($conn);
    $stmt = $conn->prepare("
      SELECT t.admin_id, t.loja_id, a.perfil, a.nome, a.ativo AS admin_ativo
      FROM admin_api_tokens t
      INNER JOIN admins a ON a.id = t.admin_id
      WHERE t.token_hash = ? AND t.expira_em > NOW()
      LIMIT 1
    ");
    $stmt->execute([hash('sha256', $m[1])]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || (int) $row['admin_ativo'] !== 1) {
      http_response_code(401);
      echo json_encode(['ok' => false, 'erro' => 'Sessao invalida ou expirada.']);
      exit;
    }
    if (($row['perfil'] ?? '') !== 'superadmin') {
      http_response_code(403);
      echo json_encode(['ok' => false, 'erro' => 'Acesso restrito.']);
      exit;
    }

    return [
      'admin_id' => (int) $row['admin_id'],
      'loja_id'  => (int) $row['loja_id'],
      'perfil'   => 'superadmin',
      'nome'     => (string) $row['nome'],
    ];
  }
}
