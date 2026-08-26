<?php
session_start();
date_default_timezone_set('America/Fortaleza');
/* Conteudo dinamico (status aberto/fechado, pausa programada, estoque, promocoes):
   nunca deve ser servido de um cache antigo pelo navegador */
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
require_once '../config/database.php';
require_once '../helpers/loja_context.php';
require_once '../helpers/storage.php';
require_once '../admin/helpers/config.php';
require_once '../admin/helpers/whatsapp.php';

$lojaId = definirLojaIdSessao($conn);

function cfg(PDO $db, int $lid, string $chave, $default = ''): string {
  static $cache = [];
  $k = $lid.':'.$chave;
  if (isset($cache[$k])) return $cache[$k];
  $s = $db->prepare("SELECT valor FROM configuracoes WHERE chave=? AND loja_id=? LIMIT 1");
  $s->execute([$chave, $lid]);
  $v = $s->fetchColumn();
  return $cache[$k] = ($v !== false ? (string)$v : (string)$default);
}

$nomeLoja       = cfg($conn,$lojaId,'nome_loja','Minha Loja');
$lojaVerificada = cfg($conn,$lojaId,'loja_verificada','0') === '1';

/* Slug / redirect */
$linkLoja = cfg($conn,$lojaId,'link_loja','');
$slug = '';
if ($linkLoja) $slug = trim(parse_url($linkLoja, PHP_URL_PATH) ?? '', '/');
if (!$slug) { $slug = mb_strtolower($nomeLoja,'UTF-8'); $slug = preg_replace('/[^a-z0-9]+/','-',$slug); $slug=trim($slug,'-'); }
if (!isset($_GET['loja']) && $slug) { header("Location: loja.php?loja=".urlencode($slug)); exit; }

function fixImgPath(string $p): string {
  return storage_url_absoluta($p);
}

$descLoja    = cfg($conn,$lojaId,'loja_descricao','');
$capaLoja    = fixImgPath(cfg($conn,$lojaId,'loja_capa',''));
$perfilLoja  = fixImgPath(cfg($conn,$lojaId,'loja_perfil',''));
$lojaFlyers  = json_decode((string) cfg($conn,$lojaId,'loja_flyers','[]'), true);
if (!is_array($lojaFlyers)) { $lojaFlyers = []; }
$lojaFlyers  = array_values(array_filter(array_map('fixImgPath', $lojaFlyers)));
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

/* Bandeiras aceitas (mesmo mapa usado em admin/configuracoes.php) */
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

/* Média de avaliações reais dos clientes */
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

require_once '../admin/helpers/config.php';
require_once '../admin/helpers/whatsapp.php';
$_SESSION['loja_id'] = $lojaId;
$receberPedidosAtivo = cfg($conn,$lojaId,'receber_pedidos_ativo','1') === '1';
$notificarPedidoWhatsappAtivo = cfg($conn,$lojaId,'notificar_pedido_whatsapp_ativo','1') === '1';
$lojaAberta = estaAberto($conn) && $receberPedidosAtivo;

/* Pausa programada ativa: se houver, o motivo dela substitui a mensagem generica de fechado,
   e agendamentos (entrega/retirada) so podem ser marcados para depois que ela acabar */
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

/* Próximo horário */
$proximoHorario = '';
if (!$lojaAberta) {
  $hs = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
  $agora = new DateTime('now', new DateTimeZone('America/Fortaleza'));
  $dn = [1=>'Dom',2=>'Seg',3=>'Ter',4=>'Qua',5=>'Qui',6=>'Sex',7=>'Sab'];
  /* Primeiro checa se a loja ainda abre mais tarde hoje, antes de olhar os próximos dias */
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

/* Categorias e produtos */
$_catCols=$conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN,0);
$_modoSql=in_array('modo_exibicao',$_catCols,true)?",IFNULL(modo_exibicao,'vertical') AS modo_exibicao":",'vertical' AS modo_exibicao";
$_temCatDias=in_array('dias_semana',$_catCols,true);
$_temCatHIni=in_array('horario_ini',$_catCols,true);
$_temCatHFim=in_array('horario_fim',$_catCols,true);
$_catAgSql=($_temCatDias?",dias_semana":"").($_temCatHIni?",horario_ini":"").($_temCatHFim?",horario_fim":"");
$stmtCat=$conn->prepare("SELECT id,nome{$_modoSql}{$_catAgSql} FROM categorias WHERE loja_id=? AND ativo=1 ORDER BY ordem IS NULL,ordem,nome");
$stmtCat->execute([$lojaId]);
$categorias=$stmtCat->fetchAll(PDO::FETCH_ASSOC);

$cols=$conn->query("SHOW COLUMNS FROM produtos")->fetchAll(PDO::FETCH_COLUMN,0);
$temImg     = in_array('imagem',$cols);
$temProm    = in_array('preco_promocional',$cols)&&in_array('promo_desativado',$cols);
$temPromoDur= in_array('promo_dias',$cols)&&in_array('promo_inicio',$cols);
$temPromoExtra= in_array('promo_imagem',$cols)&&in_array('promo_descricao',$cols);
$temQtdMin  = in_array('quantidade_minima',$cols);
$temPtGanho = in_array('pontos_ganho',$cols);
$temDiasCol = in_array('dias_semana',$cols);
$temHIniCol = in_array('horario_ini',$cols);
$temHFimCol = in_array('horario_fim',$cols);
$temVariacoesCol = in_array('tem_variacoes',$cols);
$si =$temImg    ?', p.imagem':'';
$sp =$temProm   ?', p.preco_promocional, p.promo_desativado':'';
$spd=$temPromoDur?', p.promo_dias, p.promo_inicio':'';
$spe=$temPromoExtra?', p.promo_imagem, p.promo_descricao':'';
$sqm=$temQtdMin ?', p.quantidade_minima':'';
$spg=$temPtGanho?', p.pontos_ganho':'';
$sds=$temDiasCol?', p.dias_semana':'';
$shi=$temHIniCol?', p.horario_ini':'';
$shf=$temHFimCol?', p.horario_fim':'';
$svr=$temVariacoesCol?', p.tem_variacoes':'';

/* Dia e hora atual no fuso da loja */
$_diasCod=['dom','seg','ter','qua','qui','sex','sab'];
$_diaHoje =$_diasCod[(int)date('w')];
$_horaAgora=date('H:i');

/* Categoria disponivel agora, conforme seu proprio cronograma */
$_categoriaDisponivelAgora=function($cat) use ($_diaHoje,$_horaAgora){
  if(!empty($cat['dias_semana'])){
    $dias=json_decode($cat['dias_semana'],true)??[];
    if(!empty($dias) && !in_array($_diaHoje,$dias)) return false;
  }
  if(!empty($cat['horario_ini']) && $_horaAgora < $cat['horario_ini']) return false;
  if(!empty($cat['horario_fim']) && $_horaAgora > $cat['horario_fim']) return false;
  return true;
};

$produtosPorCat=[];
foreach($categorias as $cat){
  if(!$_categoriaDisponivelAgora($cat)) continue;
  $s=$conn->prepare("SELECT p.id,p.nome,p.descricao,p.preco{$si}{$sp}{$spd}{$spe}{$sqm}{$spg}{$sds}{$shi}{$shf}{$svr},IFNULL(e.quantidade,0) AS estoque FROM produtos p LEFT JOIN estoque e ON e.produto_id=p.id AND e.loja_id=p.loja_id WHERE p.categoria_id=? AND p.ativo=1 AND p.loja_id=? ORDER BY p.ordem IS NULL,p.ordem,p.nome");
  $s->execute([$cat['id'],$lojaId]);
  $prods=$s->fetchAll(PDO::FETCH_ASSOC);
  if($prods){
    foreach($prods as &$pr){
      $pr['imagem']=fixImgPath($pr['imagem']??'');
      $pr['promo_imagem']=!empty($pr['promo_imagem'])?fixImgPath($pr['promo_imagem']):null;
      $pr['preco_base']=(float)$pr['preco'];
      $pr['tem_variacoes']=(!empty($pr['tem_variacoes'])&&(int)$pr['tem_variacoes']===1)?1:0;
      $pr['estoque']=(int)$pr['estoque'];
      $pr['esgotado']=$pr['estoque']<=0;
      $promoExpirada=false;
      if($temPromoDur && !empty($pr['promo_dias']) && !empty($pr['promo_inicio'])){
        $promoFim=strtotime($pr['promo_inicio'].' +'.(int)$pr['promo_dias'].' days');
        if($promoFim!==false && $promoFim<=strtotime('today')) $promoExpirada=true;
      }
      if($temProm&&!($pr['promo_desativado']??1)&&($pr['preco_promocional']??0)>0&&!$promoExpirada){
        $pr['preco_final']=(float)$pr['preco_promocional'];
        $pr['em_promo']=true;
        $pr['desc_pct']=round((1-$pr['preco_final']/$pr['preco_base'])*100);
      } else { $pr['preco_final']=$pr['preco_base']; $pr['em_promo']=false; $pr['desc_pct']=0; }
    } unset($pr);

    /* Filtra pelo cronograma de dias/horários */
    $prods=array_values(array_filter($prods, function($pr) use ($_diaHoje,$_horaAgora,$temDiasCol,$temHIniCol,$temHFimCol){
      if($temDiasCol && !empty($pr['dias_semana'])){
        $dias=json_decode($pr['dias_semana'],true)??[];
        if(!empty($dias) && !in_array($_diaHoje,$dias)) return false;
      }
      if($temHIniCol && !empty($pr['horario_ini']) && $_horaAgora < $pr['horario_ini']) return false;
      if($temHFimCol && !empty($pr['horario_fim']) && $_horaAgora > $pr['horario_fim']) return false;
      return true;
    }));

    if($prods) $produtosPorCat[$cat['id']]=$prods;
  }
}

/* Combos por categoria */
$combosPorCat=[];
try{
  $stmtTbl=$conn->query("SHOW TABLES LIKE 'combos'");
  if($stmtTbl->fetchColumn()){
    $cbCols=$conn->query("SHOW COLUMNS FROM combos")->fetchAll(PDO::FETCH_COLUMN,0);
    $cbTemImg=in_array('imagem',$cbCols);
    $cbTemProm=in_array('preco_promocional',$cbCols)&&in_array('promo_desativado',$cbCols);
    $cbTemOrdem=in_array('ordem',$cbCols);
    $cbImg=$cbTemImg?',imagem':'';
    $cbProm=$cbTemProm?',preco_promocional,promo_desativado':'';
    $cbOrd=$cbTemOrdem?'ORDER BY ordem IS NULL,ordem,nome':'ORDER BY nome';
    foreach($categorias as $cat){
      if(!$_categoriaDisponivelAgora($cat)) continue;
      $sc=$conn->prepare("SELECT id,nome,descricao,preco{$cbImg}{$cbProm} FROM combos WHERE categoria_id=? AND ativo=1 AND loja_id=? {$cbOrd}");
      $sc->execute([$cat['id'],$lojaId]);
      $cbs=$sc->fetchAll(PDO::FETCH_ASSOC);
      if($cbs){
        foreach($cbs as &$cb){
          $cb['imagem']=$cbTemImg?fixImgPath($cb['imagem']??''):'';
          $cb['preco_base']=(float)$cb['preco'];
          $cb['tipo']='combo';
          if($cbTemProm&&!($cb['promo_desativado']??1)&&($cb['preco_promocional']??0)>0){
            $cb['preco_final']=(float)$cb['preco_promocional'];
            $cb['em_promo']=true;
            $cb['desc_pct']=round((1-$cb['preco_final']/$cb['preco_base'])*100);
          } else { $cb['preco_final']=$cb['preco_base']; $cb['em_promo']=false; $cb['desc_pct']=0; }
        } unset($cb);
        $combosPorCat[$cat['id']]=$cbs;
      }
    }
  }
}catch(Exception $e){}

