<?php
require_once __DIR__ . '/loja_cfg.php';

/* Extraído de public/loja.php (linhas 16-529 da versão original) sem mudança
   de comportamento — monta o perfil/config/contexto da loja pública. Usado
   tanto por public/loja.php (página HTML) quanto por public/api/loja_perfil.php
   (endpoint JSON consumido pelo Next em /store/<slug>).

   Depende de entregaDisponivelAgora()/estaAberto() (admin/helpers/config.php)
   já estarem carregadas pelo chamador. */
function montarPerfilLoja(PDO $conn, int $lojaId): array {
  $mesaId = 0;
  $mesaNome = null;
  $mesaIdParam = (int) ($_GET['mesa'] ?? 0);
  if ($mesaIdParam > 0) {
    try {
      $stmtMesa = $conn->prepare("SELECT id, nome FROM mesas WHERE id = ? AND loja_id = ? AND ativo = 1 LIMIT 1");
      $stmtMesa->execute([$mesaIdParam, $lojaId]);
      $mesaRow = $stmtMesa->fetch(PDO::FETCH_ASSOC);
      if ($mesaRow) {
        $mesaId = (int) $mesaRow['id'];
        $mesaNome = $mesaRow['nome'];
      }
    } catch (Throwable $e) {
    }
  }

  $cupomPreenchido = null;
  $cupomParam = strtoupper(trim((string) ($_GET['cupom'] ?? '')));
  if ($cupomParam !== '') {
    try {
      $stmtCupomLink = $conn->prepare("SELECT codigo FROM cupons WHERE codigo = ? AND loja_id = ? AND ativo = 1 LIMIT 1");
      $stmtCupomLink->execute([$cupomParam, $lojaId]);
      $cupomLinkRow = $stmtCupomLink->fetch(PDO::FETCH_ASSOC);
      if ($cupomLinkRow) {
        $cupomPreenchido = $cupomLinkRow['codigo'];
      }
    } catch (Throwable $e) {
    }
  }

  $nomeLoja       = cfg($conn,$lojaId,'nome_loja','Minha Loja');
  $lojaVerificada = cfg($conn,$lojaId,'loja_verificada','0') === '1';

  $stmtLojaAtiva = $conn->prepare("SELECT ativo FROM lojas WHERE id = ? LIMIT 1");
  $stmtLojaAtiva->execute([$lojaId]);
  $lojaAtivaCol = $stmtLojaAtiva->fetchColumn();
  $lojaAtiva = !($lojaAtivaCol !== false && (int) $lojaAtivaCol === 0);

  $linkLoja = cfg($conn,$lojaId,'link_loja','');
  $slug = '';
  if ($linkLoja) $slug = trim(parse_url($linkLoja, PHP_URL_PATH) ?? '', '/');
  if (!$slug) { $slug = mb_strtolower($nomeLoja,'UTF-8'); $slug = preg_replace('/[^a-z0-9]+/','-',$slug); $slug=trim($slug,'-'); }

  $lojaLinkSlugCurto = '';
  if ($linkLoja) {
    if (preg_match('#[?&]loja=([^&]+)#', $linkLoja, $mSlug)) {
      $lojaLinkSlugCurto = urldecode($mSlug[1]);
    } elseif (preg_match('#/([^/?]+)/?$#', $linkLoja, $mSlug)) {
      $lojaLinkSlugCurto = $mSlug[1];
    } else {
      $lojaLinkSlugCurto = trim($linkLoja, '/');
    }
    $lojaLinkSlugCurto = preg_replace('/\.php$/i', '', $lojaLinkSlugCurto);
  }
  if ($lojaLinkSlugCurto === '') {
    $lojaLinkSlugCurto = mb_strtolower($nomeLoja, 'UTF-8');
    $lojaLinkSlugCurto = preg_replace('/[^a-z0-9]+/', '-', $lojaLinkSlugCurto);
    $lojaLinkSlugCurto = trim($lojaLinkSlugCurto, '-');
  }
  $_lojaUrlProtocolo = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
  $_lojaUrlHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
  $lojaCanonicalUrl = $lojaLinkSlugCurto ? ($_lojaUrlProtocolo . $_lojaUrlHost . storage_base_absoluta() . '/' . rawurlencode($lojaLinkSlugCurto)) : '';

  $descLoja    = cfg($conn,$lojaId,'loja_descricao','');
  $capaLoja    = fixImgPath(cfg($conn,$lojaId,'loja_capa',''));
  $perfilLoja  = fixImgPath(cfg($conn,$lojaId,'loja_perfil',''));
  $lojaFlyers  = json_decode((string) cfg($conn,$lojaId,'loja_flyers','[]'), true);
  if (!is_array($lojaFlyers)) { $lojaFlyers = []; }
  $lojaFlyers  = array_values(array_filter(array_map('fixImgPath', $lojaFlyers)));
  $flyersAtivo = cfg($conn,$lojaId,'loja_flyers_ativo','1') === '1';
  $taxaEntrega = (float)cfg($conn,$lojaId,'taxa_entrega',0);
  $pedidoMin   = (float)cfg($conn,$lojaId,'pedido_minimo',0);
  $pedidoMinEntregaAtivo  = cfg($conn,$lojaId,'pedido_minimo_entrega_ativo','0')==='1';
  $pedidoMinEntrega       = (float)cfg($conn,$lojaId,'pedido_minimo_entrega',0);
  $pedidoMinRetiradaAtivo = cfg($conn,$lojaId,'pedido_minimo_retirada_ativo','0')==='1';
  $pedidoMinRetirada      = (float)cfg($conn,$lojaId,'pedido_minimo_retirada',0);
  $pedidoMinsAtivos = array_filter([
    $pedidoMinEntregaAtivo ? $pedidoMinEntrega : 0,
    $pedidoMinRetiradaAtivo ? $pedidoMinRetirada : 0,
  ], fn($v) => $v > 0);
  $pedidoMinExibir = $pedidoMinsAtivos ? min($pedidoMinsAtivos) : 0;
  $tEntMin     = (int)cfg($conn,$lojaId,'tempo_entrega_min',30);
  $tEntMax     = (int)cfg($conn,$lojaId,'tempo_entrega_max',50);
  $tRetMin     = (int)cfg($conn,$lojaId,'tempo_retirada_min',15);
  $tRetMax     = (int)cfg($conn,$lojaId,'tempo_retirada_max',25);
  $pixAtivo    = cfg($conn,$lojaId,'pagamento_pix_ativo','1')==='1';
  $pixChave    = cfg($conn,$lojaId,'pagamento_pix_chave','');
  $pixNome     = cfg($conn,$lojaId,'pagamento_pix_nome','');
  $dinAtivo    = cfg($conn,$lojaId,'pagamento_dinheiro_ativo','1')==='1';
  $credAtivo   = cfg($conn,$lojaId,'pagamento_credito_ativo','1')==='1';
  $debAtivo    = cfg($conn,$lojaId,'pagamento_debito_ativo','1')==='1';

  $bandeirasBaseLista = [
    'visa' => 'Visa', 'mastercard' => 'Mastercard', 'elo' => 'Elo', 'hiper' => 'Hiper',
    'maestro' => 'Maestro', 'hipercard' => 'Hipercard', 'diners' => 'Diners Club',
    'alelo' => 'Alelo', 'amex' => 'Amex'
  ];
  $bandeirasLabelPorGrupo = function(string $grupo) use ($conn, $lojaId, $bandeirasBaseLista) {
    $selecionadas = array_filter(array_map('trim', explode(',', (string)cfg($conn,$lojaId,"pagamento_{$grupo}_bandeiras",'visa,mastercard'))));
    $customRaw = json_decode((string)cfg($conn,$lojaId,"pagamento_{$grupo}_bandeiras_custom",'[]'), true);
    $mapa = $bandeirasBaseLista;
    if (is_array($customRaw)) {
      foreach ($customRaw as $item) {
        if (!is_array($item)) continue;
        $slug = trim((string)($item['slug'] ?? ''));
        $label = trim((string)($item['label'] ?? ''));
        if ($slug === '' || $label === '') continue;
        $mapa[$slug] = $label;
      }
    }
    $labels = [];
    foreach ($selecionadas as $slug) {
      if (isset($mapa[$slug])) $labels[] = $mapa[$slug];
    }
    return $labels;
  };
  $bandeirasCredito = $credAtivo ? $bandeirasLabelPorGrupo('credito') : [];
  $bandeirasDebito  = $debAtivo  ? $bandeirasLabelPorGrupo('debito')  : [];
  $entAtiva    = entregaDisponivelAgora($conn);
  $retAtiva    = cfg($conn,$lojaId,'pedido_retirada_ativo','1')==='1';
  $taxasBairro     = json_decode(cfg($conn,$lojaId,'taxas_bairro','{}'),true) ?: [];
  $taxaEntregaTipo = cfg($conn,$lojaId,'taxa_entrega_tipo','fixa'); /* fixa | bairro | dinamica */
  $taxaEntregaGratis= cfg($conn,$lojaId,'taxa_entrega_gratis','0') === '1';
  $clubePontosAtivo = cfg($conn,$lojaId,'clube_pontos_ativo','0') === '1';
  $temaCorMenu = cfg($conn,$lojaId,'tema_cor_menu','#e63770');
  if (!preg_match('/^#[0-9a-fA-F]{6}$/', $temaCorMenu)) {
    $temaCorMenu = '#e63770';
  }
  $cashbackPct   = (float)cfg($conn,$lojaId,'cashback_percentual',0);
  $cashbackAtivo = cfg($conn,$lojaId,'cashback_ativo','0')==='1';

  $cuponsAtivo = false;
  try {
    if ($conn->query("SHOW TABLES LIKE 'cupons'")->fetchColumn()) {
      $stmtCup = $conn->prepare("SELECT COUNT(*) FROM cupons WHERE loja_id=? AND ativo=1");
      $stmtCup->execute([$lojaId]);
      $cuponsAtivo = (int)$stmtCup->fetchColumn() > 0;
    }
  } catch (Exception $e) {}

  $avaliacaoMedia = 0.0;
  $avaliacaoTotal = 0;
  try {
    $stmtAv = $conn->prepare("SELECT ROUND(AVG(nota),1) AS media, COUNT(*) AS total FROM avaliacoes WHERE loja_id=?");
    $stmtAv->execute([$lojaId]);
    $avRow = $stmtAv->fetch(PDO::FETCH_ASSOC);
    if ($avRow && (int)$avRow['total'] > 0) {
      $avaliacaoMedia = (float)$avRow['media'];
      $avaliacaoTotal = (int)$avRow['total'];
    }
  } catch (Exception $e) {}

  $receberPedidosAtivo = cfg($conn,$lojaId,'receber_pedidos_ativo','1') === '1';
  $notificarPedidoWhatsappAtivo = cfg($conn,$lojaId,'notificar_pedido_whatsapp_ativo','1') === '1';
  $lojaAberta = estaAberto($conn) && $receberPedidosAtivo;

  $pausaAtivaTitulo = '';
  $pausaAtivaFim = '';
  if (!$lojaAberta) {
    try {
      $fusoConfigPausa = cfg($conn,$lojaId,'fuso_horario','America/Fortaleza');
      try { $tzPausa = new DateTimeZone($fusoConfigPausa); } catch (Exception $e) { $tzPausa = new DateTimeZone('America/Fortaleza'); }
      $agoraPausa = new DateTime('now', $tzPausa);
      $stmtPausaAtiva = $conn->prepare("
        SELECT titulo, CONCAT(data_fim, ' ', hora_fim) AS fim FROM pausas_programadas
        WHERE loja_id = ?
          AND CONCAT(data_inicio, ' ', hora_inicio) <= ?
          AND CONCAT(data_fim, ' ', hora_fim) >= ?
        LIMIT 1
      ");
      $stmtPausaAtiva->execute([$lojaId, $agoraPausa->format('Y-m-d H:i:s'), $agoraPausa->format('Y-m-d H:i:s')]);
      $pausaAtivaRow = $stmtPausaAtiva->fetch(PDO::FETCH_ASSOC);
      if ($pausaAtivaRow) {
        $pausaAtivaTitulo = (string) $pausaAtivaRow['titulo'];
        $pausaAtivaFim = (string) $pausaAtivaRow['fim'];
      }
    } catch (Exception $e) {
      /* tabela pausas_programadas ainda nao existe */
    }
  }

  $proximoHorario = '';
  if (!$lojaAberta) {
    $hs = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
    $agora = new DateTime('now', new DateTimeZone('America/Fortaleza'));
    $dn = [1=>'Dom',2=>'Seg',3=>'Ter',4=>'Qua',5=>'Qui',6=>'Sex',7=>'Sab'];
    $ckHoje = (((int)$agora->format('N'))%7)+1;
    $hdHoje = $hs[$ckHoje]??$hs[(string)$ckHoje]??null;
    if ($hdHoje && !empty($hdHoje['inicio']) && $agora->format('H:i') < $hdHoje['inicio']) {
      $proximoHorario = 'hoje às '.$hdHoje['inicio'];
    }
    if (!$proximoHorario) {
      for ($i=1;$i<=7;$i++){
        $d=clone $agora; $d->modify("+$i day");
        $ck=(((int)$d->format('N'))%7)+1;
        $hd=$hs[$ck]??$hs[(string)$ck]??null;
        if($hd&&!empty($hd['inicio'])){ $proximoHorario=$dn[$ck].' às '.$hd['inicio']; break; }
      }
    }
    if(!$proximoHorario){ $ab=cfg($conn,$lojaId,'horario_abertura',''); if($ab) $proximoHorario='às '.$ab; }
  }

  $lojaContato    = cfg($conn,$lojaId,'loja_contato','');
  $lojaInstagram  = cfg($conn,$lojaId,'loja_instagram','');
  $lojaInstagram  = trim(preg_replace('#^https?://(www\.)?instagram\.com/?#i','',$lojaInstagram),'/@');
  $lojaTiktok     = cfg($conn,$lojaId,'loja_tiktok','');
  $lojaRua        = cfg($conn,$lojaId,'loja_rua','');
  $lojaNumero     = cfg($conn,$lojaId,'loja_numero','');
  $lojaBairro     = cfg($conn,$lojaId,'loja_bairro','');
  $lojaCidade     = cfg($conn,$lojaId,'loja_cidade','');
  $lojaEstado     = cfg($conn,$lojaId,'loja_estado','');
  $lojaCep        = cfg($conn,$lojaId,'loja_cep','');
  $enderecoLoja   = trim(implode(', ', array_filter([
    trim($lojaRua.($lojaNumero ? ', '.$lojaNumero : '')),
    $lojaBairro,
    trim($lojaCidade.($lojaEstado ? '/'.$lojaEstado : '')),
    $lojaCep ? 'CEP '.$lojaCep : ''
  ])));

  $agendDeliveryAtivo  = cfg($conn,$lojaId,'agendamento_delivery_ativo','0')==='1';
  $agendRetiradaAtivo  = cfg($conn,$lojaId,'agendamento_retirada_ativo','0')==='1';
  $agendDeliveryMinTipo= cfg($conn,$lojaId,'agendamento_delivery_min_tipo','dias');
  $agendDeliveryMinVal = (int)cfg($conn,$lojaId,'agendamento_delivery_min_valor','1');
  $agendDeliveryMaxVal = (int)cfg($conn,$lojaId,'agendamento_delivery_max_valor','30');
  $agendDeliveryMaxTipo= cfg($conn,$lojaId,'agendamento_delivery_max_tipo','dias');
  $agendRetiradaMinTipo= cfg($conn,$lojaId,'agendamento_retirada_min_tipo','dias');
  $agendRetiradaMinVal = (int)cfg($conn,$lojaId,'agendamento_retirada_min_valor','1');
  $agendRetiradaMaxVal = (int)cfg($conn,$lojaId,'agendamento_retirada_max_valor','30');
  $agendRetiradaMaxTipo= cfg($conn,$lojaId,'agendamento_retirada_max_tipo','dias');
  $agendDeliveryHorarios  = json_decode(cfg($conn,$lojaId,'agendamento_delivery_horarios','{}'),true)?:[];
  $agendRetiradaHorarios  = json_decode(cfg($conn,$lojaId,'agendamento_retirada_horarios','{}'),true)?:[];
  $agendamentoDeliveryAtivo = $agendDeliveryAtivo;
  $agendamentoRetiradaAtivo = $agendRetiradaAtivo;

  $catalogoVersao = cfg($conn,$lojaId,'catalogo_versao','');

  /* Semana completa de horarios (aba "Horario" do modal "Informacoes da
     loja") — mesma logica ja usada em public/loja.php (painel #ipHorario)
     e public/api/loja_status.php, repetida aqui pra nao exigir uma segunda
     chamada de API so pra abrir o modal. */
  $horSemanaInfo   = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
  $horaAbInfo      = cfg($conn,$lojaId,'horario_abertura','');
  $horaFeInfo      = cfg($conn,$lojaId,'horario_fechamento','');
  $diasFuncRawInfo = cfg($conn,$lojaId,'dias_funcionamento','');
  $diasFuncInfo    = $diasFuncRawInfo ? array_map('intval', array_filter(explode(',', $diasFuncRawInfo))) : [];
  $diasNomesInfo   = [1=>'Domingo',2=>'Segunda',3=>'Terça',4=>'Quarta',5=>'Quinta',6=>'Sexta',7=>'Sábado'];
  $agoraInfo       = new DateTime('now', new DateTimeZone('America/Fortaleza'));
  $ckHojeInfo      = (((int)$agoraInfo->format('N'))%7)+1;
  $horaAtualMinInfo= (int)$agoraInfo->format('H') * 60 + (int)$agoraInfo->format('i');
  $semanaHorarios  = [];
  for ($dk=1; $dk<=7; $dk++) {
    $hd = $horSemanaInfo[$dk] ?? $horSemanaInfo[(string)$dk] ?? null;
    if (!$hd && $horaAbInfo && $horaFeInfo) {
      if (!$diasFuncInfo || in_array($dk, $diasFuncInfo)) {
        $hd = ['inicio'=>$horaAbInfo,'fim'=>$horaFeInfo];
      }
    }
    $isHojeInfo = ($dk === $ckHojeInfo);
    $abertoInfo = $hd && !empty($hd['inicio']) && !empty($hd['fim']);
    $fechaBreveInfo = false;
    if ($isHojeInfo && $abertoInfo && !empty($hd['fim'])) {
      $fimPartsInfo = explode(':', $hd['fim']);
      $fimMinInfo = (int)($fimPartsInfo[0] ?? 0) * 60 + (int)($fimPartsInfo[1] ?? 0);
      $diffInfo = $fimMinInfo - $horaAtualMinInfo;
      $fechaBreveInfo = ($diffInfo > 0 && $diffInfo <= 60);
    }
    $semanaHorarios[] = [
      'dia' => $diasNomesInfo[$dk],
      'hoje' => $isHojeInfo,
      'aberto' => $abertoInfo,
      'inicio' => $abertoInfo ? $hd['inicio'] : '',
      'fim' => $abertoInfo ? $hd['fim'] : '',
      'fechaBreve' => $fechaBreveInfo,
    ];
  }

  return compact(
    'mesaId','mesaNome','cupomPreenchido',
    'nomeLoja','lojaVerificada','lojaAtiva',
    'linkLoja','slug','lojaLinkSlugCurto','lojaCanonicalUrl',
    'descLoja','capaLoja','perfilLoja','lojaFlyers','flyersAtivo',
    'taxaEntrega','pedidoMin','pedidoMinEntregaAtivo','pedidoMinEntrega',
    'pedidoMinRetiradaAtivo','pedidoMinRetirada','pedidoMinsAtivos','pedidoMinExibir',
    'tEntMin','tEntMax','tRetMin','tRetMax',
    'pixAtivo','pixChave','pixNome','dinAtivo','credAtivo','debAtivo',
    'bandeirasBaseLista','bandeirasCredito','bandeirasDebito',
    'entAtiva','retAtiva','taxasBairro','taxaEntregaTipo','taxaEntregaGratis',
    'clubePontosAtivo','temaCorMenu','cashbackPct','cashbackAtivo','cuponsAtivo',
    'avaliacaoMedia','avaliacaoTotal',
    'receberPedidosAtivo','notificarPedidoWhatsappAtivo','lojaAberta',
    'pausaAtivaTitulo','pausaAtivaFim','proximoHorario',
    'lojaContato','lojaInstagram','lojaTiktok',
    'lojaRua','lojaNumero','lojaBairro','lojaCidade','lojaEstado','lojaCep','enderecoLoja',
    'agendDeliveryAtivo','agendRetiradaAtivo',
    'agendDeliveryMinTipo','agendDeliveryMinVal','agendDeliveryMaxVal','agendDeliveryMaxTipo',
    'agendRetiradaMinTipo','agendRetiradaMinVal','agendRetiradaMaxVal','agendRetiradaMaxTipo',
    'agendDeliveryHorarios','agendRetiradaHorarios',
    'agendamentoDeliveryAtivo','agendamentoRetiradaAtivo',
    'catalogoVersao','semanaHorarios'
  );
}
