<?php
/**
 * Armazenamento de imagens/arquivos enviados pelo usuario (produtos, combos,
 * capa/perfil da loja, promocoes, landing, avatar do superadmin, anexos de
 * suporte, comprovantes de pagamento).
 *
 * Quando o R2 esta configurado (.env com R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/
 * R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_URL, ver storage_r2.php), os
 * arquivos vao pro object storage e a string salva no banco passa a ser a URL
 * completa do CDN. Sem R2 configurado (ex.: dev local sem essas variaveis),
 * cai automaticamente pro disco local em admin/assets/uploads/... (mesmo
 * comportamento de antes da migracao). Quem chama essas funcoes nunca precisa
 * saber qual dos dois esta em uso — so recebe de volta uma string pronta pra
 * gravar na coluna do banco e pronta pra virar <img src> via storage_url_*.
 */

require_once __DIR__ . '/storage_r2.php';

if (!function_exists('storage_dir_relativa')) {
  function storage_dir_relativa(string $categoria, ?int $lojaId = null): string {
    $rel = 'assets/uploads/' . $categoria;
    if ($lojaId) {
      $rel .= '/' . $lojaId;
    }
    return $rel;
  }
}

if (!function_exists('storage_dir_absoluta')) {
  function storage_dir_absoluta(string $categoria, ?int $lojaId = null): string {
    return __DIR__ . '/../admin/' . storage_dir_relativa($categoria, $lojaId);
  }
}

if (!function_exists('storage_save_base64')) {
  /**
   * Salva uma imagem enviada como data-URI base64 (formularios que fazem
   * crop/preview no navegador antes de enviar). Retorna a string pronta pra
   * gravar na coluna do banco (URL do R2 se configurado, senao caminho local
   * relativo), ou null se o conteudo for invalido ou o upload falhar.
   */
  function storage_save_base64(string $dataUri, string $categoria, string $prefixo, ?int $lojaId = null): ?string {
    if (!preg_match('/^data:image\/(png|jpe?g|webp);base64,/', $dataUri, $match)) {
      return null;
    }
    $dados = base64_decode(substr($dataUri, strpos($dataUri, ',') + 1));
    if ($dados === false) {
      return null;
    }
    $ext = $match[1] === 'jpeg' ? 'jpg' : $match[1];
    $nome = $prefixo . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $chaveRel = storage_dir_relativa($categoria, $lojaId) . '/' . $nome;

    if (storage_r2_configurado()) {
      if (!storage_r2_put($chaveRel, $dados, storage_r2_content_type($ext))) {
        return null;
      }
      return storage_r2_url($chaveRel);
    }

    $dirAbs = storage_dir_absoluta($categoria, $lojaId);
    if (!is_dir($dirAbs)) {
      mkdir($dirAbs, 0775, true);
    }
    if (file_put_contents($dirAbs . '/' . $nome, $dados) === false) {
      return null;
    }
    return $chaveRel;
  }
}

