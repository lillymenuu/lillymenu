<?php
/*
 * Script diario (nao chamado via navegador) que:
 *  1) marca como 'suspensa' as assinaturas cujo ciclo pago (ciclo_fim) ja venceu,
 *     desativando loja/admins junto — hoje isso so acontece de forma lazy quando
 *     alguem da loja loga (admin/protect.php); esse script deixa o dado certo no
 *     banco mesmo sem ninguem logar, o que importa pro dashboard do superadmin.
 *  1b) mesma coisa para trials vencidos (status='trial' com trial_fim no passado),
 *      que antes so eram suspensos de forma lazy — e gera a primeira cobranca
 *      pendente, igual admin/protect.php ja faz nesse caminho lazy.
 *  1c) envia um lembrete via WhatsApp (Evolution API, mesma usada na Lista de
 *      Transmissao) pro numero de contato da loja 3 dias antes do trial vencer —
 *      ate agora o unico aviso era passivo (banner dentro do admin, so visto se
 *      alguem da loja logasse nesses ultimos dias). Dispara uma unica vez por
 *      loja, no dia exato em que faltam 3 dias (nao reenvia nos dias seguintes).
 *  2) marca como 'atrasado' as cobrancas Pix (Mercado Pago) que ficaram 'pendente'
 *     e cujo QR Code ja expirou (mp_expiracao no passado), pra nao ficarem
 *     penduradas como "pendente" pra sempre.
 *
 * Primeiro script CLI do projeto (nao havia convencao anterior pra seguir).
 *
 * Configuracao no Agendador de Tarefas do Windows:
 *   Programa/script:  C:\xampp\php\php.exe
 *   Argumentos:       C:\xampp\htdocs\lillymenu\admin\cli\check_expired.php
 *   Gatilho:          Diariamente
 */

