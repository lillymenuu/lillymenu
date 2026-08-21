<?php

date_default_timezone_set('America/Fortaleza');

if (!function_exists('garantirMercadopagoColunas')) {
  function garantirMercadopagoColunas(PDO $conn): void {
    try {
      $col = $conn->query("SHOW COLUMNS FROM cobrancas LIKE 'origem'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN origem ENUM('manual','mercadopago') NOT NULL DEFAULT 'manual'");
      }
      $col = $conn->query("SHOW COLUMNS FROM cobrancas LIKE 'mp_payment_id'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN mp_payment_id VARCHAR(64) NULL DEFAULT NULL, ADD UNIQUE KEY uq_cobrancas_mp_payment_id (mp_payment_id)");
      }
      $col = $conn->query("SHOW COLUMNS FROM cobrancas LIKE 'mp_qr_code'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN mp_qr_code TEXT NULL DEFAULT NULL");
      }
      $col = $conn->query("SHOW COLUMNS FROM cobrancas LIKE 'mp_qr_code_base64'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN mp_qr_code_base64 MEDIUMTEXT NULL DEFAULT NULL");
      }
      $col = $conn->query("SHOW COLUMNS FROM cobrancas LIKE 'mp_expiracao'")->fetch();
      if (!$col) {
        $conn->exec("ALTER TABLE cobrancas ADD COLUMN mp_expiracao DATETIME NULL DEFAULT NULL");
      }
    } catch (Throwable $e) {
    }
  }
}

/**
 * Cria uma cobranca Pix na API do Mercado Pago.
 * $dados: ['valor'=>float, 'descricao'=>string, 'email_pagador'=>string, 'referencia_externa'=>string, 'chave_idempotencia'=>string]
 * @return array{ok:bool, id:?string, qr_code:?string, qr_code_base64:?string, expira_em:?string, erro:?string}
 */
if (!function_exists('mpCriarPagamentoPix')) {
  function mpCriarPagamentoPix(array $dados): array {
    $accessToken = trim((string) ($_ENV['MP_ACCESS_TOKEN'] ?? ''));
    if ($accessToken === '') {
      return ['ok' => false, 'id' => null, 'qr_code' => null, 'qr_code_base64' => null, 'expira_em' => null, 'erro' => 'Mercado Pago nao configurado (MP_ACCESS_TOKEN ausente).'];
    }

    // Mercado Pago exige o formato ISO-8601 completo, incluindo milissegundos
    // (ex: 2026-08-10T15:57:00.000-03:00) — sem os ".000" ele rejeita como formato invalido.
    // 2h de folga (era 30min) pra loja nao correr risco de escanear o Pix e o banco
    // recusar por "expirado" antes de dar tempo de concluir o pagamento.
    $expiraEm = date('Y-m-d\TH:i:s.000P', strtotime('+2 hours'));

    $body = [
      'transaction_amount' => (float) $dados['valor'],
      'description'        => (string) $dados['descricao'],
      'payment_method_id'  => 'pix',
      'external_reference' => (string) $dados['referencia_externa'],
      'date_of_expiration'  => $expiraEm,
      'payer'               => [
        'email' => (string) $dados['email_pagador'],
      ],
    ];

    $ch = curl_init('https://api.mercadopago.com/v1/payments');
    curl_setopt_array($ch, [
      CURLOPT_POST           => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 15,
      CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $accessToken,
        'X-Idempotency-Key: ' . (string) $dados['chave_idempotencia'],
      ],
      CURLOPT_POSTFIELDS => json_encode($body),
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErro = curl_error($ch);
    curl_close($ch);

    if ($curlErro) {
      return ['ok' => false, 'id' => null, 'qr_code' => null, 'qr_code_base64' => null, 'expira_em' => null, 'erro' => 'Erro de conexao com o Mercado Pago: ' . $curlErro];
    }

    $respData = json_decode((string) $resp, true);

    if ($httpCode < 200 || $httpCode >= 300) {
      $motivo = $respData['message'] ?? $resp;
      return ['ok' => false, 'id' => null, 'qr_code' => null, 'qr_code_base64' => null, 'expira_em' => null, 'erro' => 'Mercado Pago retornou HTTP ' . $httpCode . ': ' . (is_string($motivo) ? $motivo : json_encode($motivo))];
    }

    $transacao = $respData['point_of_interaction']['transaction_data'] ?? [];

    return [
      'ok'             => true,
      'id'             => isset($respData['id']) ? (string) $respData['id'] : null,
      'qr_code'        => $transacao['qr_code'] ?? null,
      'qr_code_base64' => $transacao['qr_code_base64'] ?? null,
      'expira_em'      => $respData['date_of_expiration'] ?? $expiraEm,
      'erro'           => null,
    ];
  }
}

/**
 * Consulta o status atual de um pagamento direto na API do Mercado Pago (nunca confiar
 * em valores vindos do corpo do webhook — sempre reconsultar por aqui antes de liberar acesso).
 */
if (!function_exists('mpConsultarPagamento')) {
  function mpConsultarPagamento(string $paymentId): ?array {
    $accessToken = trim((string) ($_ENV['MP_ACCESS_TOKEN'] ?? ''));
    if ($accessToken === '' || $paymentId === '') {
      return null;
    }

    $ch = curl_init('https://api.mercadopago.com/v1/payments/' . rawurlencode($paymentId));
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT        => 15,
      CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . $accessToken,
      ],
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErro = curl_error($ch);
    curl_close($ch);

    if ($curlErro || $httpCode < 200 || $httpCode >= 300) {
      return null;
    }

    $respData = json_decode((string) $resp, true);
    return is_array($respData) ? $respData : null;
  }
}

