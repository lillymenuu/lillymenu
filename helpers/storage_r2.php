<?php
/**
 * Cliente minimo para a API S3-compativel do Cloudflare R2, sem SDK (composer
 * nao disponivel neste ambiente/hosting) — so cURL + assinatura AWS SigV4
 * montada na mao, mesmo padrao ja usado no helpers/mailer.php pro SMTP.
 *
 * Configuracao via .env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET, R2_PUBLIC_URL (dominio publico do bucket — custom domain ou o
 * pub-xxxx.r2.dev, preferir custom domain em producao).
 */

if (!function_exists('storage_r2_configurado')) {
  function storage_r2_configurado(): bool {
    return !empty($_ENV['R2_ACCOUNT_ID'])
      && !empty($_ENV['R2_ACCESS_KEY_ID'])
      && !empty($_ENV['R2_SECRET_ACCESS_KEY'])
      && !empty($_ENV['R2_BUCKET'])
      && !empty($_ENV['R2_PUBLIC_URL']);
  }
}

if (!function_exists('storage_r2_content_type')) {
  function storage_r2_content_type(string $ext): string {
    $mapa = [
      'jpg' => 'image/jpeg',
      'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      'pdf' => 'application/pdf',
    ];
    return $mapa[strtolower($ext)] ?? 'application/octet-stream';
  }
}

if (!function_exists('storage_r2_public_base')) {
  function storage_r2_public_base(): string {
    return rtrim((string) ($_ENV['R2_PUBLIC_URL'] ?? ''), '/');
  }
}

if (!function_exists('storage_r2_url')) {
  function storage_r2_url(string $chaveRelativa): string {
    return storage_r2_public_base() . '/' . ltrim($chaveRelativa, '/');
  }
}

if (!function_exists('storage_r2_chave_da_url')) {
  /** Reconstroi a chave do objeto a partir de uma URL publica ja salva no banco.
   *  Retorna null se a URL nao pertencer ao nosso bucket (nao tenta apagar o que nao reconhece). */
  function storage_r2_chave_da_url(string $url): ?string {
    $base = storage_r2_public_base();
    if ($base === '' || strpos($url, $base . '/') !== 0) {
      return null;
    }
    return ltrim(substr($url, strlen($base)), '/');
  }
}

if (!function_exists('storage_r2_assinar_requisicao')) {
  /**
   * Monta URL + headers assinados (AWS SigV4) pra uma requisicao PUT/DELETE
   * no endpoint S3-compativel do R2 (path-style: /{bucket}/{chave}).
   * @return array{url: string, headers: string[]}
   */
  function storage_r2_assinar_requisicao(string $metodo, string $chave, string $payload = '', string $contentType = ''): array {
    $accessKey = (string) $_ENV['R2_ACCESS_KEY_ID'];
    $secretKey = (string) $_ENV['R2_SECRET_ACCESS_KEY'];
    $accountId = (string) $_ENV['R2_ACCOUNT_ID'];
    $bucket = (string) $_ENV['R2_BUCKET'];
    $host = $accountId . '.r2.cloudflarestorage.com';
    $region = 'auto';
    $service = 's3';

    $amzDate = gmdate('Ymd\THis\Z');
    $dateStamp = gmdate('Ymd');

    $chaveCodificada = implode('/', array_map('rawurlencode', explode('/', $chave)));
    $canonicalUri = '/' . rawurlencode($bucket) . '/' . $chaveCodificada;
    $payloadHash = hash('sha256', $payload);

    $headers = [
      'host' => $host,
      'x-amz-content-sha256' => $payloadHash,
      'x-amz-date' => $amzDate,
    ];
    if ($contentType !== '') {
      $headers['content-type'] = $contentType;
    }
    ksort($headers);

    $canonicalHeaders = '';
    foreach ($headers as $k => $v) {
      $canonicalHeaders .= $k . ':' . trim($v) . "\n";
    }
    $signedHeaders = implode(';', array_keys($headers));

    $canonicalRequest = implode("\n", [
      $metodo,
      $canonicalUri,
      '',
      $canonicalHeaders,
      $signedHeaders,
      $payloadHash,
    ]);

    $credentialScope = $dateStamp . '/' . $region . '/' . $service . '/aws4_request';
    $stringToSign = implode("\n", [
      'AWS4-HMAC-SHA256',
      $amzDate,
      $credentialScope,
      hash('sha256', $canonicalRequest),
    ]);

    $kDate = hash_hmac('sha256', $dateStamp, 'AWS4' . $secretKey, true);
    $kRegion = hash_hmac('sha256', $region, $kDate, true);
    $kService = hash_hmac('sha256', $service, $kRegion, true);
    $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
    $signature = hash_hmac('sha256', $stringToSign, $kSigning);

    $authorization = 'AWS4-HMAC-SHA256 Credential=' . $accessKey . '/' . $credentialScope
      . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $signature;

    $headersFinal = [
      'Host: ' . $host,
      'x-amz-content-sha256: ' . $payloadHash,
      'x-amz-date: ' . $amzDate,
      'Authorization: ' . $authorization,
    ];
    if ($contentType !== '') {
      $headersFinal[] = 'Content-Type: ' . $contentType;
    }

    return [
      'url' => 'https://' . $host . $canonicalUri,
      'headers' => $headersFinal,
    ];
  }
}

if (!function_exists('storage_r2_put')) {
  function storage_r2_put(string $chave, string $conteudo, string $contentType): bool {
    $req = storage_r2_assinar_requisicao('PUT', $chave, $conteudo, $contentType);
    $ch = curl_init($req['url']);
    curl_setopt_array($ch, [
      CURLOPT_CUSTOMREQUEST => 'PUT',
      CURLOPT_POSTFIELDS => $conteudo,
      CURLOPT_HTTPHEADER => $req['headers'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 30,
    ]);
    $resposta = curl_exec($ch);
    $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erroCurl = curl_error($ch);
    curl_close($ch);
    if ($resposta === false || $codigo < 200 || $codigo >= 300) {
      error_log('[storage_r2] Falha ao enviar "' . $chave . '" (HTTP ' . $codigo . '): ' . $erroCurl . ' ' . substr((string) $resposta, 0, 300));
      return false;
    }
    return true;
  }
}

if (!function_exists('storage_r2_delete')) {
  function storage_r2_delete(string $chave): bool {
    $req = storage_r2_assinar_requisicao('DELETE', $chave);
    $ch = curl_init($req['url']);
    curl_setopt_array($ch, [
      CURLOPT_CUSTOMREQUEST => 'DELETE',
      CURLOPT_HTTPHEADER => $req['headers'],
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 30,
    ]);
    $resposta = curl_exec($ch);
    $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erroCurl = curl_error($ch);
    curl_close($ch);
    // S3/R2 retorna 204 mesmo se o objeto ja nao existir - trata como sucesso.
    if ($resposta === false || !in_array($codigo, [200, 204, 404], true)) {
      error_log('[storage_r2] Falha ao apagar "' . $chave . '" (HTTP ' . $codigo . '): ' . $erroCurl);
      return false;
    }
    return true;
  }
}