if (php_sapi_name() !== 'cli') {
  http_response_code(403);
  exit('Este script so pode ser executado via linha de comando.');
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/mercadopago.php';
require_once __DIR__ . '/../helpers/whats_send.php';

garantirMercadopagoColunas($conn);

$hoje = date('Y-m-d');
$diasAvisoTrial = 3;

try {
  $stmt = $conn->prepare("
    SELECT a.id, a.loja_id
    FROM assinaturas a
    WHERE a.status = 'ativa' AND a.ciclo_fim IS NOT NULL AND a.ciclo_fim < ?
  ");
  $stmt->execute([$hoje]);
  $vencidas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($vencidas as $assinatura) {
    $conn->prepare("UPDATE assinaturas SET status = 'suspensa', bloqueada_em = NOW() WHERE id = ?")
      ->execute([(int) $assinatura['id']]);
    $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")
      ->execute([(int) $assinatura['loja_id']]);
    $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")
      ->execute([(int) $assinatura['loja_id']]);
  }

  echo count($vencidas) . " assinatura(s) marcada(s) como suspensa.\n";
} catch (Exception $e) {
  echo "Erro ao suspender assinaturas vencidas: " . $e->getMessage() . "\n";
}

try {
  // Mesma logica acima, mas pra trial vencido (trial_fim no passado). Antes
  // disso so acontecia de forma lazy dentro de admin/protect.php quando
  // alguem da loja logava — uma loja cujo dono nunca mais voltou ao admin
  // apos o trial vencer ficava com status='trial' e lojas.ativo=1 pra
  // sempre, sem cobranca gerada e invisivel como inadimplente pro
  // superadmin. Gera a primeira cobranca pendente aqui tambem, igual
  // protect.php ja faz no caminho lazy.
  $stmt = $conn->prepare("
    SELECT a.id, a.loja_id, COALESCE(p.valor, 50.00) AS valor
    FROM assinaturas a
    LEFT JOIN planos p ON p.id = a.plano_id
    WHERE a.status = 'trial' AND a.trial_fim IS NOT NULL AND a.trial_fim < ?
  ");
  $stmt->execute([$hoje]);
  $trialsVencidos = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($trialsVencidos as $assinatura) {
    $conn->prepare("UPDATE assinaturas SET status = 'suspensa', bloqueada_em = NOW() WHERE id = ?")
      ->execute([(int) $assinatura['id']]);
    $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")
      ->execute([(int) $assinatura['loja_id']]);
    $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")
      ->execute([(int) $assinatura['loja_id']]);

    $stmtCobrancaExiste = $conn->prepare("SELECT id FROM cobrancas WHERE assinatura_id = ? AND status = 'pendente' LIMIT 1");
    $stmtCobrancaExiste->execute([(int) $assinatura['id']]);
    if (!$stmtCobrancaExiste->fetchColumn()) {
      $conn->prepare("
        INSERT INTO cobrancas (assinatura_id, valor, vencimento, status)
        VALUES (?, ?, CURDATE(), 'pendente')
      ")->execute([(int) $assinatura['id'], (float) $assinatura['valor']]);
    }
  }

  echo count($trialsVencidos) . " trial(s) vencido(s) marcado(s) como suspensa, com cobranca gerada.\n";
} catch (Exception $e) {
  echo "Erro ao suspender trials vencidos: " . $e->getMessage() . "\n";
}

try {
  // Lembrete de trial acabando, enviado uma unica vez por loja no dia exato em
  // que faltam $diasAvisoTrial dias (trial_fim = hoje + N dias) — casar a data
  // exata evita reenviar todo dia enquanto o cron roda. Numero de contato vem
  // de configuracoes.whatsapp_numero, preenchido no cadastro (campo "contato").
  $enviados = 0;
  if (whatsEvolutionConfigurada($conn, 0)) {
    $stmt = $conn->prepare("
      SELECT a.id, a.loja_id, a.trial_fim
      FROM assinaturas a
      WHERE a.status = 'trial' AND a.trial_fim = DATE_ADD(?, INTERVAL {$diasAvisoTrial} DAY)
    ");
    $stmt->execute([$hoje]);
    $trialsAvisar = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($trialsAvisar as $assinatura) {
      $lojaIdAviso = (int) $assinatura['loja_id'];
      $stmtCfg = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('nome_loja','whatsapp_numero')");
      $stmtCfg->execute([$lojaIdAviso]);
      $cfg = [];
      foreach ($stmtCfg->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $cfg[$row['chave']] = $row['valor'];
      }
      $numero = trim((string) ($cfg['whatsapp_numero'] ?? ''));
      if ($numero === '') {
        continue;
      }
      $nomeLojaAviso = $cfg['nome_loja'] ?? 'sua loja';
      $dataFimFmt = date('d/m/Y', strtotime($assinatura['trial_fim']));
      $msg = "Ola! O periodo de teste gratis de \"{$nomeLojaAviso}\" no LillyMenu termina em {$diasAvisoTrial} dias ({$dataFimFmt}).\n\nPara continuar usando o sistema sem interrupcoes, acesse seu painel e escolha um plano:\nhttps://lillymenu.com/admin/login";
      $resultado = whatsEnviarMensagem($conn, 0, $numero, $msg);
      if ($resultado['ok']) {
        $enviados++;
      }
    }
  }

  echo $enviados . " lembrete(s) de trial enviado(s) por WhatsApp.\n";
} catch (Exception $e) {
  echo "Erro ao enviar lembretes de trial: " . $e->getMessage() . "\n";
}

try {
  $stmt = $conn->prepare("
    UPDATE cobrancas
    SET status = 'atrasado'
    WHERE status = 'pendente' AND origem = 'mercadopago' AND mp_expiracao IS NOT NULL AND mp_expiracao < NOW()
  ");
  $stmt->execute();
  echo $stmt->rowCount() . " cobranca(s) Pix expirada(s) marcada(s) como atrasado.\n";
} catch (Exception $e) {
  echo "Erro ao expirar cobrancas Pix: " . $e->getMessage() . "\n";
}
