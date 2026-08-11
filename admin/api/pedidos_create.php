<?php
date_default_timezone_set('America/Fortaleza');
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';

header('Content-Type: application/json');

$nome     = trim($_POST['cliente_nome'] ?? '');
$telefone = trim($_POST['cliente_telefone'] ?? '');
$email    = trim($_POST['cliente_email'] ?? null);
$lojaId   = (int) ($_SESSION['loja_id'] ?? 1);

// Dados do pedido
$total    = (float) ($_POST['total'] ?? 0);
$status   = 'novo';

if ($nome === '' || $telefone === '') {
  echo json_encode(['ok'=>false,'msg'=>'Nome e telefone são obrigatórios']);
  exit;
}

try {
  // "Hoje" calculado em PHP (fuso America/Fortaleza) — nao usar CURDATE() do MySQL, que segue
  // o fuso do servidor do banco e pode divergir nas ultimas horas do dia local.
  $hojeCaixa = date('Y-m-d');
  $stmtCaixa = $conn->prepare("
    SELECT id, aberto_em
    FROM caixa_turnos
    WHERE status = 'aberto' AND loja_id = ? AND DATE(aberto_em) = ?
    ORDER BY id DESC
    LIMIT 1
  ");
  $stmtCaixa->execute([$lojaId, $hojeCaixa]);
  $caixa = $stmtCaixa->fetch(PDO::FETCH_ASSOC) ?: [];
  if (empty($caixa['id'])) {
    $stmtCaixaAnterior = $conn->prepare("
      SELECT aberto_em
      FROM caixa_turnos
      WHERE status = 'aberto' AND loja_id = ?
      ORDER BY id DESC
      LIMIT 1
    ");
    $stmtCaixaAnterior->execute([$lojaId]);
    $abertoEmAnterior = $stmtCaixaAnterior->fetchColumn();
    if ($abertoEmAnterior) {
      $dataFmt = date('d/m/Y', strtotime((string) $abertoEmAnterior));
      echo json_encode(['ok'=>false,'msg'=>"Feche o caixa do dia {$dataFmt} e abra o caixa de hoje para criar pedidos."]);
      exit;
    }
    echo json_encode(['ok'=>false,'msg'=>'Caixa fechado. Abra o caixa do dia para criar pedidos.']);
    exit;
  }
} catch (Exception $e) {
}

function obterOuCriarCliente(PDO $conn, int $lojaId, string $nome, string $telefone, ?string $email = null): int {
  $telefone = preg_replace('/\D+/', '', $telefone);

  $stmt = $conn->prepare("SELECT id FROM clientes WHERE telefone = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$telefone, $lojaId]);
  $id = (int) $stmt->fetchColumn();
  if ($id > 0) {
    return $id;
  }

  $stmt = $conn->prepare("
    INSERT INTO clientes (nome, telefone, email, loja_id)
    VALUES (?, ?, ?, ?)
  ");
  $stmt->execute([$nome, $telefone, $email, $lojaId]);

  return (int) $conn->lastInsertId();
}

$conn->beginTransaction();

try {
  // 🔑 Cliente
  $cliente_id = obterOuCriarCliente($conn, $lojaId, $nome, $telefone, $email);

  // 🧾 Pedido
  $pedCols  = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN, 0);
  $pFields  = ['cliente_id','total','status','criado_em','loja_id'];
  $pValues  = [$cliente_id, $total, $status, date('Y-m-d H:i:s'), $lojaId];

  if (in_array('origem',      $pedCols)) { $pFields[] = 'origem';      $pValues[] = 'balcao'; }
  if (in_array('caixa_id',   $pedCols) && !empty($caixa['id'])) { $pFields[] = 'caixa_id';   $pValues[] = (int)$caixa['id']; }
  if (in_array('operador_id',$pedCols)) { $pFields[] = 'operador_id'; $pValues[] = $_SESSION['admin_id'] ?? null; }

  $ph  = implode(',', array_fill(0, count($pFields), '?'));
  $fl  = implode(',', $pFields);
  $stmt = $conn->prepare("INSERT INTO pedidos ($fl) VALUES ($ph)");
  $stmt->execute($pValues);
  $pedido_id = (int)$conn->lastInsertId();

  // 👉 Aqui entram os itens do pedido (pedido_itens)
  // (mantém como você já tem hoje)

  $conn->commit();
  echo json_encode(['ok'=>true,'pedido_id'=>$pedido_id]);

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false,'msg'=>'Erro ao criar pedido']);
}
