<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/acesso_menu.php';
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
/* normaliza pra sempre ter 3 posicoes (index 0,1,2), preenchendo com null onde nao ha imagem */
$atuais = array_pad(array_slice($atuais, 0, 3), 3, null);

$novos = $atuais;
for ($i = 0; $i < 3; $i++) {
  $n = $i + 1;
  $remover = ($_POST["flyer_{$n}_remover"] ?? '0') === '1';
  $base64 = trim((string) ($_POST["flyer_{$n}_base64"] ?? ''));

  if ($remover) {
    storage_delete($atuais[$i]);
    $novos[$i] = null;
  } elseif ($base64 !== '') {
    $salvo = storage_save_base64($base64, 'flyers', 'flyer', $lojaId);
    if ($salvo === null) {
      echo json_encode(['ok' => false, 'msg' => 'Imagem do flyer ' . $n . ' invalida (use JPG, PNG ou WebP).']);
      exit;
    }
    if (!empty($atuais[$i])) {
      storage_delete($atuais[$i]);
    }
    $novos[$i] = $salvo;
  }
}

$novos = array_values(array_filter($novos));

$stmt = $conn->prepare("
  INSERT INTO configuracoes (loja_id, chave, valor)
  VALUES (?, 'loja_flyers', ?)
  ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
");
$stmt->execute([$lojaId, json_encode($novos, JSON_UNESCAPED_UNICODE)]);

echo json_encode(['ok' => true, 'flyers' => $novos]);
