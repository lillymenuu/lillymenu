<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$lojaId = (int) ($_POST['loja_id'] ?? 0);
$adminId = (int) ($_POST['admin_id'] ?? 0);
$nome = trim((string) ($_POST['nome'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$usuario = trim((string) ($_POST['usuario'] ?? ''));
$contato = trim((string) ($_POST['contato'] ?? ''));
$senha = (string) ($_POST['senha'] ?? '');
$senha2 = (string) ($_POST['senha2'] ?? '');
$trialInicio = trim((string) ($_POST['trial_inicio'] ?? ''));
$trialFim = trim((string) ($_POST['trial_fim'] ?? ''));

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
  $stmt = $conn->prepare("UPDATE lojas SET nome = ? WHERE id = ?");
  $stmt->execute([$nome, $lojaId]);

  if ($adminId > 0) {
    $stmt = $conn->prepare("UPDATE admins SET nome = ?, email = ?, usuario = ? WHERE id = ? AND loja_id = ?");
    $stmt->execute([$nome, $email, $usuario, $adminId, $lojaId]);
    if ($senha !== '') {
      $stmt = $conn->prepare("UPDATE admins SET senha = ? WHERE id = ? AND loja_id = ?");
      $stmt->execute([password_hash($senha, PASSWORD_DEFAULT), $adminId, $lojaId]);
    }
  }

  if (tabelaExiste($conn, 'configuracoes')) {
    $configs = [
      'nome_loja' => $nome,
      'loja_email' => $email
    ];
    if ($contato !== '') {
      $configs['loja_contato'] = $contato;
      $configs['whatsapp_numero'] = $contato;
    }

    foreach ($configs as $chave => $valor) {
      $stmt = $conn->prepare("UPDATE configuracoes SET valor = ? WHERE chave = ? AND loja_id = ?");
      $stmt->execute([$valor, $chave, $lojaId]);
      if ($stmt->rowCount() === 0) {
        try {
          $stmtIns = $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (?, ?, ?)");
          $stmtIns->execute([$lojaId, $chave, $valor]);
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
      $stmt = $conn->prepare($sql);
      $stmt->execute($params);
    } elseif ($trialInicioDb || $trialFimDb) {
      $stmt = $conn->prepare("SELECT id FROM planos WHERE ativo = 1 ORDER BY id ASC LIMIT 1");
      $stmt->execute();
      $planoId = (int) $stmt->fetchColumn();
      if ($planoId <= 0) {
        throw new Exception('Plano nao encontrado');
      }
      $stmt = $conn->prepare("
        INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim, ciclo_inicio, ciclo_fim)
        VALUES (?, ?, 'trial', ?, ?, NULL, NULL)
      ");
      $stmt->execute([$lojaId, $planoId, $trialInicioDb, $trialFimDb]);
    }
  }

  $conn->commit();
  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao atualizar loja.']);
}
