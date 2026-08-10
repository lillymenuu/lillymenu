<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../admin/helpers/config.php';

$lojaId   = definirLojaIdSessao($conn);
$_SESSION['loja_id'] = $lojaId;
$telefone = preg_replace('/\D+/', '', trim($_GET['tel'] ?? ''));

if (!$telefone) {
  echo json_encode(['ok'=>false,'saldo'=>0,'pct'=>0]); exit;
}

$cashbackPct   = (float) config($conn, 'cashback_percentual', 0);
$cashbackAtivo = config($conn, 'cashback_ativo', '0') === '1';
$expiraDias    = (int)   config($conn, 'cashback_expira_dias', 0);

if (!$cashbackAtivo) {
  echo json_encode(['ok'=>true,'ativo'=>false,'saldo'=>0,'pct'=>0]); exit;
}

try {
  $cols = $conn->query("SHOW COLUMNS FROM clientes")->fetchAll(PDO::FETCH_COLUMN, 0);
  if (!in_array('cashback_saldo', $cols)) {
    echo json_encode(['ok'=>true,'ativo'=>true,'saldo'=>0,'pct'=>$cashbackPct]); exit;
  }

  /* remove máscara no banco para comparar com dígitos puros */
  $telStrip = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone,'(',''),')',''),' ',''),'-',''),'+','')";
  $s = $conn->prepare("SELECT id, cashback_saldo FROM clientes WHERE loja_id=? AND ({$telStrip}=? OR telefone=?) LIMIT 1");
  $s->execute([$lojaId, $telefone, $telefone]);
  $c = $s->fetch(PDO::FETCH_ASSOC);

  if (!$c) {
    echo json_encode(['ok'=>true,'ativo'=>true,'saldo'=>0,'pct'=>$cashbackPct]); exit;
  }

  $saldo = max(0, (float)($c['cashback_saldo'] ?? 0));
  $clienteId = (int) $c['id'];

  /* Desconta o que ainda esta em carencia (disponivel_em no futuro); saldo sem
     rastro no ledger (ajustes antigos) e tratado como ja liberado. */
  $saldoLiberado = $saldo;
  try {
    $temTabelaMov = (bool) $conn->query("SHOW TABLES LIKE 'cashback_movimentacoes'")->fetchColumn();
    if ($temTabelaMov && $saldo > 0) {
      $stmtLib = $conn->prepare("
        SELECT m.id, m.valor,
          COALESCE((
            SELECT SUM(valor) FROM cashback_movimentacoes u
            WHERE u.referencia_id = m.id AND u.tipo IN ('uso','resgate','expirado') AND u.loja_id = m.loja_id
          ), 0) AS usado
        FROM cashback_movimentacoes m
        WHERE m.cliente_id = ? AND m.loja_id = ? AND m.tipo IN ('entrada','ganho')
          AND m.disponivel_em IS NOT NULL
          AND m.disponivel_em > NOW()
          AND (m.expira_em IS NULL OR m.expira_em >= CURDATE())
        ORDER BY m.criado_em ASC, m.id ASC
      ");
      $stmtLib->execute([$clienteId, $lojaId]);
      $totalNaoLiberado = 0.0;
      foreach ($stmtLib->fetchAll(PDO::FETCH_ASSOC) as $rowLib) {
        $d = (float) $rowLib['valor'] - (float) $rowLib['usado'];
        if ($d > 0) $totalNaoLiberado += $d;
      }
      $saldoLiberado = max(0, min($saldo, $saldo - $totalNaoLiberado));
    }
  } catch (Exception $e) {
    $saldoLiberado = $saldo;
  }

  echo json_encode(['ok'=>true,'ativo'=>true,'saldo'=>$saldoLiberado,'saldo_total'=>$saldo,'pct'=>$cashbackPct,'clienteId'=>$clienteId]);

} catch (Exception $e) {
  echo json_encode(['ok'=>false,'saldo'=>0,'pct'=>0]);
}
