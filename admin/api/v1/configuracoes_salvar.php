<?php
/*
 * Versao JSON (Bearer token) de admin/api/configuracoes_save.php — salva em
 * bloco todas as chaves recebidas na tabela `configuracoes` (sem allow-list,
 * mesmo comportamento do legado), com tratamento especial pra imagem
 * (loja_capa/loja_perfil) e validacao hardcoded de cashback/pagamento.
 *
 * Corpo esperado: JSON com as mesmas chaves que o form legado mandava em
 * $_POST (dias_funcionamento como array de ints, *_base64/*_remover pros
 * campos de imagem).
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../../helpers/storage.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
  $body = [];
}

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

if (isset($body['cashback_ativo']) || isset($body['cashback_percentual']) || isset($body['cashback_expira_dias'])) {
  $cashbackAtivo = boolFlag($body['cashback_ativo'] ?? '0');
  $cashbackPercentual = toFloatConfig($body['cashback_percentual'] ?? 0);
  $cashbackDias = (int) ($body['cashback_expira_dias'] ?? 0);

  if ($cashbackAtivo) {
    if ($cashbackDias <= 0) {
      $erros[] = 'Informe quantos dias o cashback deve expirar.';
    }
    if ($cashbackPercentual <= 0 || $cashbackPercentual > 100) {
      $erros[] = 'Informe um percentual de cashback valido.';
    }
  }
}

if (isset($body['pagamento_pix_ativo']) || isset($body['pagamento_credito_ativo']) || isset($body['pagamento_debito_ativo'])) {
  $pixAtivo = boolFlag($body['pagamento_pix_ativo'] ?? '0');
  if ($pixAtivo) {
    $pixChave = trim((string) ($body['pagamento_pix_chave'] ?? ''));
    $pixNome = trim((string) ($body['pagamento_pix_nome'] ?? ''));
    if ($pixChave === '' || $pixNome === '') {
      $erros[] = 'Preencha os dados do Pix.';
    }
  }

  $creditoAtivo = boolFlag($body['pagamento_credito_ativo'] ?? '0');
  if ($creditoAtivo) {
    $bandeiras = trim((string) ($body['pagamento_credito_bandeiras'] ?? ''));
    if ($bandeiras === '') {
      $erros[] = 'Selecione ao menos uma bandeira de credito.';
    }
  }

  $debitoAtivo = boolFlag($body['pagamento_debito_ativo'] ?? '0');
  if ($debitoAtivo) {
    $bandeiras = trim((string) ($body['pagamento_debito_bandeiras'] ?? ''));
    if ($bandeiras === '') {
      $erros[] = 'Selecione ao menos uma bandeira de debito.';
    }
  }

  $creditoTaxaAtiva = boolFlag($body['pagamento_credito_taxa_ativa'] ?? '0');
  if ($creditoTaxaAtiva) {
    $taxa = toFloatConfig($body['pagamento_credito_taxa'] ?? 0);
    if ($taxa <= 0 || $taxa > 100) {
      $erros[] = 'Informe uma taxa valida para credito.';
    }
  }

  $debitoTaxaAtiva = boolFlag($body['pagamento_debito_taxa_ativa'] ?? '0');
  if ($debitoTaxaAtiva) {
    $taxa = toFloatConfig($body['pagamento_debito_taxa'] ?? 0);
    if ($taxa <= 0 || $taxa > 100) {
      $erros[] = 'Informe uma taxa valida para debito.';
    }
  }

  if (isset($body['pagamento_credito_bandeiras_custom']) && !validarCustomJson($body['pagamento_credito_bandeiras_custom'])) {
    $erros[] = 'Bandeiras customizadas de credito invalidas.';
  }
  if (isset($body['pagamento_debito_bandeiras_custom']) && !validarCustomJson($body['pagamento_debito_bandeiras_custom'])) {
    $erros[] = 'Bandeiras customizadas de debito invalidas.';
  }
}

if ($erros) {
  echo json_encode(['ok'=>false, 'msg'=>$erros[0]], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$conn->beginTransaction();

try {
  $imagemCampos = [
    'loja_capa' => ['base64' => 'loja_capa_base64', 'remover' => 'loja_capa_remover'],
    'loja_perfil' => ['base64' => 'loja_perfil_base64', 'remover' => 'loja_perfil_remover']
  ];

  foreach ($imagemCampos as $chave => $mapa) {
    $base64 = trim((string) ($body[$mapa['base64']] ?? ''));
    $remover = boolFlag($body[$mapa['remover']] ?? '0');
    unset($body[$mapa['base64']], $body[$mapa['remover']]);

    if ($base64 === '' && !$remover) {
      continue;
    }

    $atual = obterConfigValor($conn, $chave, $lojaId);

    if ($remover) {
      removerImagemConfig($atual);
      $body[$chave] = '';
      continue;
    }

    $nova = salvarImagemConfig($base64, $chave, $lojaId);
    if (!$nova) {
      throw new Exception('Imagem invalida.');
    }
    $body[$chave] = $nova;
    if ($atual && $atual !== $nova) {
      removerImagemConfig($atual);
    }
  }

  foreach ($body as $chave => $valor) {

    if ($chave === 'dias_funcionamento') {
      $valor = implode(',', array_map('intval', (array) $valor));
    } elseif (is_array($valor)) {
      $valor = json_encode($valor, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    $stmt = $conn->prepare("
      INSERT INTO configuracoes (loja_id, chave, valor)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
    ");
    $stmt->execute([$lojaId, $chave, $valor]);
  }

  $conn->commit();
  echo json_encode(['ok'=>true], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok'=>false, 'msg'=>$e->getMessage() ?: 'Erro ao salvar.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
