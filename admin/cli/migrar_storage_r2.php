<?php
/*
 * Script de migracao unica: sobe pro R2 os arquivos que hoje estao em disco
 * local (admin/assets/uploads/...) e atualiza a coluna/linha correspondente
 * no banco pra apontar pra URL do R2 em vez do caminho local.
 *
 * Idempotente — so migra valores que ainda NAO comecam com http(s)://, entao
 * pode rodar mais de uma vez (ex.: reprocessar falhas) sem duplicar nada.
 * Nao apaga os arquivos locais originais (fica como backup ate confirmar que
 * esta tudo servindo certo do R2).
 *
 * Uso: php admin/cli/migrar_storage_r2.php
 */

if (php_sapi_name() !== 'cli') {
  http_response_code(403);
  exit('Este script so pode ser executado via linha de comando.');
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/storage.php';

if (!storage_r2_configurado()) {
  echo "R2 nao configurado no .env (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_URL). Nada a fazer.\n";
  exit(1);
}

/** Migra uma coluna de arquivo com PK simples (id AUTO_INCREMENT). */
function migrarColuna(PDO $conn, string $tabela, string $colunaArquivo, string $colunaId = 'id'): void {
  if (!tabelaOuColunaExiste($conn, $tabela, $colunaArquivo)) {
    return;
  }
  $sql = "SELECT {$colunaId} AS pk, {$colunaArquivo} AS arquivo FROM {$tabela}
          WHERE {$colunaArquivo} IS NOT NULL AND {$colunaArquivo} <> '' AND {$colunaArquivo} NOT LIKE 'http%'";
  $linhas = $conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
  [$ok, $falhas] = migrarLinhas($conn, $linhas, function ($novaUrl, $pk) use ($conn, $tabela, $colunaArquivo, $colunaId) {
    $conn->prepare("UPDATE {$tabela} SET {$colunaArquivo} = ? WHERE {$colunaId} = ?")->execute([$novaUrl, $pk]);
  });
  echo "{$tabela}.{$colunaArquivo}: {$ok}/" . count($linhas) . " migrado(s), {$falhas} falha(s)/pulado(s)\n";
}

/** Migra linhas chave/valor da tabela "configuracoes" (PK composta: chave + loja_id). */
function migrarConfiguracoes(PDO $conn, array $chaves): void {
  if (!tabelaOuColunaExiste($conn, 'configuracoes', 'valor')) {
    return;
  }
  $placeholders = implode(',', array_fill(0, count($chaves), '?'));
  $stmt = $conn->prepare("
    SELECT chave, loja_id, valor FROM configuracoes
    WHERE chave IN ({$placeholders}) AND valor IS NOT NULL AND valor <> '' AND valor NOT LIKE 'http%'
  ");
  $stmt->execute($chaves);
  $linhas = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $ok = 0;
  $falhas = 0;
  foreach ($linhas as $linha) {
    $novaUrl = migrarArquivo($linha['valor'], "configuracoes#{$linha['chave']}/loja{$linha['loja_id']}");
    if ($novaUrl === null) {
      $falhas++;
      continue;
    }
    $conn->prepare("UPDATE configuracoes SET valor = ? WHERE chave = ? AND loja_id = ?")
      ->execute([$novaUrl, $linha['chave'], $linha['loja_id']]);
    $ok++;
  }
  echo "configuracoes (loja_capa/loja_perfil): {$ok}/" . count($linhas) . " migrado(s), {$falhas} falha(s)/pulado(s)\n";
}

/** Migra linhas chave/valor da tabela "landing_config" (PK simples: id). */
function migrarLandingConfig(PDO $conn, array $chaves): void {
  if (!tabelaOuColunaExiste($conn, 'landing_config', 'valor')) {
    return;
  }
  $placeholders = implode(',', array_fill(0, count($chaves), '?'));
  $stmt = $conn->prepare("
    SELECT id, valor FROM landing_config
    WHERE chave IN ({$placeholders}) AND valor IS NOT NULL AND valor <> '' AND valor NOT LIKE 'http%'
  ");
  $stmt->execute($chaves);
  $linhas = $stmt->fetchAll(PDO::FETCH_ASSOC);
  [$ok, $falhas] = migrarLinhas($conn, array_map(fn($l) => ['pk' => $l['id'], 'arquivo' => $l['valor']], $linhas), function ($novaUrl, $pk) use ($conn) {
    $conn->prepare("UPDATE landing_config SET valor = ? WHERE id = ?")->execute([$novaUrl, $pk]);
  });
  echo "landing_config: {$ok}/" . count($linhas) . " migrado(s), {$falhas} falha(s)/pulado(s)\n";
}

/** @param callable(string,mixed):void $atualizar */
function migrarLinhas(PDO $conn, array $linhas, callable $atualizar): array {
  $ok = 0;
  $falhas = 0;
  foreach ($linhas as $linha) {
    $novaUrl = migrarArquivo($linha['arquivo'], "{$linha['pk']}");
    if ($novaUrl === null) {
      $falhas++;
      continue;
    }
    $atualizar($novaUrl, $linha['pk']);
    $ok++;
  }
  return [$ok, $falhas];
}

function migrarArquivo(string $caminhoRelativo, string $rotulo): ?string {
  $caminhoAbsoluto = __DIR__ . '/../../admin/' . $caminhoRelativo;
  if (!is_file($caminhoAbsoluto)) {
    echo "  [pulado] {$rotulo}: arquivo nao encontrado em disco ({$caminhoRelativo})\n";
    return null;
  }
  $conteudo = file_get_contents($caminhoAbsoluto);
  if ($conteudo === false) {
    echo "  [pulado] {$rotulo}: erro ao ler o arquivo ({$caminhoRelativo})\n";
    return null;
  }
  $ext = strtolower(pathinfo($caminhoRelativo, PATHINFO_EXTENSION));
  if (!storage_r2_put($caminhoRelativo, $conteudo, storage_r2_content_type($ext))) {
    echo "  [falhou] {$rotulo}: erro ao enviar pro R2 ({$caminhoRelativo})\n";
    return null;
  }
  return storage_r2_url($caminhoRelativo);
}

function tabelaOuColunaExiste(PDO $conn, string $tabela, string $coluna): bool {
  try {
    $stmt = $conn->prepare("SHOW COLUMNS FROM {$tabela} LIKE ?");
    $stmt->execute([$coluna]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

echo "Migrando arquivos locais para o R2...\n\n";

migrarColuna($conn, 'produtos', 'imagem');
migrarColuna($conn, 'produtos', 'promo_imagem');
migrarColuna($conn, 'combos', 'imagem');
migrarColuna($conn, 'admins', 'foto');
migrarColuna($conn, 'suporte_mensagens', 'anexo_arquivo');
migrarColuna($conn, 'cobrancas', 'comprovante_arquivo');
migrarConfiguracoes($conn, ['loja_capa', 'loja_perfil']);
migrarLandingConfig($conn, [
  'logo_image', 'solucao1_imagem', 'solucao2_imagem', 'solucao3_imagem',
  'solucao4_imagem', 'solucao5_imagem', 'segmentos_imagem', 'planos_hero_imagem',
]);

echo "\nConcluido. Os arquivos locais originais NAO foram apagados — confirme que\n";
echo "tudo esta carregando certo do R2 antes de limpar admin/assets/uploads/.\n";
