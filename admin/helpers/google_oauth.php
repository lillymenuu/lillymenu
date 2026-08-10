<?php

if (!function_exists('googleOauthClientId')) {
  function googleOauthClientId(): string
  {
    return trim((string) ($_ENV['GOOGLE_CLIENT_ID'] ?? ''));
  }
}

if (!function_exists('googleOauthClientSecret')) {
  function googleOauthClientSecret(): string
  {
    return trim((string) ($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''));
  }
}

if (!function_exists('googleOauthRedirectUri')) {
  function googleOauthRedirectUri(): string
  {
    return trim((string) ($_ENV['GOOGLE_REDIRECT_URI'] ?? ''));
  }
}

if (!function_exists('googleOauthConfigurado')) {
  function googleOauthConfigurado(): bool
  {
    return googleOauthClientId() !== '' && googleOauthClientSecret() !== '' && googleOauthRedirectUri() !== '';
  }
}

if (!function_exists('googleOauthAuthUrl')) {
  function googleOauthAuthUrl(string $state): string
  {
    $params = [
      'client_id' => googleOauthClientId(),
      'redirect_uri' => googleOauthRedirectUri(),
      'response_type' => 'code',
      'scope' => 'openid email profile',
      'access_type' => 'online',
      'prompt' => 'select_account',
      'state' => $state,
    ];
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
  }
}

if (!function_exists('googleOauthTrocarCodigoPorToken')) {
  function googleOauthTrocarCodigoPorToken(string $code): ?array
  {
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 15,
      CURLOPT_POSTFIELDS => http_build_query([
        'code' => $code,
        'client_id' => googleOauthClientId(),
        'client_secret' => googleOauthClientSecret(),
        'redirect_uri' => googleOauthRedirectUri(),
        'grant_type' => 'authorization_code',
      ]),
    ]);
    $resp = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false || $status !== 200) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
  }
}

if (!function_exists('googleOauthBuscarPerfil')) {
  function googleOauthBuscarPerfil(string $accessToken): ?array
  {
    $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 15,
      CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
    ]);
    $resp = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false || $status !== 200) return null;
    $data = json_decode($resp, true);
    return is_array($data) ? $data : null;
  }
}
