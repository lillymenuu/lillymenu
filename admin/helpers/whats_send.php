<?php

/**
 * Le uma config da Evolution API (loja especifica -> global loja_id=0), mesmo
 * padrao usado em admin/api/whats_api.php.
 */
if (!function_exists('whatsCfgEvolution')) {
  function whatsCfgEvolution(PDO $conn, int $lojaId, string $chave): string
  {
    $stmt = $conn->prepare("SELECT valor FROM configuracoes WHERE loja_id = ? AND chave = ? LIMIT 1");
    $stmt->execute([$lojaId, $chave]);
    $val = $stmt->fetchColumn();
    if ($val === false || $val === '') {
      $stmt->execute([0, $chave]);
      $val = $stmt->fetchColumn();
    }
    return (string) ($val ?: '');
  }
}

/**
 * Verifica se a loja tem a Evolution API configurada (loja especifica ou global),
 * sem tentar enviar nada. Usado para falhar rapido antes de iniciar um broadcast.
 */
if (!function_exists('whatsEvolutionConfigurada')) {
  function whatsEvolutionConfigurada(PDO $conn, int $lojaId): bool
  {
    $url = whatsCfgEvolution($conn, $lojaId, 'evolution_url');
    $token = whatsCfgEvolution($conn, $lojaId, 'evolution_token');
    $inst = whatsCfgEvolution($conn, $lojaId, 'evolution_instance');
    return $url !== '' && $token !== '' && $inst !== '';
  }
}

/**
 * Envia uma mensagem de texto via Evolution API. Mesma logica de
 * admin/api/whats_api.php (acao 'enviar'), extraida para reuso no broadcast
 * da Lista de Transmissao. Nao grava em whats_mensagens/whats_conversas —
 * isso e especifico do chat, quem chamar aqui cuida do proprio log.
 *
 * @return array{ok:bool, whats_msg_id:?string, erro:?string}
 */
if (!function_exists('whatsEnviarMensagem')) {
  function whatsEnviarMensagem(PDO $conn, int $lojaId, string $numero, string $mensagem): array
  {
    $numero = preg_replace('/\D/', '', $numero);
    if (strlen($numero) <= 11) {
      $numero = '55' . $numero;
    }

    $evolutionUrl   = whatsCfgEvolution($conn, $lojaId, 'evolution_url');
    $evolutionToken = whatsCfgEvolution($conn, $lojaId, 'evolution_token');
    $evolutionInst  = whatsCfgEvolution($conn, $lojaId, 'evolution_instance');

    if (!$evolutionUrl || !$evolutionToken || !$evolutionInst) {
      return ['ok' => false, 'whats_msg_id' => null, 'erro' => 'WhatsApp não configurado para esta loja.'];
    }
    if ($numero === '' || $numero === '55') {
      return ['ok' => false, 'whats_msg_id' => null, 'erro' => 'Número de telefone inválido.'];
    }

    $ch = curl_init(rtrim($evolutionUrl, '/') . '/message/sendText/' . $evolutionInst);
    curl_setopt_array($ch, [
      CURLOPT_POST            => true,
      CURLOPT_RETURNTRANSFER  => true,
      CURLOPT_TIMEOUT         => 10,
      CURLOPT_SSL_VERIFYPEER  => false,
      CURLOPT_HTTPHEADER      => ['Content-Type: application/json', 'apikey: ' . $evolutionToken],
      CURLOPT_POSTFIELDS      => json_encode([
        'number' => $numero,
        'text'   => $mensagem,
      ]),
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErro = curl_error($ch);
    curl_close($ch);

    if ($curlErro) {
      return ['ok' => false, 'whats_msg_id' => null, 'erro' => 'Erro de conexão com a Evolution API: ' . $curlErro];
    }
    if ($httpCode >= 200 && $httpCode < 300) {
      $respData = json_decode($resp, true);
      $whatsId  = $respData['key']['id'] ?? null;
      return ['ok' => true, 'whats_msg_id' => $whatsId, 'erro' => null];
    }

    $respData    = json_decode($resp, true);
    $motivoBruto = $respData['message'] ?? $respData['error'] ?? $resp;
    $motivo      = is_string($motivoBruto) ? $motivoBruto : json_encode($motivoBruto);
    return ['ok' => false, 'whats_msg_id' => null, 'erro' => 'Evolution API retornou HTTP ' . $httpCode . ': ' . $motivo];
  }
}