$categorias=array_values(array_filter($categorias,fn($c)=>isset($produtosPorCat[$c['id']])||isset($combosPorCat[$c['id']])));
$destaques=[];
foreach($produtosPorCat as $ps) foreach($ps as $p) if($p['em_promo']) $destaques[]=$p;
foreach($combosPorCat as $cs) foreach($cs as $c) $destaques[]=$c;

/* Produto em promocao com foto/descricao de propaganda: exibido automaticamente ao entrar na loja */
$promoAutoPopup=null;
foreach($produtosPorCat as $ps){
  foreach($ps as $p){
    if($p['em_promo'] && (!empty($p['promo_imagem'])||!empty($p['promo_descricao']))){
      $promoAutoPopup=$p;
      break 2;
    }
  }
}

/* Informações extras da loja */
$lojaContato    = cfg($conn,$lojaId,'loja_contato','');
$lojaInstagram  = cfg($conn,$lojaId,'loja_instagram','');
$lojaInstagram  = trim(preg_replace('#^https?://(www\.)?instagram\.com/?#i','',$lojaInstagram),'/@');
$lojaTiktok     = cfg($conn,$lojaId,'loja_tiktok','');
/* Endereço da loja para retirada */
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

/* Agendamento */
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

$cfgJS=json_encode(['lojaId'=>$lojaId,'nomeLoja'=>$nomeLoja,'lojaPerfil'=>$perfilLoja,'taxaEntrega'=>$taxaEntrega,'taxaEntregaTipo'=>$taxaEntregaTipo,'taxaEntregaGratis'=>$taxaEntregaGratis,'pedidoMinimo'=>$pedidoMin,'tEntMin'=>$tEntMin,'tEntMax'=>$tEntMax,'tRetMin'=>$tRetMin,'tRetMax'=>$tRetMax,'pixAtivo'=>$pixAtivo,'pixChave'=>$pixChave,'pixNome'=>$pixNome,'dinAtivo'=>$dinAtivo,'credAtivo'=>$credAtivo,'debAtivo'=>$debAtivo,'entAtiva'=>$entAtiva,'retAtiva'=>$retAtiva,'taxasBairro'=>$taxasBairro,'lojaAberta'=>$lojaAberta,'enderecoLoja'=>$enderecoLoja,'lojaWpp'=>preg_replace('/\D+/','',$lojaContato),
'cashbackPct'=>(float)cfg($conn,$lojaId,'cashback_percentual',0),
'cashbackAtivo'=>$cashbackAtivo,
'agendDeliveryAtivo'=>$agendDeliveryAtivo,'agendRetiradaAtivo'=>$agendRetiradaAtivo,
'agendDeliveryMinTipo'=>$agendDeliveryMinTipo,'agendDeliveryMinVal'=>$agendDeliveryMinVal,
'agendDeliveryMaxTipo'=>$agendDeliveryMaxTipo,'agendDeliveryMaxVal'=>$agendDeliveryMaxVal,
'agendRetiradaMinTipo'=>$agendRetiradaMinTipo,'agendRetiradaMinVal'=>$agendRetiradaMinVal,
'agendRetiradaMaxTipo'=>$agendRetiradaMaxTipo,'agendRetiradaMaxVal'=>$agendRetiradaMaxVal,
'agendDeliveryHorarios'=>$agendDeliveryHorarios,'agendRetiradaHorarios'=>$agendRetiradaHorarios,
'pedidoMinEntregaAtivo'=>$pedidoMinEntregaAtivo,'pedidoMinEntrega'=>$pedidoMinEntrega,
'pedidoMinRetiradaAtivo'=>$pedidoMinRetiradaAtivo,'pedidoMinRetirada'=>$pedidoMinRetirada,
'clubePontosAtivo'=>$clubePontosAtivo,
'catalogoVersao'=>cfg($conn,$lojaId,'catalogo_versao',''),
'geoAtivo'=>cfg($conn,0,'saas_nominatim_ativo','1')==='1',
'pausaAtivaFim'=>$pausaAtivaFim,
],JSON_UNESCAPED_UNICODE);
$lojaCssVer = filemtime(__DIR__ . '/assets/css/loja.css');
$lojaJsVer = filemtime(__DIR__ . '/assets/js/loja.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<?php
$_bp = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$_bh = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_bd = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/';
?>
<base href="<?= htmlspecialchars($_bp . $_bh . $_bd) ?>">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title><?=htmlspecialchars($nomeLoja)?> — Cardápio</title>
<link rel="shortcut icon" href="../admin/assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="../admin/assets/img/favicon_store.png">
<meta name="theme-color" content="<?= htmlspecialchars($temaCorMenu) ?>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/loja.css?v=<?= $lojaCssVer ?>" rel="stylesheet">
<style>:root{--brown:<?= htmlspecialchars($temaCorMenu) ?>;}</style>
</head>
<body>

<!-- ══ PROFILE BANNER ══ -->
<div class="profile-banner-wrap">
  <?php if($capaLoja): ?>
    <img class="profile-banner-img" src="<?=htmlspecialchars($capaLoja)?>" alt="">
  <?php else: ?>
    <div class="profile-banner-placeholder"></div>
  <?php endif; ?>
  <div class="profile-banner-ui">
    
    <button class="profile-share-btn" onclick="compartilharLoja()" title="Compartilhar">
      <i class="bi bi-share-fill"></i>
    </button>
  </div>
</div>

<!-- ══ PROFILE HEADER ROW ══ -->
<div class="profile-header-row">
  <div class="profile-logo-col" onclick="abrirInfoLoja()" style="cursor:pointer" title="Informações da loja">
    <?php if($perfilLoja): ?>
      <img class="profile-logo" src="<?=htmlspecialchars($perfilLoja)?>" alt="">
    <?php else: ?>
      <div class="profile-logo profile-logo-init"><?=htmlspecialchars(mb_substr($nomeLoja,0,1,'UTF-8'))?></div>
    <?php endif; ?>
  </div>
  <div class="profile-side-col">
    <?php if($avaliacaoMedia > 0): ?>
      <div class="profile-rating"><i class="bi bi-star-fill"></i> <?=number_format($avaliacaoMedia,1,',','.')?></div>
    <?php endif; ?>
    <?php if($lojaInstagram): ?>
      <div class="profile-instagram" onclick="window.open('https://instagram.com/<?=urlencode($lojaInstagram)?>','_blank')">
        <i class="bi bi-instagram"></i>
        <span><?=htmlspecialchars($lojaInstagram)?></span>
      </div>
    <?php endif; ?>
  </div>
</div>

<!-- ══ STORE META ══ -->
<div class="profile-meta-wrap">
  <div class="profile-meta-name">
    <?=htmlspecialchars($nomeLoja)?>
    <?php if($lojaVerificada): ?>
      <i class="bi bi-patch-check-fill profile-verified-badge" title="Loja verificada"></i>
    <?php endif; ?>
  </div>
  <?php $localidade = implode(', ', array_filter([$lojaCidade, $lojaBairro])); ?>
  <?php if($localidade): ?>
    <div class="profile-meta-city"><?=htmlspecialchars($localidade)?></div>
  <?php endif; ?>
  <div class="profile-status-line <?=$lojaAberta?'open':'closed'?>" id="storeStatus">
    <span id="storeStatusText"><?php if($lojaAberta): ?>Aberto agora<?php elseif($pausaAtivaTitulo!==''): ?>Pausa programada: <?=htmlspecialchars($pausaAtivaTitulo)?><?php elseif(!$receberPedidosAtivo): ?>Não está recebendo pedidos<?php else: ?>Fechado<?=$proximoHorario?', abriremos '.$proximoHorario:''?><?php endif; ?></span>
  </div>
</div>

<!-- ══ INFO CHIPS ══ -->
<?php if($entAtiva || ($cashbackAtivo&&$cashbackPct>0) || $pedidoMinExibir>0): ?>
<div class="profile-chips-wrap">
  <?php if($entAtiva): ?>
  <div class="profile-chip">
    <i class="bi bi-clock"></i>
    <div class="profile-chip-info">
      <span class="chip-val"><?=$tEntMin?>-<?=$tEntMax?> min</span>
      <span class="chip-lbl">Entrega</span>
    </div>
  </div>
  <?php endif; ?>
  <?php if($cashbackAtivo&&$cashbackPct>0): ?>
  <div class="profile-chip">
    <i class="bi bi-percent"></i>
    <div class="profile-chip-info">
      <span class="chip-val"><?=$cashbackPct?>%</span>
      <span class="chip-lbl">Cashback</span>
    </div>
  </div>
  <?php endif; ?>
  <?php if($pedidoMinExibir>0): ?>
  <div class="profile-chip">
    <i class="bi bi-bag"></i>
    <div class="profile-chip-info">
      <span class="chip-val">R$ <?=number_format($pedidoMinExibir,2,',','.')?></span>
      <span class="chip-lbl">Pedido mín.</span>
    </div>
  </div>
  <?php endif; ?>
</div>
<?php endif; ?>

<!-- ══ ANNOUNCE / CUPOM DISPONÍVEL ══ -->
<div class="profile-announce d-none" id="profileAnnounce">
  <i class="bi bi-megaphone-fill" id="profileAnnounceIcon"></i>
  <span id="profileAnnounceText"><?=htmlspecialchars($descLoja)?></span>
</div>

<!-- ══ FLYER SLIDER ══ -->
<?php if($lojaFlyers): ?>
<div class="flyer-slider-wrap">
  <div class="flyer-slider" id="flyerSlider">
    <?php foreach($lojaFlyers as $flyerImg): ?>
      <div class="flyer-slide"><img src="<?=htmlspecialchars($flyerImg)?>" alt=""></div>
    <?php endforeach; ?>
  </div>
  <?php if(count($lojaFlyers) > 1): ?>
  <div class="flyer-dots" id="flyerDots">
    <?php foreach($lojaFlyers as $i => $flyerImg): ?>
      <span class="flyer-dot<?=$i===0?' active':''?>"></span>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
</div>
<?php endif; ?>

<!-- ══ CATEGORIAS NAV ══ -->
<?php if($categorias): ?>
<nav class="cat-nav">
  <div class="cat-nav-inner">
    <div class="cat-scroll" id="catScroll">
      <?php foreach($categorias as $i=>$cat): ?>
        <button class="cat-btn <?=$i===0?'active':''?>" data-cat="<?=$cat['id']?>" onclick="scrollToCat(<?=$cat['id']?>)">
          <?=htmlspecialchars($cat['nome'])?>
        </button>
      <?php endforeach; ?>
    </div>
    <button class="cat-search-btn" id="searchToggle" onclick="toggleSearch()"><i class="bi bi-search"></i></button>
  </div>
</nav>
<div class="search-bar" id="searchBar">
  <div class="search-wrap">
    <input class="search-input" id="searchInput" type="text" placeholder="Buscar produtos..." oninput="filtrarProdutos(this.value)">
    <button class="search-clear" id="searchClear" onclick="limparBusca()"><i class="bi bi-x-circle-fill"></i></button>
  </div>
</div>
<div class="no-result" id="noResult"><i class="bi bi-search" style="font-size:1.8rem;display:block;margin-bottom:8px;opacity:.3"></i>Nenhum produto encontrado</div>
<?php endif; ?>

<!-- ══ DESTAQUES (promoção e combos) ══ -->
<?php if($destaques): ?>
<div class="section-title">Destaques</div>
<div class="destaques-scroll">
  <?php foreach($destaques as $p): ?>
    <?php $isCombo = ($p['tipo'] ?? '') === 'combo'; ?>
    <div class="destaque-card"<?=$isCombo?'':' data-produto-id="'.(int)$p['id'].'"'?> onclick="abrirProduto(<?=$p['id']?>,<?=htmlspecialchars(json_encode(['id'=>$p['id'],'nome'=>$p['nome'],'descricao'=>$p['descricao']??'','preco_base'=>$p['preco_base'],'preco_final'=>$p['preco_final'],'em_promo'=>$p['em_promo'],'desc_pct'=>$p['desc_pct'],'imagem'=>$p['imagem'],'quantidade_minima'=>(int)($p['quantidade_minima']??0),'pontos_ganho'=>(int)($p['pontos_ganho']??0),'tem_variacoes'=>(int)($p['tem_variacoes']??0),'tipo'=>$isCombo?'combo':'produto','promo_imagem'=>$isCombo?null:($p['promo_imagem']??null),'promo_descricao'=>$isCombo?null:($p['promo_descricao']??null),'estoque'=>$isCombo?null:(int)($p['estoque']??0),'esgotado'=>!$isCombo&&!empty($p['esgotado'])]),ENT_QUOTES)?>)">
      <?php if($p['imagem']): ?>
        <img class="destaque-img" src="<?=htmlspecialchars($p['imagem'])?>" alt="" loading="lazy">
      <?php else: ?>
        <div class="destaque-img-ph"><i class="bi bi-image"></i></div>
      <?php endif; ?>
      <div class="destaque-badges">
        <?php if($p['em_promo']): ?><span class="badge-promo">-<?=$p['desc_pct']?>%</span><?php endif; ?>
        <?php if($isCombo): ?><span class="badge-combo">Combo</span><?php endif; ?>
        <?php if(!$isCombo && !empty($p['esgotado'])): ?><span class="badge-esgotado">Esgotado</span><?php endif; ?>
      </div>
      <div class="destaque-price">R$ <?=number_format($p['preco_final'],2,',','.')?></div>
      <?php if($p['em_promo']): ?>
        <div class="destaque-old">R$ <?=number_format($p['preco_base'],2,',','.')?></div>
      <?php endif; ?>
      <div class="destaque-name"><?=htmlspecialchars($p['nome'])?></div>
    </div>
  <?php endforeach; ?>
</div>
<?php endif; ?>

<!-- ══ PRODUTOS POR CATEGORIA ══ -->
<?php foreach($categorias as $cat): ?>
  <?php $prods=$produtosPorCat[$cat['id']]??[]; $combos=$combosPorCat[$cat['id']]??[]; ?>
  <section data-cat-section="<?=$cat['id']?>" data-layout="<?=htmlspecialchars($cat['modo_exibicao'])?>">
    <div class="cat-section">
      <div class="cat-section-title"><?=htmlspecialchars($cat['nome'])?></div>
      <div class="cat-produtos">
      <?php foreach($prods as $p): ?>
        <?php $pj=htmlspecialchars(json_encode(['id'=>$p['id'],'nome'=>$p['nome'],'descricao'=>$p['descricao']??'','preco_base'=>$p['preco_base'],'preco_final'=>$p['preco_final'],'em_promo'=>$p['em_promo'],'desc_pct'=>$p['desc_pct'],'imagem'=>$p['imagem'],'quantidade_minima'=>(int)($p['quantidade_minima']??0),'pontos_ganho'=>(int)($p['pontos_ganho']??0),'tem_variacoes'=>(int)($p['tem_variacoes']??0),'promo_imagem'=>$p['promo_imagem']??null,'promo_descricao'=>$p['promo_descricao']??null,'estoque'=>(int)($p['estoque']??0),'esgotado'=>!empty($p['esgotado'])]),ENT_QUOTES); ?>
        <div class="product-row<?=!empty($p['esgotado'])?' esgotado':''?>" data-produto-id="<?=(int)$p['id']?>" onclick="abrirProduto(<?=$p['id']?>,<?=$pj?>)">
          <div class="product-row-info">
            <div class="product-row-name"><?=htmlspecialchars($p['nome'])?></div>
            <?php if(!empty($p['descricao'])): ?>
              <div class="product-row-desc"><?=htmlspecialchars($p['descricao'])?></div>
            <?php endif; ?>
            <div class="product-row-prices">
              <?php if($p['em_promo']): ?>
                <span class="product-row-old">R$ <?=number_format($p['preco_base'],2,',','.')?></span>
              <?php endif; ?>
              <span class="product-row-price">R$ <?=number_format($p['preco_final'],2,',','.')?></span>
            </div>
          </div>
          <div class="product-row-right" id="prow-<?=$p['id']?>">
            <?php if($p['imagem']): ?>
              <img class="product-row-img" src="<?=htmlspecialchars($p['imagem'])?>" alt="" loading="lazy">
            <?php else: ?>
              <div class="product-row-img-ph"><i class="bi bi-image"></i></div>
            <?php endif; ?>
            <?php if(!empty($p['esgotado'])): ?>
              <span class="product-row-esgotado">Esgotado</span>
            <?php else: ?>
              <button class="product-row-add" onclick="event.stopPropagation();abrirProduto(<?=$p['id']?>,<?=$pj?>)"><i class="bi bi-plus"></i></button>
              <div class="product-row-qty d-none" id="pqty-<?=$p['id']?>">0</div>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
      <?php foreach($combos as $cb): ?>
        <?php $cj=htmlspecialchars(json_encode(['id'=>$cb['id'],'nome'=>$cb['nome'],'descricao'=>$cb['descricao']??'','preco_base'=>$cb['preco_base'],'preco_final'=>$cb['preco_final'],'em_promo'=>$cb['em_promo'],'desc_pct'=>$cb['desc_pct'],'imagem'=>$cb['imagem'],'quantidade_minima'=>0,'tipo'=>'combo']),ENT_QUOTES); ?>
        <div class="product-row" onclick="abrirProduto(<?=$cb['id']?>,<?=$cj?>)">
          <div class="product-row-info">
            <div class="product-row-name">
              <?=htmlspecialchars($cb['nome'])?>
              <span style="display:inline-block;font-size:.65rem;font-weight:700;background:#f59e0b;color:#fff;padding:1px 6px;border-radius:4px;vertical-align:middle;margin-left:5px;text-transform:uppercase;letter-spacing:.03em">Combo</span>
            </div>
            <?php if(!empty($cb['descricao'])): ?>
              <div class="product-row-desc"><?=htmlspecialchars($cb['descricao'])?></div>
            <?php endif; ?>
            <div class="product-row-prices">
              <?php if($cb['em_promo']): ?>
                <span class="product-row-old">R$ <?=number_format($cb['preco_base'],2,',','.')?></span>
              <?php endif; ?>
              <span class="product-row-price">R$ <?=number_format($cb['preco_final'],2,',','.')?></span>
            </div>
          </div>
          <div class="product-row-right" id="prow-<?=$cb['id']?>">
            <?php if($cb['imagem']): ?>
              <img class="product-row-img" src="<?=htmlspecialchars($cb['imagem'])?>" alt="" loading="lazy">
            <?php else: ?>
              <div class="product-row-img-ph"><i class="bi bi-box-seam"></i></div>
            <?php endif; ?>
            <button class="product-row-add" onclick="event.stopPropagation();abrirProduto(<?=$cb['id']?>,<?=$cj?>)"><i class="bi bi-plus"></i></button>
            <div class="product-row-qty d-none" id="pqty-<?=$cb['id']?>">0</div>
          </div>
        </div>
      <?php endforeach; ?>
      </div><!-- /cat-produtos -->
    </div>
  </section>
<?php endforeach; ?>

<!-- ══ BARRA CARRINHO ══ -->
<div class="cart-bar" id="cartBar">
  <div class="cart-bar-inner">
    <div class="cart-bar-sub">
      <div class="cart-bar-sub-lbl">Subtotal</div>
      <div class="cart-bar-sub-val">
        <span id="cartBarTotal">R$ 0,00</span>
        <span class="cart-bar-sub-cnt"><span id="cartCount">0 itens</span></span>
      </div>
    </div>
    <button class="cart-bar-btn" onclick="abrirCarrinho()">Ver carrinho</button>
  </div>
</div>

<!-- ══ RODAPÉ ══ -->
<footer class="loja-footer">
  <p>Tem um negócio e precisa de um cardápio digital simples e fácil? O <strong>Lilly</strong> é a solução.</p>
  <a href="https://lillymenu.com/public/home" target="_blank" class="footer-btn">Saiba mais</a>
</footer>

<!-- ══ BOTTOM NAV ══ -->
<nav class="bottom-nav">
  <button class="nav-btn active" id="navMenu" onclick="mostrarTab('menu')">
    <i class="bi bi-list"></i>Menu
  </button>
  <?php if ($clubePontosAtivo): ?>
  <button class="nav-btn" id="navPontos" onclick="mostrarTab('pontos')">
    <i class="bi bi-currency-dollar"></i>Pontos
  </button>
  <?php endif; ?>
  <button class="nav-btn" id="navPedidos" onclick="mostrarTab('pedidos')" style="position:relative">
    <span style="position:relative;display:inline-flex;align-items:center;justify-content:center">
      <i class="bi bi-bag"></i>
      <span class="nav-badge d-none" id="pedidosBadge" style="top:-8px;right:-8px"></span>
    </span>
    Pedidos
  </button>
</nav>

<!-- ══ MODAL INFO DA LOJA ══ -->
<div class="info-modal-overlay" id="infoModalOverlay" onclick="fecharInfoModal()"></div>
<div class="info-modal" id="infoSheet">
  <div class="info-modal-head">
    <span class="info-modal-head-title">Informações da loja</span>
    <button class="info-modal-close" onclick="fecharInfoModal()"><i class="bi bi-x"></i></button>
  </div>
  <div class="info-modal-body">
    <!-- Tabs -->
    <div class="info-tabs">
      <button class="info-tab active" onclick="infoTab('info',this)">Informações</button>
      <button class="info-tab" onclick="infoTab('horario',this)">Horário</button>
      <button class="info-tab" onclick="infoTab('pagamento',this)">Pagamento</button>
    </div>

    <!-- Painel: Informações -->
    <div class="info-panel active" id="ipInfo">
      <?php if($perfilLoja): ?>
        <img class="info-store-logo" src="<?=htmlspecialchars($perfilLoja)?>" alt="">
      <?php else: ?>
        <div class="info-store-logo" style="display:flex;align-items:center;justify-content:center"><?=mb_substr($nomeLoja,0,1,'UTF-8')?></div>
      <?php endif; ?>
      <div class="info-store-name"><?=htmlspecialchars($nomeLoja)?></div>
      <?php if($descLoja): ?>
        <div class="info-store-desc"><?=htmlspecialchars($descLoja)?></div>
      <?php endif; ?>

      <?php $wppNum = preg_replace('/\D+/','',$lojaContato); ?>

      <?php if($enderecoLoja): ?>
        <div class="info-section-label">Endereço</div>
        <div class="info-address-wrap">
          <div class="info-address-text"><?=htmlspecialchars($enderecoLoja)?></div>
          <button class="info-map-btn" title="Mapa"
            onclick="window.open('https://maps.google.com/?q=<?=urlencode($enderecoLoja)?>','_blank')">
            <i class="bi bi-map"></i>
          </button>
        </div>
      <?php endif; ?>

      <?php if($lojaInstagram || $wppNum): ?>
        <div class="info-section-label">Redes sociais</div>
        <div style="display:flex;gap:10px;margin-top:2px;padding-bottom:2px">
          <?php if($wppNum): ?>
            <button class="info-social-icon-btn" title="WhatsApp"
              onclick="window.open('https://wa.me/55<?=$wppNum?>','_blank')">
              <i class="bi bi-whatsapp"></i>
            </button>
          <?php endif; ?>
          <?php if($lojaInstagram): ?>
            <button class="info-social-icon-btn" title="Instagram"
              onclick="window.open('https://instagram.com/<?=urlencode($lojaInstagram)?>','_blank')">
              <i class="bi bi-instagram"></i>
            </button>
          <?php endif; ?>
        </div>
      <?php endif; ?>
    </div>

    <!-- Painel: Horário -->
    <div class="info-panel" id="ipHorario">
      <?php
        $horSemana  = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
        $horaAb     = cfg($conn,$lojaId,'horario_abertura','');
        $horaFe     = cfg($conn,$lojaId,'horario_fechamento','');
        $diasFuncRaw= cfg($conn,$lojaId,'dias_funcionamento','');
        $diasFunc   = $diasFuncRaw ? array_map('intval', array_filter(explode(',', $diasFuncRaw))) : [];
        $diasNomes  = [1=>'Domingo',2=>'Segunda',3=>'Terça',4=>'Quarta',5=>'Quinta',6=>'Sexta',7=>'Sábado'];
        $agora      = new DateTime('now', new DateTimeZone('America/Fortaleza'));
        $phpNHoje   = (int)$agora->format('N');
        $ckHoje     = ($phpNHoje % 7) + 1;
        $horaAtualMin = (int)$agora->format('H') * 60 + (int)$agora->format('i');
      ?>
      <?php for($dk=1;$dk<=7;$dk++): ?>
        <?php
          $hd = $horSemana[$dk] ?? $horSemana[(string)$dk] ?? null;
          /* fallback apenas se dia estiver em dias_funcionamento (ou sem restrição) */
          if(!$hd && $horaAb && $horaFe) {
            if(!$diasFunc || in_array($dk, $diasFunc)) {
              $hd = ['inicio'=>$horaAb,'fim'=>$horaFe];
            }
          }
          $isHoje = ($dk === $ckHoje);
          $aberto = $hd && !empty($hd['inicio']) && !empty($hd['fim']);
          /* verifica se fecha em menos de 1 hora */
          $fechaBreve = false;
          if($isHoje && $aberto && !empty($hd['fim'])) {
            $fimParts  = explode(':', $hd['fim']);
            $fimMin    = (int)($fimParts[0] ?? 0) * 60 + (int)($fimParts[1] ?? 0);
            $diff      = $fimMin - $horaAtualMin;
            $fechaBreve = ($diff > 0 && $diff <= 60);
          }
        ?>
        <div class="horario-card <?=$isHoje?'hoje':''?>">
          <div class="horario-card-left">
            <div class="horario-card-dia"><?=htmlspecialchars($diasNomes[$dk])?></div>
            <?php if($isHoje): ?><span class="horario-hoje-badge">Hoje</span><?php endif; ?>
          </div>
          <?php if($aberto): ?>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <span class="horario-card-hora"><?=$hd['inicio']?> – <?=$hd['fim']?></span>
              <?php if($fechaBreve): ?>
                <span style="font-size:.62rem;font-weight:700;background:#fef9c3;color:#854d0e;border-radius:999px;padding:2px 8px;white-space:nowrap">Fecha em breve</span>
              <?php endif; ?>
            </div>
          <?php else: ?>
            <span class="horario-card-fechado">Fechado</span>
          <?php endif; ?>
        </div>
      <?php endfor; ?>
    </div>

    <!-- Painel: Pagamento -->
    <div class="info-panel" id="ipPagamento">
      <?php if($pixAtivo&&$pixChave): ?>
        <div class="pag-card">
          <div class="pag-card-ico pix"><i class="bi bi-qr-code"></i></div>
          <div><div class="pag-card-nome">PIX</div><div class="pag-card-sub">Chave disponível após confirmar</div></div>
        </div>
      <?php endif; ?>
      <?php if($dinAtivo): ?>
        <div class="pag-card">
          <div class="pag-card-ico dinheiro"><i class="bi bi-cash-stack"></i></div>
          <div><div class="pag-card-nome">Dinheiro</div><div class="pag-card-sub">Pagamento na entrega / retirada</div></div>
        </div>
      <?php endif; ?>
      <?php if($credAtivo): ?>
        <div class="pag-card">
          <div class="pag-card-ico credito"><i class="bi bi-credit-card-2-front"></i></div>
          <div><div class="pag-card-nome">Cartão de crédito</div><div class="pag-card-sub">Maquininha na entrega / retirada</div></div>
        </div>
      <?php endif; ?>
      <?php if($debAtivo): ?>
        <div class="pag-card">
          <div class="pag-card-ico debito"><i class="bi bi-credit-card"></i></div>
          <div><div class="pag-card-nome">Cartão de débito</div><div class="pag-card-sub">Maquininha na entrega / retirada</div></div>
        </div>
      <?php endif; ?>
    </div>
  </div>
</div>

<!-- ══ MODAL AUTH (Pedidos / Pontos) ══ -->
<div class="auth-modal-overlay" id="authModalOverlay" onclick="fecharAuthModal()"></div>
<div class="auth-modal" id="authModal">
  <div class="auth-modal-head">
    <span class="auth-modal-title" id="authModalTitle">Lista de pedidos</span>
    <button class="auth-modal-close" onclick="fecharAuthModal()"><i class="bi bi-x"></i></button>
  </div>
  <div class="auth-modal-body">
    <p class="auth-modal-desc" id="authModalDesc">Para ver seus pedidos ativos é necessário entrar com seu número de telefone.</p>
    <div class="auth-modal-field">
      <label>Telefone para contato</label>
      <input type="tel" id="authTel" placeholder="(00) 00000-0000"
             inputmode="numeric" autocomplete="tel" maxlength="15"
             oninput="maskAuthTelInput(this)"
             onkeydown="if(event.key==='Enter'&&!document.getElementById('authBtnEntrar').disabled) entrarAuth()">
    </div>
    <div class="auth-modal-info"><i class="bi bi-info-circle-fill" style="margin-right:5px"></i>O número de telefone deve ser o mesmo que foi utilizado para fazer o pedido.</div>
  </div>
  <div class="auth-modal-footer">
    <button class="auth-modal-btn-back" onclick="fecharAuthModal()">Voltar para o menu</button>
    <button class="auth-modal-btn-enter" id="authBtnEntrar" onclick="entrarAuth()" disabled style="opacity:.5;cursor:not-allowed">Entrar</button>
  </div>
</div>

<!-- ══ OVERLAY ══ -->
<div class="overlay" id="overlay" onclick="fecharTudo()"></div>

<!-- ══ SHARE PANEL ══ -->
<div class="share-backdrop" id="shareBackdrop" onclick="fecharSharePanel()"></div>
<div class="share-panel" id="sharePanel">
  <div class="share-panel-handle"></div>
  <div class="share-panel-title">Compartilhar</div>
  <div class="share-panel-apps" id="sharePanelApps">
    <a class="share-app" id="shareWpp" href="#" target="_blank" rel="noopener">
      <div class="share-app-icon" style="background:#25D366"><i class="bi bi-whatsapp"></i></div>
      <span>WhatsApp</span>
    </a>
    <a class="share-app" id="shareTelegram" href="#" target="_blank" rel="noopener">
      <div class="share-app-icon" style="background:#229ED9"><i class="bi bi-telegram"></i></div>
      <span>Telegram</span>
    </a>
    <div class="share-app" onclick="copiarShareUrl()">
      <div class="share-app-icon" style="background:#555"><i class="bi bi-link-45deg"></i></div>
      <span>Copiar link</span>
    </div>
  </div>
  <div class="share-url-row">
    <input class="share-url-input" id="shareUrlInput" type="text" readonly>
    <button class="share-copy-btn" onclick="copiarShareUrl()" title="Copiar"><i class="bi bi-copy"></i></button>
  </div>
  <button class="share-cancel-btn" onclick="fecharSharePanel()">Cancelar</button>
</div>

<!-- ══ PRODUTO MODAL ══ -->
<div class="prod-modal-overlay" id="prodModalOverlay" onclick="fecharProdModal()"></div>
<div class="prod-modal prod-modal-sheet" id="prodModal">
  <button class="prod-modal-close" onclick="fecharProdModal()"><i class="bi bi-x"></i></button>
  <div class="prod-modal-scroll">
    <div class="prod-modal-top">
      <div class="prod-modal-img-wrap" id="pdImgWrap" onclick="toggleImgExpand()">
        <img id="pdImg" class="prod-modal-img d-none" src="" alt="">
        <div class="prod-modal-img-ph" id="pdImgPh"><i class="bi bi-image"></i></div>
        <span class="prod-modal-ver-maior" id="pdVerMaior"><i class="bi bi-arrows-fullscreen"></i> Ver maior</span>
      </div>
      <div class="prod-modal-info">
        <?php if ($clubePontosAtivo): ?>
        <span class="prod-modal-pts" id="pdPts"><i class="bi bi-currency-dollar"></i> Ganhe <span id="pdPtsVal">1</span> pontos!</span>
        <?php endif; ?>
        <div class="prod-modal-nome" id="pdNome2"></div>
        <div class="prod-modal-desc" id="pdDesc"></div>
        <div class="prod-modal-preco" id="pdPreco"></div>
      </div>
    </div>
    <div id="pdQtdMinimaAviso" style="display:none;margin:8px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 14px;font-size:13px;color:#c2410c;align-items:center;gap:8px">
      <i class="bi bi-info-circle-fill" style="flex-shrink:0"></i>
      <span id="pdQtdMinimaMsg"></span>
    </div>
    <div class="combo-section" id="pdComboSection" style="display:none"></div>
    <div class="prod-modal-obs">
      <div class="prod-modal-obs-lbl">Alguma observação?</div>
      <textarea class="obs-field" id="pdObs" rows="2" placeholder=""></textarea>
    </div>
  </div>
  <div class="prod-modal-footer">
    <div class="prod-modal-qty">
      <button class="qty-btn" onclick="pdQtd(-1)"><i class="bi bi-dash"></i></button>
      <span class="prod-modal-qty-num" id="pdQtd">1</span>
      <button class="qty-btn" onclick="pdQtd(1)"><i class="bi bi-plus"></i></button>
    </div>
    <button class="prod-modal-add" id="pdAddBtn" onclick="addCart()">Adicionar <span id="pdTotal">R$ 0,00</span></button>
  </div>
</div>

<!-- ══ MODAL VARIAÇÕES + EXTRAS ══ -->
<div class="prod-modal-overlay" id="varModalOverlay" onclick="fecharVarModalLoja()"></div>
<div class="prod-modal prod-modal-sheet varmodal-poster" id="varModalLoja">
  <button class="prod-modal-close" onclick="fecharVarModalLoja()"><i class="bi bi-x"></i></button>
  <div class="prod-modal-scroll">
    <div class="varmodal-layout">
      <div class="varmodal-img-wrap">
        <img id="varModalImg" src="" alt="" class="varmodal-img d-none">
        <div class="varmodal-img-ph" id="varModalImgPh"><i class="bi bi-image"></i></div>
      </div>
      <div class="varmodal-info">
        <div class="varmodal-nome" id="varModalNome"></div>
        <div class="varmodal-desc" id="varModalDesc"></div>
        <div class="varmodal-preco" id="varModalPreco"></div>
        <div class="comp-group-head">
          <span class="comp-group-title">Escolha uma das opções</span>
          <span class="comp-group-badge" id="varModalBadge" style="display:none">Obrigatório</span>
        </div>
        <div class="comp-radio-list" id="varModalLista"></div>
        <div class="varmodal-search">
          <i class="bi bi-search"></i>
          <input type="text" id="varModalBusca" placeholder="Procure por uma opção" oninput="filtrarVariacoesLoja()">
        </div>
        <div class="varmodal-extra-section d-none" id="varModalExtraSection">
          <div class="comp-group-head" style="margin-top:14px">
            <span class="comp-group-title" style="text-transform:uppercase">Escolha seu extra</span>
            <span class="comp-group-badge" id="varModalExtraBadge" style="display:none">Obrigatório</span>
          </div>
          <div class="comp-group-sub">Escolha 1 opção.</div>
          <div class="comp-extra-list" id="varModalExtraLista"></div>
        </div>
        <div class="varmodal-extra-section d-none" id="varModalComplementoSection">
          <div class="comp-group-head" style="margin-top:14px">
            <span class="comp-group-title" style="text-transform:uppercase">Escolha o tipo</span>
            <span class="comp-group-badge" id="varModalComplementoBadge" style="display:none">Obrigatório</span>
          </div>
          <div class="comp-group-sub">Escolha 1 opção.</div>
          <div class="comp-extra-list" id="varModalComplementoLista"></div>
        </div>
      </div>
    </div>
    <div class="prod-modal-obs">
      <div class="prod-modal-obs-lbl">Alguma observação?</div>
      <textarea class="obs-field" id="varModalObs" rows="1" placeholder="Observações do cliente"></textarea>
    </div>
  </div>
  <div class="prod-modal-footer">
    <div class="prod-modal-qty">
      <button class="qty-btn" onclick="varModalQtd(-1)"><i class="bi bi-dash"></i></button>
      <span class="prod-modal-qty-num" id="varModalQtd">1</span>
      <button class="qty-btn" onclick="varModalQtd(1)"><i class="bi bi-plus"></i></button>
    </div>
    <button class="prod-modal-add" id="varModalAddBtn" onclick="confirmarVariacaoLoja()" disabled>Selecionar variação</button>
  </div>
</div>

<!-- ══ MODAL IDENTIFICAÇÃO (cupom) ══ -->
<div class="prod-modal-overlay" id="identCupomOverlay" onclick="fecharIdentCupomModal()"></div>
<div class="prod-modal" id="identCupomModal" style="max-width:400px">
  <button class="prod-modal-close" onclick="fecharIdentCupomModal()"><i class="bi bi-x"></i></button>
  <div class="prod-modal-scroll">
    <div style="padding:22px 20px 4px;text-align:center">
      <div style="width:52px;height:52px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <i class="bi bi-ticket-perforated-fill" style="font-size:1.3rem;color:#2563eb"></i>
      </div>
      <div style="font-size:.95rem;font-weight:700;color:#111;margin-bottom:4px">Identifique-se para ver o cupom</div>
      <div style="font-size:.8rem;color:#888;margin-bottom:16px">Informe seu nome e telefone para continuar.</div>
    </div>
    <div style="padding:0 20px">
      <input class="contact-field" type="text" id="identCupomNome" placeholder="Nome *" autocomplete="name">
      <input class="contact-field" type="tel" id="identCupomTel" placeholder="Telefone *"
             oninput="maskTelContact(this)" autocomplete="tel" inputmode="tel">
    </div>
  </div>
  <div class="prod-modal-footer" style="justify-content:center">
    <button class="prod-modal-add" onclick="confirmarIdentCupom()">Continuar</button>
  </div>
</div>

<!-- ══ MODAL CUPONS DISPONÍVEIS ══ -->
<div class="prod-modal-overlay" id="cupomListOverlay" onclick="fecharCupomListModal()"></div>
<div class="prod-modal" id="cupomListModal" style="max-width:420px">
  <button class="prod-modal-close" onclick="fecharCupomListModal()"><i class="bi bi-x"></i></button>
  <div class="prod-modal-scroll">
    <div style="padding:22px 20px 10px">
      <div style="font-size:.95rem;font-weight:700;color:#111;margin-bottom:2px">Cupons disponíveis</div>
      <div style="font-size:.8rem;color:#888;margin-bottom:14px">Toque em "Usar" para aplicar no seu pedido.</div>
      <div id="cupomListBody"></div>
    </div>
  </div>
</div>

<!-- ══ CARRINHO SHEET ══ -->
<div class="sheet" id="cartSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="fecharSheet('cartSheet')"><i class="bi bi-chevron-left"></i></button>
    <span class="sheet-head-title">Meu carrinho</span>
    <button class="cart-limpar-btn" id="cartLimparBtn" onclick="limparCarrinho()">Limpar</button>
  </div>
  <div class="sheet-body" id="cartBody"><div class="cart-empty"><i class="bi bi-bag"></i>Nenhum item</div></div>
  <div class="sheet-footer" id="cartFooter" style="display:none">
    <div id="minAlert" class="d-none" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:9px 12px;font-size:.78rem;color:#9a3412;display:flex;align-items:center;gap:7px;margin-bottom:10px">
      <i class="bi bi-exclamation-triangle-fill" style="color:#f97316;flex-shrink:0"></i>
      <span id="minAlertTxt"></span>
    </div>
    <div class="cart-footer-total">
      <div class="cart-footer-info">
        <div class="cart-footer-lbl">Total da compra</div>
        <div class="cart-footer-val"><span id="cTotal">R$ 0,00</span> <span class="cart-footer-cnt">/ <span id="cItemCount">0 itens</span></span></div>
      </div>
      <button class="cart-footer-btn" id="btnContinuar" onclick="abrirContato()">Continuar</button>
    </div>
  </div>
</div>

<!-- ══ CONTATO SHEET ══ -->
<div class="sheet" id="contactSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="voltarDoContato()"><i class="bi bi-chevron-left"></i></button>
    <div class="steps-wrap" id="stepsContact" style="flex:1;padding:4px 8px 0"></div>
    <button class="sheet-close" onclick="fecharSheet('contactSheet')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body">
    <input class="contact-field" type="text" id="cNomeContact" placeholder="Nome *" autocomplete="name">
    <input class="contact-field" type="tel" id="cTelContact" placeholder="Telefone *"
           oninput="maskTelContact(this);verificarBeneficiosContato(this.value)"
           autocomplete="tel" inputmode="tel">
    <!-- Cashback disponível no contato -->
    <div id="contactCashbackWrap" style="display:none;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:.68rem;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.04em" id="contactCashbackLbl">Cashback disponível</div>
          <div id="contactCashbackValor" style="font-size:.95rem;font-weight:800;color:#15803d"></div>
        </div>
        <button id="contactCashbackBtn" onclick="toggleCashbackContato()" style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:7px 16px;font-size:.78rem;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap">Usar</button>
      </div>
    </div>
  </div>
  <div class="sheet-footer" id="contactFooter">
    <div class="chk-breakdown" id="contactBreakdown"></div>
    <div class="cart-footer-total">
      <button class="cart-footer-toggle" id="contactBreakdownToggle" onclick="toggleContactBreakdown()"><i class="bi bi-chevron-down"></i></button>
      <div class="cart-footer-info">
        <div class="cart-footer-lbl">Total da compra</div>
        <div class="cart-footer-val"><span id="contactTotal">R$ 0,00</span> <span class="cart-footer-cnt">/ <span id="contactItemCount">0 itens</span></span></div>
      </div>
      <button class="cart-footer-btn" onclick="continuarDoContato()">Continuar</button>
    </div>
  </div>
</div>

<!-- ══ CHECKOUT SHEET ══ -->
<!-- campos ocultos para compatibilidade com enviar() -->
<input type="hidden" id="cNome"><input type="hidden" id="cTel">
<div id="cashbackBox" class="d-none">
  <div id="cashbackValorDisp"></div>
  <button type="button" id="btnUsarCashback" onclick="toggleCashback()"></button>
  <div id="cashbackAplicadoInfo" class="d-none"><span id="cashbackDescontoLabel"></span></div>
</div>

<div class="sheet" id="chkSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="voltarDoChkSheet()"><i class="bi bi-chevron-left"></i></button>
    <div class="steps-wrap" id="stepsChk" style="flex:1;padding:4px 8px 0"></div>
    <button class="sheet-close" onclick="fecharSheet('chkSheet')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body">
    <!-- step 1: tipo de entrega -->
    <div class="chk-step active" id="chk1">
      <div class="chk-section">Escolha o tipo de entrega</div>
      <?php if($entAtiva): ?>
      <button class="tipo-radio-card<?=$lojaAberta ? '' : ' d-none'?>" id="tcEntrega" onclick="selTipoNovo('entrega')">
        <div class="tipo-radio-card-info">
          <div class="tipo-radio-card-title">Entrega</div>
          <div class="tipo-radio-card-sub">Tempo para entrega de <?=$tEntMin?> a <?=$tEntMax?> minutos</div>
          <?php if($pedidoMinEntregaAtivo && $pedidoMinEntrega>0): ?>
          <div class="tipo-radio-card-min">Pedido mínimo: R$ <?=number_format($pedidoMinEntrega,2,',','.')?></div>
          <?php endif; ?>
        </div>
        <div class="tipo-radio-dot"><div class="tipo-radio-dot-inner"></div></div>
      </button>
      <?php endif; ?>
      <?php if($entAtiva && $agendamentoDeliveryAtivo): ?>
      <button class="tipo-radio-card" id="tcEntregaAg" onclick="selTipoNovo('entrega_agendada')">
        <div class="tipo-radio-card-info">
          <div class="tipo-radio-card-title">Entrega agendada</div>
          <div class="tipo-radio-card-sub">Selecione um horário específico para entregar seu pedido</div>
          <?php if($pedidoMinEntregaAtivo && $pedidoMinEntrega>0): ?>
          <div class="tipo-radio-card-min">Pedido mínimo: R$ <?=number_format($pedidoMinEntrega,2,',','.')?></div>
          <?php endif; ?>
        </div>
        <div class="tipo-radio-dot"><div class="tipo-radio-dot-inner"></div></div>
      </button>
      <?php endif; ?>
      <?php if($retAtiva): ?>
      <button class="tipo-radio-card<?=$lojaAberta ? '' : ' d-none'?>" id="tcRetirada" onclick="selTipoNovo('retirada')">
        <div class="tipo-radio-card-info">
          <div class="tipo-radio-card-title">Retirada</div>
          <div class="tipo-radio-card-sub">Tempo para retirada de <?=$tRetMin?> a <?=$tRetMax?> minutos</div>
          <?php if($pedidoMinRetiradaAtivo && $pedidoMinRetirada>0): ?>
          <div class="tipo-radio-card-min">Pedido mínimo: R$ <?=number_format($pedidoMinRetirada,2,',','.')?></div>
          <?php endif; ?>
        </div>
        <div class="tipo-radio-dot"><div class="tipo-radio-dot-inner"></div></div>
      </button>
      <?php endif; ?>
      <?php if($retAtiva && $agendamentoRetiradaAtivo): ?>
      <button class="tipo-radio-card" id="tcRetiradaAg" onclick="selTipoNovo('retirada_agendada')">
        <div class="tipo-radio-card-info">
          <div class="tipo-radio-card-title">Retirada agendada</div>
          <div class="tipo-radio-card-sub">Selecione um horário específico para retirar seu pedido</div>
          <?php if($pedidoMinRetiradaAtivo && $pedidoMinRetirada>0): ?>
          <div class="tipo-radio-card-min">Pedido mínimo: R$ <?=number_format($pedidoMinRetirada,2,',','.')?></div>
          <?php endif; ?>
        </div>
        <div class="tipo-radio-dot"><div class="tipo-radio-dot-inner"></div></div>
      </button>
      <?php endif; ?>
      <div class="tipo-hint" id="tipoHint"><i class="bi bi-info-circle-fill"></i> Escolha o tipo de entrega!</div>
      <!-- Resumo endereço (entrega imediata ou agendada) -->
      <div class="end-resumo d-none" id="endResumo">
        <div class="end-resumo-label">Entregar no endereço</div>
        <div class="end-resumo-card">
          <div class="end-resumo-row">
            <i class="bi bi-geo-alt end-resumo-icon"></i>
            <div class="end-resumo-text" id="endResumoAddr">—</div>
            <button class="end-resumo-edit" onclick="abrirEnderecoSheet()">Editar</button>
          </div>
          <div class="end-resumo-row">
            <i class="bi bi-bicycle end-resumo-icon"></i>
            <div class="end-resumo-text" id="endResumoTaxa">—</div>
          </div>
        </div>
      </div>
      <!-- Resumo retirada -->
      <div class="end-resumo d-none" id="retResumo">
        <div class="end-resumo-label">Retirar no endereço</div>
        <div class="end-resumo-card end-resumo-card--plain" onclick="window.open('https://maps.google.com/?q=<?=urlencode($enderecoLoja?:$nomeLoja)?>','_blank')">
          <div class="end-resumo-row">
            <i class="bi bi-shop end-resumo-icon"></i>
            <div class="end-resumo-text"><?=htmlspecialchars($enderecoLoja?:$nomeLoja)?></div>
            <i class="bi bi-map end-resumo-map-icon"></i>
          </div>
        </div>
      </div>
      <!-- Resumo agendamento -->
      <div class="end-resumo d-none" id="agendResumo">
        <div class="end-resumo-label">Agendamento</div>
        <div class="end-resumo-card">
          <div class="end-resumo-row">
            <i class="bi bi-calendar-event end-resumo-icon"></i>
            <div class="end-resumo-text" id="agendResumoTxt">—</div>
            <button class="end-resumo-edit" onclick="abrirAgendamentoSheet()">Editar</button>
          </div>
        </div>
      </div>
    </div>
    <!-- step 3: pagamento -->
    <div class="chk-step" id="chk3">
      <div class="chk-section">Forma de pagamento na entrega</div>
      <div class="pay-grid">
        <?php if($pixAtivo&&$pixChave): ?>
          <div class="pay-opt" data-pay="pix" onclick="selPag('pix',this)">
            <div class="pay-opt-body">
              <div class="pay-opt-name">Pix</div>
              <div class="pay-opt-pix-desc"><i class="bi bi-qr-code"></i> A chave será exibida após a confirmação do pedido. Envie o comprovante da transferência para a loja após o pagamento.</div>
            </div>
            <div class="pay-opt-dot"><i class="bi bi-check-lg pay-opt-dot-check"></i></div>
          </div>
        <?php endif; ?>
        <?php if($dinAtivo): ?>
          <div class="pay-opt" data-pay="dinheiro" onclick="selPag('dinheiro',this)">
            <div class="pay-opt-body">
              <div class="pay-opt-name">Dinheiro</div>
              <div class="pay-opt-sub-row"><i class="bi bi-cash-stack"></i> <span class="pay-opt-brands-label">Pagamento na entrega/retirada</span></div>
            </div>
            <div class="pay-opt-dot"><i class="bi bi-check-lg pay-opt-dot-check"></i></div>
          </div>
          <div id="trocoWrap" class="d-none" style="background:#f9fafb;border-radius:12px;padding:12px 14px;margin-top:2px;border:1px solid #e5e7eb">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e5e7eb">
              <span style="font-size:.76rem;color:#6b7280">Total do pedido</span>
              <span id="trocoTotalPedido" style="font-size:.92rem;font-weight:800;color:#111"></span>
            </div>
            <div style="font-size:.8rem;font-weight:600;margin-bottom:8px">Precisa de troco?</div>
            <div style="display:flex;gap:8px;margin-bottom:8px">
              <button type="button" id="btnTrocoSim" onclick="setTroco(true)" style="flex:1;border:1.5px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px;font-size:.82rem;font-weight:600;transition:all .15s">Sim</button>
              <button type="button" id="btnTrocoNao" onclick="setTroco(false)" style="flex:1;border:1.5px solid #e5e7eb;background:#fff;border-radius:10px;padding:8px;font-size:.82rem;font-weight:600;transition:all .15s">Não</button>
            </div>
            <div id="trocoValorWrap" class="d-none">
              <div style="font-size:.76rem;color:#6b7280;margin-bottom:4px">Troco para quanto?</div>
              <input type="text" id="trocoValor" inputmode="decimal" placeholder="Ex: 50,00"
                     oninput="maskTrocoValor(this)"
                     style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:9px 12px;font-size:.86rem;font-family:inherit;background:#fff;outline:none">
            </div>
          </div>
        <?php endif; ?>
        <?php if($credAtivo): ?>
          <div class="pay-opt" data-pay="credito" onclick="selPag('credito',this)">
            <div class="pay-opt-body">
              <div class="pay-opt-name">Cartão de crédito</div>
              <?php if($bandeirasCredito): ?>
                <div class="pay-opt-sub-row"><i class="bi bi-credit-card-2-front"></i> <span class="pay-opt-brands-label">Bandeiras aceitas:</span></div>
                <div class="pay-opt-brands"><?php foreach($bandeirasCredito as $b): ?><span class="pay-brand"><?=htmlspecialchars($b)?></span><?php endforeach; ?></div>
              <?php endif; ?>
            </div>
            <div class="pay-opt-dot"><i class="bi bi-check-lg pay-opt-dot-check"></i></div>
          </div>
        <?php endif; ?>
        <?php if($debAtivo): ?>
          <div class="pay-opt" data-pay="debito" onclick="selPag('debito',this)">
            <div class="pay-opt-body">
              <div class="pay-opt-name">Cartão de débito</div>
              <?php if($bandeirasDebito): ?>
                <div class="pay-opt-sub-row"><i class="bi bi-credit-card"></i> <span class="pay-opt-brands-label">Bandeiras aceitas:</span></div>
                <div class="pay-opt-brands"><?php foreach($bandeirasDebito as $b): ?><span class="pay-brand"><?=htmlspecialchars($b)?></span><?php endforeach; ?></div>
              <?php endif; ?>
            </div>
            <div class="pay-opt-dot"><i class="bi bi-check-lg pay-opt-dot-check"></i></div>
          </div>
        <?php endif; ?>
      </div>
    </div>
    <!-- step 4: confirmação -->
    <div class="chk-step" id="chk4">
      <div class="success-screen" id="successScreen">
        <!-- anéis pulsantes -->
        <div class="success-ring" style="width:140px;height:140px;animation-delay:.2s"></div>
        <div class="success-ring" style="width:190px;height:190px;animation-delay:.6s"></div>
        <!-- ícone central -->
        <div class="success-icon-wrap">
          <div class="success-icon-circle">
            <svg class="success-check-svg" viewBox="0 0 100 100" width="60" height="60">
              <circle class="success-check-ring" cx="50" cy="50" r="44" fill="none" stroke="#16a34a" stroke-width="6"/>
              <path class="success-check-mark" d="M28 52 L44 68 L74 34" fill="none" stroke="#16a34a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <!-- número do pedido -->
        <div style="font-size:.78rem;color:#16a34a;font-weight:700;letter-spacing:.06em;margin-bottom:6px;animation:fadeSlideUp .5s ease .4s both">PEDIDO <span id="confNum">#---</span> CONFIRMADO</div>
        <div class="success-title">Seu pedido foi criado<br>com sucesso!</div>
        <div class="success-sub" id="confTempo">Finalize enviando o pedido<br>para o WhatsApp da loja</div>
        <!-- PIX -->
        <div id="pixBoxConf" class="pix-box d-none" style="margin-bottom:16px;animation:fadeSlideUp .5s ease .7s both">
          <div class="pix-lbl">Pague via PIX</div>
          <div class="pix-chave" id="pixChaveConf"><?=htmlspecialchars($pixChave)?></div>
          <div class="pix-nome"><?=htmlspecialchars($pixNome)?></div>
          <button class="btn-copy" onclick="copiarPix()"><i class="bi bi-clipboard"></i> Copiar chave PIX</button>
        </div>
        <!-- botões -->
        <?php if($notificarPedidoWhatsappAtivo && preg_replace('/\D+/','',$lojaContato)): ?>
        <button class="success-btn-wpp" onclick="enviarWppPedido()">
          <i class="bi bi-whatsapp" style="font-size:1.2rem"></i> ENVIAR PARA O WHATSAPP DA LOJA
        </button>
        <?php endif; ?>
        <button class="success-btn-pedidos" onclick="irPedidos()">
          <i class="bi bi-bag"></i> Acompanhar pedido
        </button>
      </div>
    </div>
    <!-- step 5: resumo -->
    <div class="chk-step" id="chk5">
      <div id="resumoBody" style="padding-bottom:8px"></div>
    </div>
  </div>
  <div class="sheet-footer" id="chkFooter">
    <!-- footer step 1: tipo + total -->
    <div id="chkFooterStep1" style="display:none">
      <div class="chk-breakdown" id="chkStep1Breakdown"></div>
      <div class="cart-footer-total">
        <button class="cart-footer-toggle" id="chkStep1BreakdownToggle" onclick="toggleChkStep1Breakdown()"><i class="bi bi-chevron-down"></i></button>
        <div class="cart-footer-info">
          <div class="cart-footer-lbl">Total da compra</div>
          <div class="cart-footer-val"><span id="chkTotal">R$ 0,00</span> <span class="cart-footer-cnt">/ <span id="chkItemCount">0 itens</span></span></div>
        </div>
        <button class="cart-footer-btn" id="btnProxStep1" onclick="proxStep()" disabled style="opacity:.5">Continuar</button>
      </div>
    </div>
    <!-- footer step 3/5: breakdown + botão -->
    <div id="chkFooterBreakdown" style="display:none">
      <div class="chk-breakdown" id="chkBreakdown"></div>
      <div class="cart-footer-total">
        <button class="cart-footer-toggle" id="chkBreakdownToggle" onclick="toggleChkBreakdown()"><i class="bi bi-chevron-down"></i></button>
        <div class="cart-footer-info">
          <div class="cart-footer-lbl">Total da compra</div>
          <div class="cart-footer-val"><span id="chkBreakdownTotal">R$ 0,00</span> <span class="cart-footer-cnt">/ <span id="chkBreakdownItemCount">0 itens</span></span></div>
        </div>
        <button class="cart-footer-btn" id="btnProx" onclick="proxStep()">Continuar</button>
      </div>
    </div>
  </div>
</div>

<!-- ══ ENDEREÇO SHEET ══ -->
<div class="sheet" id="endSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <span class="sheet-head-title">Endereço de Entrega</span>
    <button class="sheet-close" onclick="fecharSheet('endSheet')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body">
    <!-- Endereço salvo no banco (aparece se cliente autenticado tiver endereço) -->
    <div id="endSavedCard" style="display:none" class="end-saved-card">
      <div class="end-saved-label"><i class="bi bi-check-circle-fill"></i> Endereço cadastrado</div>
      <div class="end-saved-text" id="endSavedText">—</div>
      <div class="end-saved-taxa" id="endSavedTaxa"></div>
      <div class="end-saved-btns">
        <button class="end-saved-usar" onclick="usarEnderecoSalvo()"><i class="bi bi-check-lg"></i> Usar este endereço</button>
        <button class="end-saved-editar" onclick="editarEndereco()">Editar</button>
      </div>
    </div>
    <div id="endFormWrap">
    <div class="geo-loc-prompt" id="geoLocPrompt" style="display:none">
      <div class="geo-loc-icon"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="geo-loc-text">
        <div class="geo-loc-title">Usar minha localização atual?</div>
        <div class="geo-loc-sub">Preenchemos o endereço automaticamente, você só confirma o número.</div>
      </div>
      <div class="geo-loc-btns">
        <button type="button" class="geo-loc-btn" id="geoLocBtnUsar" onclick="usarLocalizacaoAtual()">Usar</button>
        <button type="button" class="geo-loc-dismiss" onclick="dispensarGeoPrompt()" aria-label="Fechar"><i class="bi bi-x"></i></button>
      </div>
    </div>
    <div class="end-cep-wrap">
      <input type="text" id="eCep" placeholder="CEP" inputmode="numeric" maxlength="9" oninput="maskCep(this)">
      <button class="end-nao-sei" onclick="abrirCepManual()">Não sei meu cep</button>
      <span id="cepLoading" class="end-cep-loading" style="display:none">buscando...</span>
    </div>
    <div id="endCampos" style="display:none">
      <div class="fgroup" style="margin-bottom:12px"><input type="text" id="eRua" placeholder="Rua/Avenida" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111" onfocus="this.style.borderColor='var(--brown)'" onblur="this.style.borderColor='#e5e7eb'"></div>
      <div class="frow" style="margin-bottom:12px">
        <div class="fgroup"><input type="text" id="eBairro" placeholder="Bairro" list="listaBairros" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111" onfocus="this.style.borderColor='var(--brown)'" onblur="this.style.borderColor='#e5e7eb'">
          <datalist id="listaBairros">
            <?php foreach(array_keys($taxasBairro) as $b): ?><option value="<?=htmlspecialchars($b)?>"><?php endforeach; ?>
          </datalist>
        </div>
        <div class="fgroup"><input type="text" id="eCidade" placeholder="Cidade" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111" onfocus="this.style.borderColor='var(--brown)'" onblur="this.style.borderColor='#e5e7eb'"></div>
      </div>
      <div class="frow" style="margin-bottom:12px">
        <div class="fgroup"><input type="text" id="eNum" placeholder="Número" inputmode="numeric" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111" onfocus="this.style.borderColor='var(--brown)'" onblur="this.style.borderColor='#e5e7eb'"></div>
        <div class="fgroup">
          <select id="eEstado" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111;appearance:auto">
            <option value="">Estado</option>
            <?php foreach(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as $uf): ?>
            <option value="<?=$uf?>"><?=$uf?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>
      <div class="fgroup" style="margin-bottom:12px"><input type="text" id="eComp" placeholder="Complemento" style="width:100%;border:1.5px solid #e5e7eb;border-radius:12px;padding:12px 14px;font-size:.86rem;font-family:inherit;background:#fff;outline:none;color:#111" onfocus="this.style.borderColor='var(--brown)'" onblur="this.style.borderColor='#e5e7eb'"></div>
    </div>
    <div id="taxaInfoWrap" style="display:none;margin-top:4px">
      <div id="taxaInfoBox" style="background:#eff6ff;border-radius:10px;padding:10px 12px;font-size:.78rem;color:#1d4ed8"><i class="bi bi-bicycle"></i> <span id="taxaInfo"></span></div>
      <div id="taxaBairroNaoAtendido" style="display:none;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;font-size:.78rem;color:#9a3412;margin-top:4px">
        <i class="bi bi-exclamation-triangle"></i> Bairro fora da área de entrega. Entre em contato conosco.
        <?php if($wppNum): ?>
        <a href="https://wa.me/55<?=$wppNum?>?text=<?=urlencode('Olá! Meu bairro não está na área de entrega cadastrada, gostaria de combinar a forma de entrega do meu pedido.')?>" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:4px;margin-top:4px;color:#15803d;font-weight:600;text-decoration:none;font-size:.76rem">
          <i class="bi bi-whatsapp"></i> Falar no WhatsApp
        </a>
        <?php endif; ?>
      </div>
    </div>
    </div><!-- /endFormWrap -->
  </div>
  <div class="sheet-footer">
    <button class="btn-primary" onclick="confirmarEndereco()">Próximo</button>
  </div>
</div>

<!-- ══ MODAL: ENDEREÇO MANUAL (Não sei meu CEP) ══ -->
<div class="cep-manual-overlay" id="cepManualOverlay" onclick="fecharCepManual(event)">
  <div class="cep-manual-modal" onclick="event.stopPropagation()">
    <div class="cep-manual-head">
      <span class="cep-manual-title">Endereço de Entrega</span>
      <button class="cep-manual-close" onclick="fecharCepManual()"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="cep-manual-body">
      <div class="cep-manual-field"><input type="text" id="cmRua" placeholder="Rua/Avenida"></div>
      <div class="cep-manual-row">
        <div class="cep-manual-field"><input type="text" id="cmBairro" placeholder="Bairro" list="listaBairros"></div>
        <div class="cep-manual-field"><input type="text" id="cmCidade" placeholder="Cidade"></div>
      </div>
      <div class="cep-manual-row">
        <div class="cep-manual-field"><input type="text" id="cmNum" placeholder="Número" inputmode="numeric"></div>
        <div class="cep-manual-field">
          <select id="cmEstado">
            <option value="">Estado</option>
            <?php foreach(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as $uf): ?>
            <option value="<?=$uf?>"><?=$uf?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>
      <div class="cep-manual-field"><input type="text" id="cmComp" placeholder="Complemento"></div>
    </div>
    <div class="cep-manual-footer">
      <button class="btn-primary" onclick="confirmarCepManual()">Próximo</button>
    </div>
  </div>
</div>

<!-- ══ AGENDAMENTO SHEET ══ -->
<div class="sheet" id="agendSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="fecharSheet('agendSheet')"><i class="bi bi-chevron-left"></i></button>
    <span class="sheet-head-title">Agendamento</span>
    <button class="sheet-close" onclick="fecharSheet('agendSheet')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body">
    <div class="agend-label">Escolha a data e horário que você deseja receber seu pedido:</div>
    <div class="agend-dates" id="agendDates"></div>
    <div class="agend-slots" id="agendSlots"><div class="agend-empty">Selecione uma data acima</div></div>
  </div>
  <div class="sheet-footer" style="padding-top:8px">
    <div class="agend-footer-info" id="agendFooterInfo" style="display:none"></div>
    <button class="btn-primary" id="btnAgendConfirmar" onclick="confirmarAgendamento()" disabled
      style="opacity:.5;border-radius:10px;letter-spacing:.05em">CONTINUAR</button>
  </div>
</div>

<?php if ($clubePontosAtivo): ?>
<!-- ══ PONTOS SHEET ══ -->
<div class="sheet" id="pontosSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <button class="sheet-back" onclick="fecharSheet('pontosSheet');mostrarTab('menu')"><i class="bi bi-chevron-left"></i></button>
    <span class="sheet-head-title">Clube de Pontos</span>
    <button class="sheet-close" onclick="fecharSheet('pontosSheet');mostrarTab('menu')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body" id="pontosBody">
    <!-- Estado: busca de telefone / nome -->
    <div id="pontosBusca">
      <p style="font-size:.84rem;color:#666;margin-bottom:14px;line-height:1.5">
        Digite seu nome ou telefone para consultar seus pontos e resgatar produtos exclusivos.
      </p>
      <div class="pontos-busca-wrap">
        <input class="pontos-busca-input" type="search" id="pontosTel"
               placeholder="Nome ou telefone..."
               autocomplete="off"
               oninput="onPontosInput(this)">
        <i class="bi bi-search pontos-busca-icon"></i>
        <div class="pontos-dropdown" id="pontosDropdown"></div>
      </div>
    </div>
    <!-- Estado: saldo + produtos -->
    <div id="pontosConteudo" style="display:none">
      <div class="pontos-club-card">
        <div class="pontos-club-head">
          <div class="pontos-club-icon"><i class="bi bi-gift-fill"></i></div>
          <div>
            <div class="pontos-club-title">Clube de Pontos</div>
            <div class="pontos-club-sub">Troque seus pontos por recompensas</div>
          </div>
        </div>
        <div class="pontos-club-foot">
          <div class="pontos-club-num-box"><span id="pontosBalanceNum">0</span> pts</div>
          <button class="pontos-club-hist" onclick="fecharSheet('pontosSheet');mostrarTab('pedidos')"><i class="bi bi-clock-history"></i> Ver histórico</button>
        </div>
        <span class="d-none" id="pontosClienteNome"></span>
        <span class="d-none" id="pontosNivel"></span>
      </div>
      <div class="pontos-grid" id="pontosGrid">
        <div class="pontos-loading"><i class="bi bi-arrow-repeat"></i> Carregando...</div>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- ══ PEDIDOS SHEET ══ -->
<div class="sheet" id="pedidosSheet">
  <div class="sheet-handle"></div>
  <div class="sheet-head">
    <span class="sheet-head-title">Seus Pedidos</span>
    <button class="sheet-close" onclick="fecharSheet('pedidosSheet');mostrarTab('menu')"><i class="bi bi-x"></i></button>
  </div>
  <div class="sheet-body" id="pedidosBody">
    <div class="loading-pedidos">Carregando seus pedidos...</div>
  </div>
</div>

<!-- ══ MODAL CASHBACK (valor personalizado) ══ -->
<div class="cashback-modal-overlay" id="cashbackModalOverlay" onclick="fecharCashbackModal()">
  <div class="cashback-modal" onclick="event.stopPropagation()">
    <div class="cashback-modal-handle"></div>
    <div class="cashback-modal-head">
      <span class="cashback-modal-title">Cashback</span>
      <button class="cashback-modal-close" onclick="fecharCashbackModal()"><i class="bi bi-x"></i></button>
    </div>
    <div class="cashback-modal-body">
      <div class="cashback-modal-info">Total disponível: <strong id="cbModalTotal">R$ 0,00</strong></div>
      <div class="cashback-modal-sub" id="cbModalValidade"></div>
      <div class="cashback-modal-question">Qual valor do cashback que você deseja utilizar nesse pedido?</div>
      <div class="cashback-modal-label">Valor</div>
      <input class="cashback-modal-input" type="text" id="cbModalValor"
             inputmode="decimal" placeholder="0,00"
             oninput="maskCbValor(this)">
      <button class="cashback-modal-btn" onclick="confirmarCashbackModal()">Usar</button>
    </div>
  </div>
</div>

<?php if ($clubePontosAtivo): ?>
<!-- ══ CONFIRM DIALOG RESGATE ══ -->
<div class="confirm-dialog-overlay" id="confirmResgateOverlay" onclick="fecharConfirmResgate()">
  <div class="confirm-dialog" onclick="event.stopPropagation()">
    <div class="confirm-dialog-handle"></div>
    <div class="confirm-dialog-body">
      <div id="confirmResgateImg" class="confirm-dialog-img-ph"><i class="bi bi-gift"></i></div>
      <div class="confirm-dialog-info">
        <div class="confirm-dialog-title">Deseja resgatar este produto?</div>
        <div class="confirm-dialog-nome" id="confirmResgateNome">—</div>
        <span class="confirm-dialog-custo"><i class="bi bi-currency-dollar" style="font-size:.65rem"></i> <span id="confirmResgateCtx">0</span> pontos</span>
      </div>
    </div>
    <div class="confirm-dialog-btns">
      <button class="confirm-dialog-cancel" onclick="fecharConfirmResgate()">Cancelar</button>
      <button class="confirm-dialog-ok" id="confirmResgateBtn" onclick="executarResgate()"><i class="bi bi-gift"></i> Confirmar resgate</button>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- ══ ALERTA: BAIRRO FORA DA ÁREA DE ENTREGA ══ -->
<div class="confirm-dialog-overlay" id="bairroAlertOverlay" onclick="fecharBairroAlert()">
  <div class="confirm-dialog" onclick="event.stopPropagation()">
    <div class="confirm-dialog-handle"></div>
    <div class="confirm-dialog-body">
      <div class="confirm-dialog-img-ph confirm-dialog-icon-warn"><i class="bi bi-geo-alt-fill"></i></div>
      <div class="confirm-dialog-info">
        <div class="confirm-dialog-title">Endereço fora da área de entrega</div>
        <div class="confirm-dialog-msg">Não entregamos no bairro <b id="bairroAlertNome">—</b>. Confira o endereço informado ou entre em contato com a loja.</div>
      </div>
    </div>
    <div class="confirm-dialog-btns">
      <button class="confirm-dialog-ok full" onclick="fecharBairroAlert()">Entendi</button>
    </div>
  </div>
</div>

<!-- ══ MODAL AVALIAÇÃO ══ -->
<div class="aval-overlay" id="avalOverlay" onclick="fecharAvalModal()">
  <div class="aval-modal" onclick="event.stopPropagation()" style="position:relative">
    <button class="aval-modal-close" onclick="fecharAvalModal()"><i class="bi bi-x"></i></button>
    <div class="aval-modal-head">
      <div class="aval-modal-title" id="avalTitle">Como foi sua experiência?</div>
      <div class="aval-modal-subtitle" id="avalSubtitle"></div>
    </div>
    <div class="aval-itens" id="avalItens"></div>
    <div class="aval-body">
      <div class="aval-stars-wrap">
        <div class="aval-stars-hint">O que você achou do pedido?</div>
        <div class="aval-stars-hint-sub">Escolha de uma a cinco estrelas para avaliar o pedido</div>
        <div class="aval-stars" id="avalStars">
          <i class="bi bi-star-fill aval-star" data-v="1" onclick="_atualizarEstrelas(1)" onmouseenter="_hoverEstrelas(1)" onmouseleave="_hoverEstrelas(0)"></i>
          <i class="bi bi-star-fill aval-star" data-v="2" onclick="_atualizarEstrelas(2)" onmouseenter="_hoverEstrelas(2)" onmouseleave="_hoverEstrelas(0)"></i>
          <i class="bi bi-star-fill aval-star" data-v="3" onclick="_atualizarEstrelas(3)" onmouseenter="_hoverEstrelas(3)" onmouseleave="_hoverEstrelas(0)"></i>
          <i class="bi bi-star-fill aval-star" data-v="4" onclick="_atualizarEstrelas(4)" onmouseenter="_hoverEstrelas(4)" onmouseleave="_hoverEstrelas(0)"></i>
          <i class="bi bi-star-fill aval-star" data-v="5" onclick="_atualizarEstrelas(5)" onmouseenter="_hoverEstrelas(5)" onmouseleave="_hoverEstrelas(0)"></i>
        </div>
      </div>
      <div style="margin-top:14px">
        <div class="aval-section-lbl">Descrição da sua avaliação.</div>
        <textarea class="aval-textarea" id="avalDescricao" rows="3" placeholder="Descrição"></textarea>
      </div>
    </div>
    <div class="aval-footer">
      <button class="aval-btn-submit" id="avalBtnSubmit" onclick="enviarAvaliacao()" disabled style="opacity:.5">Avaliar</button>
    </div>
  </div>
</div>

<!-- TOAST GENÉRICO -->
<div class="toast" id="toast"><i class="bi bi-x-circle-fill toast-icon d-none" id="toastIcon"></i><span id="toastMsg"></span></div>
<!-- TOAST CARRINHO -->
<div class="toast-cart" id="toastCart">
  <div class="toast-cart-ico"><i class="bi bi-check-lg"></i></div>
  <div class="toast-cart-body">
    <div class="toast-cart-title" id="toastCartNome">Produto adicionado</div>
    <div class="toast-cart-sub">Adicionado ao carrinho ✓</div>
  </div>
</div>

<script>
const CFG = <?=$cfgJS?>;
const PROMO_AUTO = <?= $promoAutoPopup ? json_encode([
  'id'=>$promoAutoPopup['id'],
  'nome'=>$promoAutoPopup['nome'],
  'descricao'=>$promoAutoPopup['descricao']??'',
  'preco_base'=>$promoAutoPopup['preco_base'],
  'preco_final'=>$promoAutoPopup['preco_final'],
  'em_promo'=>true,
  'desc_pct'=>$promoAutoPopup['desc_pct'],
  'imagem'=>$promoAutoPopup['imagem'],
  'quantidade_minima'=>(int)($promoAutoPopup['quantidade_minima']??0),
  'pontos_ganho'=>(int)($promoAutoPopup['pontos_ganho']??0),
  'tem_variacoes'=>0,
  'promo_imagem'=>$promoAutoPopup['promo_imagem']??null,
  'promo_descricao'=>$promoAutoPopup['promo_descricao']??null,
], JSON_UNESCAPED_UNICODE) : 'null' ?>;
</script>
<script src="./assets/js/loja.js?v=<?= $lojaJsVer ?>"></script>
</body>
</html>

