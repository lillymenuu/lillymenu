<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
require_once __DIR__ . '/../helpers/operacao.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json');

if (!acessoMenuPermitido($conn, 'menu.promo')) {
  http_response_code(403);
  echo json_encode(['ok' => false, 'msg' => 'Acesso restrito.']);
  exit;
}

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

$stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE chave = 'loja_flyers' AND loja_id = ?");
$stmt->execute([$lojaId]);
$atuais = json_decode((string) $stmt->fetchColumn(), true);
if (!is_array($atuais)) {
  $atuais = [];
}

/* Cada posicao enviada (na ordem escolhida no admin, apos possivel drag-and-drop)
   diz o que deve existir ali: uma imagem nova (base64), uma imagem ja existente
   que so mudou de posicao (url, validada contra a lista atual pra nao aceitar
   url arbitraria), ou nada (removida / nunca preenchida). */
$novos = [];
for ($n = 1; $n <= 3; $n++) {
  $remover = ($_POST["flyer_{$n}_remover"] ?? '0') === '1';
  $base64 = trim((string) ($_POST["flyer_{$n}_base64"] ?? ''));
  $urlExistente = trim((string) ($_POST["flyer_{$n}_url"] ?? ''));

  if ($remover) {
    continue;
  }
  if ($base64 !== '') {
    $salvo = storage_save_base64($base64, 'flyers', 'flyer', $lojaId);
    if ($salvo === null) {
      echo json_encode(['ok' => false, 'msg' => 'Imagem do flyer ' . $n . ' invalida (use JPG, PNG ou WebP).']);
      exit;
    }
    $novos[] = $salvo;
  } elseif ($urlExistente !== '' && in_array($urlExistente, $atuais, true)) {
    $novos[] = $urlExistente;
  }
}

/* remove do storage qualquer imagem antiga que nao sobreviveu (removida ou substituida) */
foreach ($atuais as $antiga) {
  if ($antiga && !in_array($antiga, $novos, true)) {
    storage_delete($antiga);
  }
}

$stmt = $conn->prepare("
  INSERT INTO configuracoes (loja_id, chave, valor)
  VALUES (?, 'loja_flyers', ?)
  ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
");
$stmt->execute([$lojaId, json_encode($novos, JSON_UNESCAPED_UNICODE)]);

bumpCatalogoVersao($conn, $lojaId);

echo json_encode(['ok' => true, 'flyers' => $novos]);
