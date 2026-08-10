<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$id = (int) ($_POST['categoria_id'] ?? 0);
$diasRaw = trim((string) ($_POST['dias'] ?? ''));
$horaInicio = trim((string) ($_POST['hora_inicio'] ?? ''));
$horaFim = trim((string) ($_POST['hora_fim'] ?? ''));

if ($id <= 0) {
  echo json_encode(['ok' => false, 'msg' => 'Categoria invalida.']);
  exit;
}

$stmt = $conn->prepare("SELECT id FROM categorias WHERE id = ? AND loja_id = ? LIMIT 1");
$stmt->execute([$id, $lojaId]);
if (!$stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Categoria nao encontrada.']);
  exit;
}

$diasValidosSet = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
$dias = [];
if ($diasRaw !== '') {
  foreach (explode(',', $diasRaw) as $d) {
    $d = strtolower(trim($d));
    if (in_array($d, $diasValidosSet, true) && !in_array($d, $dias, true)) {
      $dias[] = $d;
    }
  }
}

if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $horaInicio)) {
  $horaInicio = '';
}
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $horaFim)) {
  $horaFim = '';
}

$semNenhumDado = !$dias && $horaInicio === '' && $horaFim === '';

if (!$semNenhumDado) {
  if (!$dias) {
    echo json_encode(['ok' => false, 'msg' => 'Selecione ao menos um dia da semana.']);
    exit;
  }
  if ($horaInicio === '' || $horaFim === '') {
    echo json_encode(['ok' => false, 'msg' => 'Informe o horario inicial e final.']);
    exit;
  }
}

try {
  $stmt = $conn->prepare("
    UPDATE categorias
    SET dias_semana = ?, horario_ini = ?, horario_fim = ?
    WHERE id = ? AND loja_id = ?
  ");
  $stmt->execute([
    $dias ? json_encode($dias) : null,
    $horaInicio !== '' ? $horaInicio : null,
    $horaFim !== '' ? $horaFim : null,
    $id,
    $lojaId
  ]);

  registrarOperacao($conn, 'categoria_agendamento_salvo', 'categoria:' . $id, [
    'dias' => $dias,
    'hora_inicio' => $horaInicio,
    'hora_fim' => $horaFim
  ]);

  bumpCatalogoVersao($conn, $lojaId);
  echo json_encode(['ok' => true, 'msg' => 'Agendamento salvo.']);
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar agendamento.']);
}