if (!function_exists('storage_save_upload')) {
  /**
   * Salva um arquivo enviado via $_FILES tradicional (multipart/form-data).
   * Retorna a string pronta pra gravar na coluna do banco (URL do R2 se
   * configurado, senao caminho local relativo), ou null se o campo
   * simplesmente nao veio preenchido (UPLOAD_ERR_NO_FILE). Lanca
   * RuntimeException nos demais erros (arquivo invalido, grande demais,
   * falha ao salvar) — mesmo padrao ja usado pelos endpoints que tratam
   * upload com try/catch.
   */
  function storage_save_upload(
    array $arquivo,
    string $categoria,
    string $prefixo,
    ?int $lojaId = null,
    array $extensoesPermitidas = ['jpg', 'jpeg', 'png', 'webp'],
    int $tamanhoMaximoBytes = 5242880
  ): ?string {
    if (($arquivo['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
      return null;
    }
    if ($arquivo['error'] !== UPLOAD_ERR_OK) {
      throw new RuntimeException('Erro ao enviar o arquivo.');
    }
    $ext = strtolower(pathinfo($arquivo['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, $extensoesPermitidas, true)) {
      throw new RuntimeException('Arquivo invalido (use ' . strtoupper(implode(', ', $extensoesPermitidas)) . ').');
    }
    if (($arquivo['size'] ?? 0) > $tamanhoMaximoBytes) {
      throw new RuntimeException('Arquivo muito grande (maximo ' . round($tamanhoMaximoBytes / 1024 / 1024) . 'MB).');
    }
    $nome = $prefixo . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $chaveRel = storage_dir_relativa($categoria, $lojaId) . '/' . $nome;

    if (storage_r2_configurado()) {
      $conteudo = file_get_contents($arquivo['tmp_name']);
      if ($conteudo === false) {
        throw new RuntimeException('Erro ao ler o arquivo enviado.');
      }
      if (!storage_r2_put($chaveRel, $conteudo, storage_r2_content_type($ext))) {
        throw new RuntimeException('Erro ao enviar o arquivo para o armazenamento.');
      }
      return storage_r2_url($chaveRel);
    }

    $dirAbs = storage_dir_absoluta($categoria, $lojaId);
    if (!is_dir($dirAbs)) {
      @mkdir($dirAbs, 0775, true);
    }
    if (!move_uploaded_file($arquivo['tmp_name'], $dirAbs . '/' . $nome)) {
      throw new RuntimeException('Erro ao salvar o arquivo.');
    }
    return $chaveRel;
  }
}

if (!function_exists('storage_delete')) {
  /**
   * Remove um arquivo gravado anteriormente, dado o valor salvo no banco —
   * tanto faz se e uma URL do R2 ou um caminho local relativo (suporta os
   * dois ao mesmo tempo, o que permite migrar aos poucos sem quebrar nada).
   * Se for uma URL que nao pertence ao nosso bucket R2, nao faz nada (nunca
   * tenta apagar algo que nao reconhece).
   */
  function storage_delete(?string $caminho): void {
    if (!$caminho) {
      return;
    }
    if (preg_match('#^https?://#i', $caminho)) {
      if (storage_r2_configurado()) {
        $chave = storage_r2_chave_da_url($caminho);
        if ($chave !== null) {
          storage_r2_delete($chave);
        }
      }
      return;
    }
    $raizUploads = realpath(__DIR__ . '/../admin/assets/uploads');
    $arquivo = realpath(__DIR__ . '/../admin/' . $caminho);
    if ($raizUploads && $arquivo && strpos($arquivo, $raizUploads) === 0 && is_file($arquivo)) {
      unlink($arquivo);
    }
  }
}

if (!function_exists('storage_url_relativa')) {
  /**
   * Uso em paginas/endpoints de public/ cujo HTML/JSON e sempre consumido a
   * partir de uma pagina em public/ — a resolucao do "../admin/" acontece no
   * NAVEGADOR relativo a URL da pagina (ex.: public/loja.php), nao no arquivo
   * PHP que gerou a string, entao funciona igual saindo de public/*.php ou de
   * public/api/*.php.
   */
  function storage_url_relativa(?string $caminho): string {
    $caminho = trim((string) $caminho);
    if ($caminho === '') {
      return '';
    }
    if (preg_match('#^https?://#i', $caminho)) {
      return $caminho;
    }
    return '../admin/' . ltrim($caminho, '/');
  }
}

if (!function_exists('storage_url_admin_sub')) {
  /**
   * Uso em paginas dentro de uma subpasta de admin/ que serve views (hoje so
   * admin/superadmin/*.php) — o caminho salvo no banco e relativo a admin/,
   * entao precisa subir um nivel ("../") pra resolver a partir dali. Paginas
   * direto em admin/*.php nao precisam disso (o caminho ja resolve sozinho).
   */
  function storage_url_admin_sub(?string $caminho): string {
    $caminho = trim((string) $caminho);
    if ($caminho === '') {
      return '';
    }
    if (preg_match('#^https?://#i', $caminho)) {
      return $caminho;
    }
    return '../' . ltrim($caminho, '/');
  }
}

if (!function_exists('storage_base_absoluta')) {
  function storage_base_absoluta(): string {
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $pos = strpos($scriptName, '/public/');
    if ($pos !== false) {
      return rtrim(substr($scriptName, 0, $pos), '/');
    }
    return rtrim(dirname($scriptName), '/');
  }
}

if (!function_exists('storage_url_absoluta')) {
  /**
   * Uso quando o caminho pode ser consumido fora do contexto normal da
   * pagina (ex.: JSON embutido em atributo onclick, reaproveitado depois de
   * navegacao) — monta uma URL absoluta com protocolo+host, funcionando com
   * qualquer reescrita de URL.
   */
  function storage_url_absoluta(?string $caminho): string {
    $caminho = (string) $caminho;
    if ($caminho === '') {
      return '';
    }
    if (preg_match('#^https?://#i', $caminho) || $caminho[0] === '/') {
      return $caminho;
    }
    $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $proto . $host . storage_base_absoluta() . '/admin/' . ltrim($caminho, '/');
  }
}
