<?php

function perfilAtual() {
  return $_SESSION['admin_perfil'] ?? 'admin';
}

function exigirPerfil(array $permitidos) {
  $perfil = perfilAtual();
  if (!in_array($perfil, $permitidos, true)) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode(['ok'=>false,'msg'=>'Sem permissao']);
    exit;
  }
}

/**
 * Admin principal = a conta original da loja (cadastro/login com senha).
 * Sub-usuarios criados via "Criar usuario" nunca tem senha, mesmo quando
 * recebem o nivel "Admin (Sistema)" (que tambem grava perfil='admin') —
 * por isso nao da pra confiar so em admin_perfil pra essa distincao.
 */
function souAdminPrincipal(PDO $conn): bool {
  static $cache = null;
  if ($cache !== null) {
    return $cache;
  }
  if (perfilAtual() !== 'admin') {
    return $cache = false;
  }
  $adminId = (int) ($_SESSION['admin_id'] ?? 0);
  if ($adminId <= 0) {
    return $cache = false;
  }
  try {
    $stmt = $conn->prepare("SELECT senha FROM admins WHERE id = ? LIMIT 1");
    $stmt->execute([$adminId]);
    $senha = $stmt->fetchColumn();
    return $cache = ($senha !== false && trim((string) $senha) !== '');
  } catch (Exception $e) {
    return $cache = false;
  }
}

function exigirAdminPrincipal(PDO $conn) {
  if (!souAdminPrincipal($conn)) {
    header('Content-Type: application/json');
    http_response_code(403);
    echo json_encode(['ok'=>false,'msg'=>'Sem permissao']);
    exit;
  }
}

function registrarOperacao(PDO $conn, $acao, $referencia = null, $dados = null) {
  try {
    $operadorId = $_SESSION['admin_id'] ?? null;
    $lojaId = (int) ($_SESSION['loja_id'] ?? 1);
    $payload = null;
    if ($dados !== null) {
      $payload = is_string($dados)
        ? $dados
        : json_encode($dados, JSON_UNESCAPED_UNICODE);
    }
    $stmt = $conn->prepare("
      INSERT INTO operacao_logs (operador_id, acao, referencia, dados, loja_id)
      VALUES (?,?,?,?,?)
    ");
    $stmt->execute([$operadorId, $acao, $referencia, $payload, $lojaId]);
  } catch (Exception $e) {
    // Silencia log para nao interromper o fluxo principal.
  }
}

/**
 * Marca que o catalogo (produtos/categorias) mudou, para que a loja publica
 * (public/loja.php) detecte via polling e atualize sem precisar de F5 manual.
 */
function bumpCatalogoVersao(PDO $conn, ?int $lojaId = null) {
  try {
    $lojaId = $lojaId ?? (int) ($_SESSION['loja_id'] ?? 1);
    $versao = (string) microtime(true);
    $stmt = $conn->prepare("
      INSERT INTO configuracoes (loja_id, chave, valor)
      VALUES (?, 'catalogo_versao', ?)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor)
    ");
    $stmt->execute([$lojaId, $versao]);
  } catch (Exception $e) {
    // Silencia — nao pode travar o salvamento do produto/categoria.
  }
}
