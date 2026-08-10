<?php
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/gerenciamento_module.php';

if (($_SESSION['admin_perfil'] ?? '') !== 'superadmin') {
  http_response_code(403);
  exit('Acesso restrito');
}

gerenciamentoEnsureModule($conn);

$lojaId = (int)($_POST['loja_id'] ?? 0);
$acao = $_POST['acao'] ?? '';
if ($lojaId <= 0 || !in_array($acao, ['ativar','suspender'], true)) {
  header('Location: ../superadmin/dashboard.php');
  exit;
}

$conn->beginTransaction();
try {
  $stmtAss = $conn->prepare("SELECT id, plano_id, status, trial_inicio, trial_fim, ciclo_fim FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
  $stmtAss->execute([$lojaId]);
  $assinatura = $stmtAss->fetch(PDO::FETCH_ASSOC) ?: [];
  $assinaturaId = (int)($assinatura['id'] ?? 0);
  $planoId = (int)($assinatura['plano_id'] ?? 0);
  $statusAtual = strtolower(trim((string)($assinatura['status'] ?? '')));
  $trialFim = $assinatura['trial_fim'] ?? null;

  if ($planoId <= 0) {
    $stmtLojaPlano = $conn->prepare("SELECT plano_id FROM lojas WHERE id = ?");
    $stmtLojaPlano->execute([$lojaId]);
    $lojaPlanoId = (int) ($stmtLojaPlano->fetchColumn() ?: 0);
    if ($lojaPlanoId > 0) {
      $stmtCheckPlano = $conn->prepare("SELECT id FROM planos WHERE id = ? AND ativo = 1");
      $stmtCheckPlano->execute([$lojaPlanoId]);
      if ($stmtCheckPlano->fetchColumn()) {
        $planoId = $lojaPlanoId;
      }
    }
  }
  if ($planoId <= 0) {
    $stmtPlano = $conn->query("SELECT id FROM planos WHERE ativo = 1 ORDER BY id ASC LIMIT 1");
    $planoId = (int) ($stmtPlano ? $stmtPlano->fetchColumn() : 0);
  }
  if ($planoId <= 0) {
    $planoId = 1;
  }

  if ($acao === 'ativar' && !$assinaturaId) {
    $diasTrial = 30;
    $conn->prepare("
      INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
      VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL {$diasTrial} DAY))
    ")->execute([$lojaId, $planoId]);
    $assinaturaId = (int) $conn->lastInsertId();
    $statusAtual = 'trial';
  }

  if ($acao === 'ativar' && $assinaturaId) {
    $hoje = date('Y-m-d');
    $emTrialValido = ($statusAtual === 'trial' && $trialFim && $trialFim >= $hoje);
    if ($statusAtual === 'suspensa' && $trialFim && $trialFim >= $hoje) {
      $conn->prepare("UPDATE assinaturas SET status='trial', bloqueada_em=NULL WHERE id = ?")
        ->execute([$assinaturaId]);
      $statusAtual = 'trial';
      $emTrialValido = true;
    }
    if ($statusAtual === 'trial' && !$trialFim) {
      $diasTrial = 30;
      $conn->prepare("UPDATE assinaturas SET status='trial', trial_inicio=CURDATE(), trial_fim=DATE_ADD(CURDATE(), INTERVAL {$diasTrial} DAY) WHERE id = ?")
        ->execute([$assinaturaId]);
      $emTrialValido = true;
    }

    if (!$emTrialValido) {
      $conn->prepare("
        UPDATE assinaturas
        SET status='ativa', ciclo_inicio=CURDATE(), ciclo_fim=DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        WHERE id = ?
      ")->execute([$assinaturaId]);

      $stmtPlano = $conn->prepare("SELECT valor FROM planos WHERE id = ? LIMIT 1");
      $stmtPlano->execute([$planoId]);
      $valor = (float) ($stmtPlano->fetchColumn() ?? 50.00);

      $stmtCob = $conn->prepare("SELECT id FROM cobrancas WHERE assinatura_id = ? AND status = 'pendente' ORDER BY id DESC LIMIT 1");
      $stmtCob->execute([$assinaturaId]);
      $cobrancaPendente = (int) ($stmtCob->fetchColumn() ?? 0);
      if ($cobrancaPendente) {
        $conn->prepare("UPDATE cobrancas SET status='pago', pago_em=NOW() WHERE id = ?")
          ->execute([$cobrancaPendente]);
      } else {
        $conn->prepare("
          INSERT INTO cobrancas (assinatura_id, valor, vencimento, status, pago_em)
          VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'pago', NOW())
        ")->execute([$assinaturaId, $valor]);
      }
    }

    $conn->prepare("UPDATE lojas SET ativo = 1 WHERE id = ?")->execute([$lojaId]);
    $conn->prepare("UPDATE admins SET ativo = 1 WHERE loja_id = ?")->execute([$lojaId]);
  }

  if ($acao === 'suspender' && !$assinaturaId) {
    $conn->prepare("
      INSERT INTO assinaturas (loja_id, plano_id, status, bloqueada_em)
      VALUES (?, ?, 'suspensa', NOW())
    ")->execute([$lojaId, $planoId]);
  }

  if ($acao === 'suspender' && $assinaturaId) {
    $conn->prepare("UPDATE assinaturas SET status='suspensa', bloqueada_em=NOW() WHERE id = ?")
      ->execute([$assinaturaId]);
  }

  if ($acao === 'suspender') {
    $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")->execute([$lojaId]);
    $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")->execute([$lojaId]);
  }

  $conn->commit();
} catch (Exception $e) {
  $conn->rollBack();
}

header('Location: ../superadmin/dashboard.php');
exit;
