<?php
/*
 * Versao JSON de admin/api/flyers_salvar.php para o novo frontend Next.js
 * (/promotion). Mesmos campos numerados do legado (flyer_{n}_remover/
 * base64/url), so trocando FormData por corpo JSON e sessao por token
 * Bearer.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';
require_once __DIR__ . '/../../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$dados = json_decode(file_get_contents('php://input'), true) ?: [];

$stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE chave = 'loja_flyers' AND loja_id = ?");
$stmt->execute([$lojaId]);
$atuais = json_decode((string) $stmt->fetchColumn(), true);
if (!is_array($atuais)) {
  $atuais = [];
}

/* Cada posicao enviada (na ordem escolhida no admin, apos possivel drag-and-drop)
 * diz o que deve existir ali: uma imagem nova (base64), uma imagem ja existente
 * que so mudou de posicao (url, validada contra a lista atual pra nao aceitar
 * url arbitraria), ou nada (removida / nunca preenchida). */
$novos = [];
for ($n = 1; $n <= 3; $n++) {
  $remover = !empty($dados["flyer_{$n}_remover"]);
  $base64 = trim((string) ($dados["flyer_{$n}_base64"] ?? ''));
  $urlExistente = trim((string) ($dados["flyer_{$n}_url"] ?? ''));

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

echo json_encode(['ok' => true, 'flyers' => $novos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
