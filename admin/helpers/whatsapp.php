<?php
require_once __DIR__ . '/config.php';

function estaAberto(PDO $conn): bool {
  /* Verificar fechamento manual pelo admin */
  if (config($conn, 'loja_force_fechada', '0') === '1') {
    return false;
  }

  /* Fuso horário: usa configuração da loja ou padrão Brasil */
  $fusoConfig = config($conn, 'fuso_horario', 'America/Fortaleza');
  try {
    $tz = new DateTimeZone($fusoConfig);
  } catch (Exception $e) {
    $tz = new DateTimeZone('America/Fortaleza');
  }
  $agora = new DateTime('now', $tz);
  $hora  = $agora->format('H:i');

  /* Verificar pausa programada ativa (sobrepoe horario de funcionamento) */
  $lojaIdPausa = $_SESSION['loja_id'] ?? 1;
  try {
    $stmtPausa = $conn->prepare("
      SELECT id FROM pausas_programadas
      WHERE loja_id = ?
        AND CONCAT(data_inicio, ' ', hora_inicio) <= ?
        AND CONCAT(data_fim, ' ', hora_fim) >= ?
      LIMIT 1
    ");
    $stmtPausa->execute([$lojaIdPausa, $agora->format('Y-m-d H:i:s'), $agora->format('Y-m-d H:i:s')]);
    if ($stmtPausa->fetchColumn()) {
      return false;
    }
  } catch (Exception $e) {
    /* tabela pausas_programadas ainda nao existe */
  }

  /*
   * Conversão de dia:
   * PHP date('N'): 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 7=Dom
   * Config dias_semana_full: 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sab
   * Fórmula: configDia = (phpN % 7) + 1
   */
  $phpN      = (int)$agora->format('N');
  $configDia = ($phpN % 7) + 1; // 1=Dom...7=Sab

  /* 1. Verificar horarios_semana (por dia da semana) */
  $horariosSemanaRaw = config($conn, 'horarios_semana', '');
  if ($horariosSemanaRaw) {
    $horariosSemana = json_decode((string)$horariosSemanaRaw, true);
    if (is_array($horariosSemana)) {
      /* tenta chave int e string com conversão correta */
      $horarioDia = $horariosSemana[$configDia]
                 ?? $horariosSemana[(string)$configDia]
                 ?? null;
      if (is_array($horarioDia) && isset($horarioDia['inicio'], $horarioDia['fim'])) {
        $ini = $horarioDia['inicio'];
        $fim = $horarioDia['fim'];
        if (!$ini || !$fim) return false; // dia fechado
        return ($hora >= $ini && $hora <= $fim);
      }
      if ($horarioDia !== null) {
        return false; // dia existe na config mas sem horário
      }
    }
  }

  /* 2. Fallback: horario_abertura / horario_fechamento / dias_funcionamento */
  $abertura   = config($conn, 'horario_abertura');
  $fechamento = config($conn, 'horario_fechamento');
  $dias       = config($conn, 'dias_funcionamento');

  if (!$abertura || !$fechamento) {
    return true; // sem horário → assume aberto
  }

  if ($dias) {
    $diasArr = array_filter(array_map('intval', explode(',', (string)$dias)));
    if ($diasArr && !in_array($configDia, $diasArr)) {
      return false;
    }
  }

  return ($hora >= $abertura && $hora <= $fechamento);
}

function entregaDisponivelAgora(PDO $conn): bool {
  if (config($conn, 'pedido_entrega_ativo', '1') !== '1') {
    return false;
  }

  $ini = trim((string) config($conn, 'horario_entrega_ini', ''));
  $fim = trim((string) config($conn, 'horario_entrega_fim', ''));
  if ($ini === '' || $fim === '') {
    return true; // sem horario configurado -> nao restringe
  }

  $fusoConfig = config($conn, 'fuso_horario', 'America/Fortaleza');
  try {
    $tz = new DateTimeZone($fusoConfig);
  } catch (Exception $e) {
    $tz = new DateTimeZone('America/Fortaleza');
  }
  $hora = (new DateTime('now', $tz))->format('H:i');

  return ($hora >= $ini && $hora <= $fim);
}

function gerarLinkWhatsApp(PDO $conn, array $pedido): string {
  $numero = preg_replace('/\D+/', '', (string) config($conn, 'whatsapp_numero'));
  $msgPad = config($conn, 'whatsapp_msg');

  $linhas = [];
  $linhas[] = $msgPad;
  $linhas[] = '';
  $linhas[] = '*Pedido:*';

  foreach ($pedido['itens'] as $i) {
    $linhas[] = "- {$i['quantidade']}x {$i['nome']}";
  }

  $linhas[] = '';
  $linhas[] = "*Total:* R$ " . number_format($pedido['total'],2,',','.');

  $texto = urlencode(implode("\n", $linhas));
  return "https://wa.me/55{$numero}?text={$texto}";
}
