<?php
/*
 * Acoes do superadmin sobre uma loja (Next.js): ativar, suspender, excluir,
 * trocar plano e aprovar/rejeitar comprovante. Mesmas regras de
 * admin/api/lojas_acao.php, lojas_delete.php e gerenciamento_*.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';
require_once __DIR__ . '/../../helpers/mercadopago.php';
require_once __DIR__ . '/../../helpers/loja_excluir.php';

header('Content-Type: application/json; charset=utf-8');

apiSuperadminExigir($conn);
gerenciamentoEnsureModule($conn);

$d = json_decode(file_get_contents('php://input'), true) ?: [];
$acao   = (string) ($d['acao'] ?? '');
$lojaId = (int) ($d['loja_id'] ?? 0);

function respostaAcao(bool $ok, string $msg = ''): void {
  echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'msg' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($acao === 'excluir') {
  $r = superadminExcluirLoja($conn, $lojaId);
  respostaAcao($r['ok'], $r['msg'] ?? 'Erro ao excluir loja.');
}

if ($acao === 'aprovar_comprovante') {
  $cobrancaId = (int) ($d['cobranca_id'] ?? 0);
  if ($cobrancaId <= 0) respostaAcao(false, 'Cobrança inválida.');
  respostaAcao(confirmarPagamentoAssinatura($conn, $cobrancaId), 'Erro ao aprovar pagamento.');
}

if ($acao === 'rejeitar_comprovante') {
  $cobrancaId = (int) ($d['cobranca_id'] ?? 0);
  $motivo = trim((string) ($d['motivo'] ?? ''));
  if ($cobrancaId <= 0) respostaAcao(false, 'Cobrança inválida.');
  try {
    $conn->prepare("
      UPDATE cobrancas
      SET comprovante_arquivo = NULL, comprovante_enviado_em = NULL, motivo_rejeicao = ?, status = 'pendente'
      WHERE id = ?
    ")->execute([$motivo !== '' ? $motivo : 'Comprovante rejeitado.', $cobrancaId]);
    respostaAcao(true);
  } catch (Exception $e) {
    respostaAcao(false, 'Erro ao rejeitar comprovante.');
  }
}

if ($acao === 'plano') {
  $planoId = (int) ($d['plano_id'] ?? 0);
  if ($lojaId <= 0 || $planoId <= 0) respostaAcao(false, 'Dados inválidos.');
  try {
    $stmt = $conn->prepare("SELECT id FROM planos WHERE id = ? AND ativo = 1 LIMIT 1");
    $stmt->execute([$planoId]);
    if (!$stmt->fetchColumn()) respostaAcao(false, 'Plano não encontrado.');

    $stmt = $conn->prepare("SELECT id FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$lojaId]);
    $assinaturaId = (int) $stmt->fetchColumn();
    if ($assinaturaId > 0) {
      $conn->prepare("UPDATE assinaturas SET plano_id = ? WHERE id = ?")->execute([$planoId, $assinaturaId]);
    } else {
      $conn->prepare("
        INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
        VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
      ")->execute([$lojaId, $planoId]);
    }
    respostaAcao(true);
  } catch (Exception $e) {
    respostaAcao(false, 'Erro ao atualizar plano.');
  }
}

if (!in_array($acao, ['ativar', 'suspender'], true) || $lojaId <= 0) {
  respostaAcao(false, 'Ação inválida.');
}

$conn->beginTransaction();
try {
  $stmtAss = $conn->prepare("SELECT id, plano_id, status, trial_inicio, trial_fim, ciclo_fim FROM assinaturas WHERE loja_id = ? ORDER BY id DESC LIMIT 1");
  $stmtAss->execute([$lojaId]);
  $assinatura = $stmtAss->fetch(PDO::FETCH_ASSOC) ?: [];
  $assinaturaId = (int) ($assinatura['id'] ?? 0);
  $planoId = (int) ($assinatura['plano_id'] ?? 0);
  $statusAtual = strtolower(trim((string) ($assinatura['status'] ?? '')));
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

  if ($acao === 'ativar') {
    if (!$assinaturaId) {
      $conn->prepare("
        INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
        VALUES (?, ?, 'trial', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))
      ")->execute([$lojaId, $planoId]);
      $assinaturaId = (int) $conn->lastInsertId();
      $statusAtual = 'trial';
    }

    $hoje = date('Y-m-d');
    $emTrialValido = ($statusAtual === 'trial' && $trialFim && $trialFim >= $hoje);
    if ($statusAtual === 'suspensa' && $trialFim && $trialFim >= $hoje) {
      $conn->prepare("UPDATE assinaturas SET status='trial', bloqueada_em=NULL WHERE id = ?")->execute([$assinaturaId]);
      $statusAtual = 'trial';
      $emTrialValido = true;
    }
    if ($statusAtual === 'trial' && !$trialFim) {
      $conn->prepare("UPDATE assinaturas SET status='trial', trial_inicio=CURDATE(), trial_fim=DATE_ADD(CURDATE(), INTERVAL 30 DAY) WHERE id = ?")->execute([$assinaturaId]);
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
        $conn->prepare("UPDATE cobrancas SET status='pago', pago_em=NOW() WHERE id = ?")->execute([$cobrancaPendente]);
      } else {
        $conn->prepare("
          INSERT INTO cobrancas (assinatura_id, valor, vencimento, status, pago_em)
          VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'pago', NOW())
        ")->execute([$assinaturaId, $valor]);
      }
    }
    $conn->prepare("UPDATE lojas SET ativo = 1 WHERE id = ?")->execute([$lojaId]);
    $conn->prepare("UPDATE admins SET ativo = 1 WHERE loja_id = ?")->execute([$lojaId]);
  } else {
    if (!$assinaturaId) {
      $conn->prepare("INSERT INTO assinaturas (loja_id, plano_id, status, bloqueada_em) VALUES (?, ?, 'suspensa', NOW())")
        ->execute([$lojaId, $planoId]);
    } else {
      $conn->prepare("UPDATE assinaturas SET status='suspensa', bloqueada_em=NOW() WHERE id = ?")->execute([$assinaturaId]);
    }
    $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")->execute([$lojaId]);
    $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")->execute([$lojaId]);
  }

  $conn->commit();
  respostaAcao(true);
} catch (Exception $e) {
  if ($conn->inTransaction()) {
    $conn->rollBack();
  }
  respostaAcao(false, 'Erro ao atualizar a loja.');
}