/**
 * Valida a assinatura do webhook do Mercado Pago (header x-signature: "ts=...,v1=...",
 * mais o header x-request-id). Timing-safe via hash_equals().
 */
if (!function_exists('mpValidarAssinaturaWebhook')) {
  function mpValidarAssinaturaWebhook(string $xSignature, string $xRequestId, string $dataId): bool {
    $webhookSecret = trim((string) ($_ENV['MP_WEBHOOK_SECRET'] ?? ''));
    if ($webhookSecret === '' || $xSignature === '') {
      return false;
    }

    $partes = [];
    foreach (explode(',', $xSignature) as $parte) {
      $kv = explode('=', $parte, 2);
      if (count($kv) === 2) {
        $partes[trim($kv[0])] = trim($kv[1]);
      }
    }
    $ts = $partes['ts'] ?? '';
    $v1 = $partes['v1'] ?? '';
    if ($ts === '' || $v1 === '') {
      return false;
    }

    $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";
    $calculado = hash_hmac('sha256', $manifest, $webhookSecret);

    return hash_equals($calculado, $v1);
  }
}

/**
 * Confirma o pagamento de uma cobranca e estende a assinatura por 30 dias a partir de agora.
 * Usada tanto pela aprovacao manual (comprovante) quanto pela confirmacao automatica via Pix.
 * Idempotente: chamar duas vezes para a mesma cobranca ja paga nao soma dias de novo.
 */
if (!function_exists('confirmarPagamentoAssinatura')) {
  function confirmarPagamentoAssinatura(PDO $conn, int $cobrancaId, ?string $mpPaymentId = null): bool {
    $conn->beginTransaction();
    try {
      $stmt = $conn->prepare("SELECT c.id, c.status, c.assinatura_id, a.loja_id FROM cobrancas c INNER JOIN assinaturas a ON a.id = c.assinatura_id WHERE c.id = ? LIMIT 1 FOR UPDATE");
      $stmt->execute([$cobrancaId]);
      $cobranca = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$cobranca) {
        $conn->rollBack();
        return false;
      }

      if ($cobranca['status'] === 'pago') {
        $conn->commit();
        return true;
      }

      $assinaturaId = (int) $cobranca['assinatura_id'];
      $lojaId = (int) $cobranca['loja_id'];

      $stmt = $conn->prepare("UPDATE cobrancas SET status = 'pago', pago_em = NOW(), mp_payment_id = COALESCE(?, mp_payment_id) WHERE id = ? AND status != 'pago'");
      $stmt->execute([$mpPaymentId, $cobrancaId]);

      $conn->prepare("
        UPDATE assinaturas
        SET status = 'ativa', ciclo_inicio = CURDATE(), ciclo_fim = DATE_ADD(CURDATE(), INTERVAL 30 DAY), bloqueada_em = NULL
        WHERE id = ?
      ")->execute([$assinaturaId]);
      $conn->prepare("UPDATE lojas SET ativo = 1 WHERE id = ?")->execute([$lojaId]);
      $conn->prepare("UPDATE admins SET ativo = 1 WHERE loja_id = ?")->execute([$lojaId]);

      $conn->commit();
      return true;
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      return false;
    }
  }
}
