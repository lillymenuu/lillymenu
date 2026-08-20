<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../../helpers/storage.php';

header('Content-Type: application/json');

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

function boolFlag($valor): bool {
  return (string) $valor === '1' || $valor === 1 || $valor === true;
}

function toFloatConfig($valor): float {
  if ($valor === null) {
    return 0.0;
  }
  $valor = str_replace(',', '.', (string) $valor);
  $valor = preg_replace('/[^0-9.]/', '', $valor);
  return (float) $valor;
}

function validarCustomJson($json): bool {
  if ($json === '') {
    return true;
  }
  $decoded = json_decode((string) $json, true);
  if (!is_array($decoded)) {
    return false;
  }
  foreach ($decoded as $item) {
    if (!is_array($item)) {
      return false;
    }
    $slug = trim((string) ($item['slug'] ?? ''));
    $label = trim((string) ($item['label'] ?? ''));
    if ($slug === '' || $label === '') {
      return false;
    }
  }
  return true;
}

function obterConfigValor(PDO $conn, string $chave, int $lojaId): ?string {
  $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE chave = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$chave, $lojaId]);
  $valor = $stmt->fetchColumn();
  if ($valor !== false) {
    return $valor;
  }
  return null;
}

function salvarImagemConfig(string $base64, string $prefixo, ?int $lojaId = null): ?string {
  return storage_save_base64($base64, 'loja', $prefixo, $lojaId);
}

function removerImagemConfig(?string $relPath): void {
  storage_delete($relPath);
}

$erros = [];

if (isset($_POST['cashback_ativo']) || isset($_POST['cashback_percentual']) || isset($_POST['cashback_expira_dias'])) {
  $cashbackAtivo = boolFlag($_POST['cashback_ativo'] ?? '0');
  $cashbackPercentual = toFloatConfig($_POST['cashback_percentual'] ?? 0);
  $cashbackDias = (int) ($_POST['cashback_expira_dias'] ?? 0);

  if ($cashbackAtivo) {
    if ($cashbackDias <= 0) {
      $erros[] = 'Informe quantos dias o cashback deve expirar.';
    }
    if ($cashbackPercentual <= 0 || $cashbackPercentual > 100) {
      $erros[] = 'Informe um percentual de cashback valido.';
    }
  }
}

if (isset($_POST['pagamento_pix_ativo']) || isset($_POST['pagamento_credito_ativo']) || isset($_POST['pagamento_debito_ativo'])) {
  $pixAtivo = boolFlag($_POST['pagamento_pix_ativo'] ?? '0');
  if ($pixAtivo) {
    $pixChave = trim((string) ($_POST['pagamento_pix_chave'] ?? ''));
    $pixNome = trim((string) ($_POST['pagamento_pix_nome'] ?? ''));
    if ($pixChave === '' || $pixNome === '') {
      $erros[] = 'Preencha os dados do Pix.';
    }
  }

  $creditoAtivo = boolFlag($_POST['pagamento_credito_ativo'] ?? '0');
  if ($creditoAtivo) {
    $bandeiras = trim((string) ($_POST['pagamento_credito_bandeiras'] ?? ''));
    if ($bandeiras === '') {
      $erros[] = 'Selecione ao menos uma bandeira de credito.';
    }
  }

  $debitoAtivo = boolFlag($_POST['pagamento_debito_ativo'] ?? '0');
  if ($debitoAtivo) {
    $bandeiras = trim((string) ($_POST['pagamento_debito_bandeiras'] ?? ''));
    if ($bandeiras === '') {
      $erros[] = 'Selecione ao menos uma bandeira de debito.';
    }
  }

  $creditoTaxaAtiva = boolFlag($_POST['pagamento_credito_taxa_ativa'] ?? '0');
  if ($creditoTaxaAtiva) {
    $taxa = toFloatConfig($_POST['pagamento_credito_taxa'] ?? 0);
    if ($taxa <= 0 || $taxa > 100) {
      $erros[] = 'Informe uma taxa valida para credito.';
    }
  }

  $debitoTaxaAtiva = boolFlag($_POST['pagamento_debito_taxa_ativa'] ?? '0');
  if ($debitoTaxaAtiva) {
    $taxa = toFloatConfig($_POST['pagamento_debito_taxa'] ?? 0);
    if ($taxa <= 0 || $taxa > 100) {
      $erros[] = 'Informe uma taxa valida para debito.';
    }
  }

  if (isset($_POST['pagamento_credito_bandeiras_custom']) && !validarCustomJson($_POST['pagamento_credito_bandeiras_custom'])) {
    $erros[] = 'Bandeiras customizadas de credito invalidas.';
  }
  if (isset($_POST['pagamento_debito_bandeiras_custom']) && !validarCustomJson($_POST['pagamento_debito_bandeiras_custom'])) {
    $erros[] = 'Bandeiras customizadas de debito invalidas.';
  }
}

if ($erros) {
  echo json_encode(['ok'=>false, 'msg'=>$erros[0]]);
  exit;
}

$conn->beginTransaction();

try {
  $imagemCampos = [
    'loja_capa' => ['base64' => 'loja_capa_base64', 'remover' => 'loja_capa_remover'],
    'loja_perfil' => ['base64' => 'loja_perfil_base64', 'remover' => 'loja_perfil_remover']
  ];

  foreach ($imagemCampos as $chave => $mapa) {
    $base64 = trim((string) ($_POST[$mapa['base64']] ?? ''));
    $remover = boolFlag($_POST[$mapa['remover']] ?? '0');
    unset($_POST[$mapa['base64']], $_POST[$mapa['remover']]);

    if ($base64 === '' && !$remover) {
      continue;
    }

    $atual = obterConfigValor($conn, $chave, $lojaId);

    if ($remover) {
      removerImagemConfig($atual);
      $_POST[$chave] = '';
      continue;
    }

    $nova = salvarImagemConfig($base64, $chave, $lojaId);
    if (!$nova) {
      throw new Exception('Imagem invalida.');
    }
    $_POST[$chave] = $nova;
    if ($atual && $atual !== $nova) {
      removerImagemConfig($atual);
    }
  }

  foreach ($_POST as $chave => $valor) {

    if ($chave === 'dias_funcionamento') {
      $valor = implode(',', array_map('intval', $valor));
    }

    $stmt = $conn->prepare("
      INSERT INTO configuracoes (loja_id, chave, valor)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
    ");
    $stmt->execute([$lojaId, $chave, $valor]);
  }

  $conn->commit();
  echo json_encode(['ok'=>true]);

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false, 'msg'=>$e->getMessage() ?: 'Erro ao salvar.']);
}
