<?php
/**
 * Envio de e-mail via SMTP usando cURL (sem dependencia externa/composer).
 * Configuracao lida do .env: MAIL_HOST, MAIL_PORT, MAIL_ENCRYPTION (ssl|tls),
 * MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_ADDRESS, MAIL_FROM_NAME.
 */

if (!function_exists('mailerConfigurado')) {
  function mailerConfigurado(): bool {
    return !empty($_ENV['MAIL_HOST']) && !empty($_ENV['MAIL_USERNAME']) && !empty($_ENV['MAIL_PASSWORD']);
  }
}

if (!function_exists('mailerCodificarCabecalho')) {
  function mailerCodificarCabecalho(string $texto): string {
    return mb_encode_mimeheader($texto, 'UTF-8', 'B', "\r\n");
  }
}

if (!function_exists('mailerMontarMensagem')) {
  function mailerMontarMensagem(string $fromEmail, string $fromNome, string $paraEmail, string $paraNome, string $assunto, string $corpoHtml): string {
    $headers = [
      'Date: ' . date('r'),
      'From: ' . mailerCodificarCabecalho($fromNome) . " <{$fromEmail}>",
      'To: ' . mailerCodificarCabecalho($paraNome) . " <{$paraEmail}>",
      'Subject: ' . mailerCodificarCabecalho($assunto),
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
    ];
    return implode("\r\n", $headers) . "\r\n\r\n" . $corpoHtml . "\r\n";
  }
}

if (!function_exists('enviarEmail')) {
  /**
   * @return array{ok: bool, erro?: string}
   */
  function enviarEmail(string $destinatario, string $destinatarioNome, string $assunto, string $corpoHtml): array {
    if (!mailerConfigurado()) {
      error_log('[mailer] SMTP nao configurado - email nao enviado para ' . $destinatario);
      return ['ok' => false, 'erro' => 'SMTP nao configurado'];
    }
    if (!filter_var($destinatario, FILTER_VALIDATE_EMAIL)) {
      return ['ok' => false, 'erro' => 'Destinatario invalido'];
    }

    $host = (string) $_ENV['MAIL_HOST'];
    $port = (int) ($_ENV['MAIL_PORT'] ?? 587);
    $usuario = (string) $_ENV['MAIL_USERNAME'];
    $senha = (string) $_ENV['MAIL_PASSWORD'];
    $encriptacao = strtolower((string) ($_ENV['MAIL_ENCRYPTION'] ?? 'ssl'));
    $fromEmail = (string) ($_ENV['MAIL_FROM_ADDRESS'] ?? $usuario);
    $fromNome = (string) ($_ENV['MAIL_FROM_NAME'] ?? 'LillyMenu');

    $scheme = $encriptacao === 'ssl' ? 'smtps' : 'smtp';
    $url = "{$scheme}://{$host}:{$port}";

    $mensagem = mailerMontarMensagem($fromEmail, $fromNome, $destinatario, $destinatarioNome, $assunto, $corpoHtml);

    $stream = fopen('php://temp', 'r+');
    fwrite($stream, $mensagem);
    rewind($stream);

    $ch = curl_init();
    $opcoes = [
      CURLOPT_URL => $url,
      CURLOPT_USERNAME => $usuario,
      CURLOPT_PASSWORD => $senha,
      CURLOPT_MAIL_FROM => "<{$fromEmail}>",
      CURLOPT_MAIL_RCPT => ["<{$destinatario}>"],
      CURLOPT_UPLOAD => true,
      CURLOPT_INFILE => $stream,
      CURLOPT_INFILESIZE => strlen($mensagem),
      CURLOPT_TIMEOUT => 20,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
    ];
    if ($scheme === 'smtp') {
      $opcoes[CURLOPT_USE_SSL] = CURLUSESSL_ALL;
    }
    curl_setopt_array($ch, $opcoes);

    $resultado = curl_exec($ch);
    $erro = curl_error($ch);
    $sucesso = $resultado !== false;
    curl_close($ch);
    fclose($stream);

    if (!$sucesso) {
      error_log('[mailer] Falha ao enviar email para ' . $destinatario . ': ' . $erro);
      return ['ok' => false, 'erro' => $erro];
    }
    return ['ok' => true];
  }
}
