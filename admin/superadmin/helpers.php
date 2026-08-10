<?php

if (!function_exists('dashIniciais')) {
  function dashIniciais(string $nome, int $max = 2): string {
    $nome = trim($nome);
    if ($nome === '') return 'A';
    $partes = array_values(array_filter(preg_split('/\s+/', $nome), fn($p) => preg_match('/\p{L}|\d/u', $p)));
    if (empty($partes)) return 'A';
    $iniciais = '';
    foreach (array_slice($partes, 0, $max) as $parte) {
      $iniciais .= mb_strtoupper(mb_substr($parte, 0, 1, 'UTF-8'), 'UTF-8');
    }
    return $iniciais !== '' ? $iniciais : 'A';
  }
}

if (!function_exists('tabelaExiste')) {
  function tabelaExiste(PDO $conn, string $tabela): bool {
    try {
      $stmt = $conn->prepare("SHOW TABLES LIKE ?");
      $stmt->execute([$tabela]);
      return (bool) $stmt->fetchColumn();
    } catch (Exception $e) {
      return false;
    }
  }
}

if (!function_exists('superadminNotificacoes')) {
  function superadminNotificacoes(PDO $conn): array {
    $notificacoes = [];
    try {
      if (tabelaExiste($conn, 'suporte_mensagens')) {
        $stmt = $conn->query("
          SELECT sm.loja_id, l.nome AS loja_nome, sm.mensagem, sm.anexo_arquivo, sm.criado_em
          FROM suporte_mensagens sm
          INNER JOIN lojas l ON l.id = sm.loja_id
          INNER JOIN (
            SELECT loja_id, MAX(id) AS max_id
            FROM suporte_mensagens
            WHERE remetente = 'loja' AND lida_suporte = 0
            GROUP BY loja_id
          ) ultimo ON ultimo.max_id = sm.id
          ORDER BY sm.criado_em DESC
          LIMIT 5
        ");
        $novasMsgs = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        foreach ($novasMsgs as $m) {
          $mensagem = trim((string) ($m['mensagem'] ?? ''));
          if ($mensagem === '') {
            $preview = !empty($m['anexo_arquivo']) ? '📷 Imagem enviada' : 'Nova mensagem';
          } else {
            $preview = mb_substr($mensagem, 0, 60) . (mb_strlen($mensagem) > 60 ? '…' : '');
          }
          $notificacoes[] = [
            'tipo' => 'suporte',
            'loja_id' => (int) $m['loja_id'],
            'loja_nome' => $m['loja_nome'],
            'texto' => $preview,
          ];
        }
      }
    } catch (Exception $e) {
    }
    try {
      $stmt = $conn->query("SELECT nome FROM lojas ORDER BY id DESC LIMIT 3");
      $novasLojas = $stmt ? $stmt->fetchAll(PDO::FETCH_COLUMN) : [];
      foreach ($novasLojas as $nomeLoja) {
        $notificacoes[] = [
          'tipo' => 'loja',
          'texto' => 'Nova loja cadastrada: ' . $nomeLoja,
        ];
      }
    } catch (Exception $e) {
    }
    try {
      $stmt = $conn->query("SELECT email FROM admins ORDER BY id DESC LIMIT 1");
      $emailNovo = $stmt ? $stmt->fetchColumn() : '';
      if ($emailNovo) {
        $notificacoes[] = [
          'tipo' => 'email',
          'texto' => 'Novo email cadastrado: ' . $emailNovo,
        ];
      }
    } catch (Exception $e) {
    }
    try {
      $stmt = $conn->query("SELECT valor FROM cobrancas WHERE status = 'pago' ORDER BY COALESCE(pago_em, criado_em) DESC LIMIT 1");
      $valorPago = $stmt ? $stmt->fetchColumn() : null;
      if ($valorPago !== null) {
        $notificacoes[] = [
          'tipo' => 'pagamento',
          'texto' => 'Pagamento confirmado: R$ ' . number_format((float) $valorPago, 2, ',', '.'),
        ];
      }
    } catch (Exception $e) {
    }
    return array_slice($notificacoes, 0, 5);
  }
}

/**
 * Busca todas as lojas com dados de admin/plano/assinatura/cobranca para exibicao
 * em tabela. Usada tanto pelo dashboard (pra calcular KPIs) quanto por configuracoes.php
 * (pra listar/gerenciar lojas) — mantida num unico lugar pra nao duplicar essa query grande.
 */
if (!function_exists('buscarLojasComDetalhes')) {
  function buscarLojasComDetalhes(PDO $conn): array {
    $selectCriadoEm = 'NULL AS criado_em';
    try {
      $colsLojas = $conn->query("SHOW COLUMNS FROM lojas")->fetchAll(PDO::FETCH_COLUMN, 0);
      if (!in_array('criado_em', $colsLojas, true)) {
        $conn->exec("ALTER TABLE lojas ADD COLUMN criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");
        $conn->exec("UPDATE lojas SET criado_em = NOW() WHERE criado_em IS NULL");
        $colsLojas[] = 'criado_em';
      }
      if (in_array('criado_em', $colsLojas, true)) {
        $selectCriadoEm = 'l.criado_em';
      }
    } catch (Exception $e) {
    }

    $lojas = [];
    try {
      $stmt = $conn->query("
        SELECT l.id, l.nome, l.ativo, l.plano_id AS loja_plano_id, {$selectCriadoEm},
               a.status, a.trial_inicio, a.trial_fim, a.ciclo_fim, a.plano_id,
               p.nome AS plano_nome, p.valor AS plano_valor,
               lp.nome AS plano_desejado_nome,
               ad.id AS admin_id, ad.nome AS admin_nome, ad.email AS admin_email, ad.usuario AS admin_usuario,
               (SELECT valor FROM configuracoes c WHERE c.loja_id = l.id AND c.chave = 'loja_contato' LIMIT 1) AS loja_contato,
               cb.id AS cobranca_id, cb.valor AS cobranca_valor, cb.vencimento AS cobranca_vencimento,
               cb.status AS cobranca_status, cb.comprovante_arquivo, cb.comprovante_enviado_em, cb.motivo_rejeicao
        FROM lojas l
        LEFT JOIN (
          SELECT a1.*
          FROM assinaturas a1
          INNER JOIN (
            SELECT loja_id, MAX(id) AS id
            FROM assinaturas
            GROUP BY loja_id
          ) a2 ON a1.id = a2.id
        ) a ON a.loja_id = l.id
        LEFT JOIN planos p ON p.id = a.plano_id
        LEFT JOIN planos lp ON lp.id = l.plano_id
        LEFT JOIN admins ad ON ad.id = (
          SELECT id FROM admins a3 WHERE a3.loja_id = l.id ORDER BY a3.id ASC LIMIT 1
        )
        LEFT JOIN (
          SELECT c1.*
          FROM cobrancas c1
          INNER JOIN (
            SELECT assinatura_id, MAX(id) AS id FROM cobrancas GROUP BY assinatura_id
          ) c2 ON c1.id = c2.id
        ) cb ON cb.assinatura_id = a.id
        ORDER BY l.id DESC
      ");
      $lojas = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (Exception $e) {
      $lojas = [];
    }

    if (!$lojas) {
      try {
        $stmt = $conn->query("
          SELECT l.id, l.nome, l.ativo, {$selectCriadoEm}
          FROM lojas l
          ORDER BY l.id DESC
        ");
        $lojas = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
      } catch (Exception $e) {
        $lojas = [];
      }
    }

    return $lojas;
  }
}

/**
 * Enriquece uma linha de loja (do buscarLojasComDetalhes) com status_resolvido,
 * is_trial_periodo, expira_em e expira_dias. Nao acumula estatisticas agregadas —
 * isso fica por conta de quem chama (o dashboard soma totais, configuracoes.php nao precisa).
 */
if (!function_exists('resolverStatusLoja')) {
  function resolverStatusLoja(array $l, DateTime $hoje): array {
    $status = strtolower(trim((string) ($l['status'] ?? '')));
    if ($status === 'ativo') {
      $status = 'ativa';
    }
    if ($status === '') {
      $status = ($l['ativo'] ? 'ativa' : 'suspensa');
    }
    $trialFimRaw = $l['trial_fim'] ?? null;
    $cicloFimRaw = $l['ciclo_fim'] ?? null;
    if ($status === 'trial' && $trialFimRaw) {
      try {
        $trialFimDate = new DateTime($trialFimRaw);
        if ($trialFimDate < $hoje) {
          $status = 'suspensa';
        }
      } catch (Exception $e) {
      }
    }
    if ($status === 'ativa' && $cicloFimRaw) {
      try {
        $cicloFimDate = new DateTime($cicloFimRaw);
        if ($cicloFimDate < $hoje) {
          $status = 'suspensa';
        }
      } catch (Exception $e) {
      }
    }
    $l['status_resolvido'] = $status;
    $l['is_trial_periodo'] = false;
    if (!empty($l['trial_fim'])) {
      try {
        $trialFim = new DateTime($l['trial_fim']);
        if ($trialFim >= $hoje && $status === 'trial') {
          $l['is_trial_periodo'] = true;
        }
      } catch (Exception $e) {
        $l['is_trial_periodo'] = false;
      }
    }

    $usaTrial = ($status === 'trial' || $l['is_trial_periodo']);
    if (!$usaTrial && empty($l['ciclo_fim']) && !empty($l['trial_fim'])) {
      $usaTrial = true;
    }
    $expira = $usaTrial ? ($l['trial_fim'] ?? null) : ($l['ciclo_fim'] ?? null);
    $l['expira_em'] = $expira;
    $l['expira_dias'] = null;
    if ($expira) {
      try {
        $dataExpira = new DateTime($expira);
        $diff = $hoje->diff($dataExpira);
        $l['expira_dias'] = (int) $diff->format('%r%a');
      } catch (Exception $e) {
        $l['expira_dias'] = null;
      }
    }
    return $l;
  }
}

if (!function_exists('buscarLeadsRecentes')) {
  function buscarLeadsRecentes(PDO $conn, int $limit = 50): array {
    $leads = [];
    try {
      if (tabelaExiste($conn, 'leads_lojas')) {
        $stmt = $conn->prepare("
          SELECT id, nome, empresa, email, whatsapp, cnpj, cep, cidade, estado, segmento, criado_em
          FROM leads_lojas
          ORDER BY id DESC
          LIMIT " . (int) $limit . "
        ");
        $stmt->execute();
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);
      }
    } catch (Exception $e) {
      $leads = [];
    }
    return $leads;
  }
}
