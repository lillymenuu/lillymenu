<?php
/*
 * Edita uma loja (nome, admin, contato, teste gratis) pelo superadmin no Next.js.
 * Mesma regra de admin/api/lojas_update.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';

header('Content-Type: application/json; charset=utf-8');

apiSuperadminExigir($conn);

if (!function_exists('tabelaExiste')) {
  function tabelaExiste(PDO $conn, string $tabela): bool {
    try {
      $stmt = $conn->prepare("SHOW TABLES LIKE ?");
      $stmt->execute([$tabela]);
      return (bool) $stmt->fetchColumn();
    } catch (Exception $e) {
      return false;
    }
  }
}

$d = json_decode(file_get_contents('php://input'), true) ?: [];

$lojaId      = (int) ($d['loja_id'] ?? 0);
$adminId     = (int) ($d['admin_id'] ?? 0);
$nome        = trim((string) ($d['nome'] ?? ''));
$email       = trim((string) ($d['email'] ?? ''));
$usuario     = trim((string) ($d['usuario'] ?? ''));
$contato     = trim((string) ($d['contato'] ?? ''));
$senha       = (string) ($d['senha'] ?? '');
$senha2      = (string) ($d['senha2'] ?? '');
$trialInicio = trim((string) ($d['trial_inicio'] ?? ''));
$trialFim    = trim((string) ($d['trial_fim'] ?? ''));

if ($trialInicio !== '' && !DateTime::createFromFormat('Y-m-d', $trialInicio)) {
  echo json_encode(['ok' => false, 'msg' => 'Data de inicio do teste invalida.']);
  exit;
}
if ($trialFim !== '' && !DateTime::createFromFormat('Y-m-d', $trialFim)) {
  echo json_encode(['ok' => false, 'msg' => 'Data de fim do teste invalida.']);
  exit;
}
if ($lojaId <= 0 || $nome === '' || $email === '' || $usuario === '') {
  echo json_encode(['ok' => false, 'msg' => 'Preencha todos os campos obrigatorios.']);
  exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Email invalido.']);
  exit;
}
if ($senha !== '' && $senha !== $senha2) {
  echo json_encode(['ok' => false, 'msg' => 'As senhas nao conferem.']);
  exit;
}
if ($senha !== '' && strlen($senha) < 6) {
  echo json_encode(['ok' => false, 'msg' => 'A senha deve ter ao menos 6 caracteres.']);
  exit;
}

try {
  if ($adminId <= 0) {
    $stmt = $conn->prepare("SELECT id FROM admins WHERE loja_id = ? ORDER BY id ASC LIMIT 1");
    $stmt->execute([$lojaId]);
    $adminId = (int) $stmt->fetchColumn();
  }

  if ($adminId > 0) {
    $stmt = $conn->prepare("SELECT id FROM admins WHERE (email = ? OR usuario = ?) AND id <> ? LIMIT 1");
    $stmt->execute([$email, $usuario, $adminId]);
    if ($stmt->fetchColumn()) {
      echo json_encode(['ok' => false, 'msg' => 'Email ou usuario ja cadastrado.']);
      exit;
    }
  }

  $conn->beginTransaction();
  $conn->prepare("UPDATE lojas SET nome = ? WHERE id = ?")->execute([$nome, $lojaId]);

  if ($adminId > 0) {
    $conn->prepare("UPDATE admins SET nome = ?, email = ?, usuario = ? WHERE id = ? AND loja_id = ?")
      ->execute([$nome, $email, $usuario, $adminId, $lojaId]);
    if ($senha !== '') {
      $conn->prepare("UPDATE admins SET senha = ? WHERE id = ? AND loja_id = ?")
        ->execute([password_hash($senha, PASSWORD_DEFAULT), $adminId, $lojaId]);
    }
  }

  if (tabelaExiste($conn, 'configuracoes')) {
    $configs = ['nome_loja' => $nome, 'loja_email' => $email];
    if ($contato !== '') {
      $configs['loja_contato'] = $contato;
      $configs['whatsapp_numero'] = $contato;
    }
    foreach ($configs as $chave => $valor) {
      $stmt = $conn->prepare("UPDATE configuracoes SET valor = ? WHERE chave = ? AND loja_id = ?");
      $stmt->execute([$valor, $chave, $lojaId]);
      if ($stmt->rowCount() === 0) {
        try {
          $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)")->execute([$lojaId, $chave, $valor]);
        } catch (Exception $e) {
          // ignora duplicidade por chave global
        }
      }
    }
  }

  if (tabelaExiste($conn, 'assinaturas')) {
    $trialInicioDb = $trialInicio !== '' ? $trialInicio : null;
    $trialFimDb = $trialFim !== '' ? $trialFim : null;

    $stmt = $conn->prepare("SELECT id, status FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$lojaId]);
    $assinatura = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($assinatura) {
      $statusAtual = trim((string) ($assinatura['status'] ?? ''));
      $params = [$trialInicioDb, $trialFimDb];
      $sql = "UPDATE assinaturas SET trial_inicio = ?, trial_fim = ?";
      if (($trialInicioDb || $trialFimDb) && strtolower($statusAtual) !== 'trial') {
        $sql .= ", status = 'trial', ciclo_inicio = NULL, ciclo_fim = NULL, bloqueada_em = NULL";
      }
      $sql .= " WHERE id = ?";
      $params[] = (int) $assinatura['id'];
      $conn->prepare($sql)->execute($params);
    } elseif ($trialInicioDb || $trialFimDb) {
      $planoId = (int) $conn->query("SELECT id FROM planos WHERE ativo = 1 ORDER BY id ASC LIMIT 1")->fetchColumn();
      if ($planoId <= 0) {
        throw new Exception('Plano nao encontrado');
      }
      $conn->prepare("
        INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim, ciclo_inicio, ciclo_fim)
        VALUES (?, ?, 'trial', ?, ?, NULL, NULL)
      ")->execute([$lojaId, $planoId, $trialInicioDb, $trialFimDb]);
    }
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar loja.']);
}
