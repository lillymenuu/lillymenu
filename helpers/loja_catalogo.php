<?php
require_once __DIR__ . '/loja_cfg.php';

/* Extraído de public/loja.php (linhas 302-472 da versão original) sem
   mudança de comportamento — monta categorias/produtos/combos/destaques da
   loja pública. Usado tanto por public/loja.php (página HTML) quanto por
   public/api/loja_catalogo.php (endpoint JSON consumido pelo Next em
   /store/<slug>). */
function montarCatalogoLoja(PDO $conn, int $lojaId): array {
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
  $temPromoEtiqueta= in_array('promo_etiqueta',$cols);
  $temQtdMin  = in_array('quantidade_minima',$cols);
  $temPtGanho = in_array('pontos_ganho',$cols);
  $temDiasCol = in_array('dias_semana',$cols);
  $temHIniCol = in_array('horario_ini',$cols);
  $temHFimCol = in_array('horario_fim',$cols);
  $temVariacoesCol = in_array('tem_variacoes',$cols);
  $temDestaqueCol = in_array('destaque',$cols);
  $si =$temImg    ?', p.imagem':'';
  $sp =$temProm   ?', p.preco_promocional, p.promo_desativado':'';
  $spd=$temPromoDur?', p.promo_dias, p.promo_inicio':'';
  $spe=$temPromoExtra?', p.promo_imagem, p.promo_descricao':'';
  $spet=$temPromoEtiqueta?', p.promo_etiqueta':'';
  $sqm=$temQtdMin ?', p.quantidade_minima':'';
  $spg=$temPtGanho?', p.pontos_ganho':'';
  $sds=$temDiasCol?', p.dias_semana':'';
  $shi=$temHIniCol?', p.horario_ini':'';
  $shf=$temHFimCol?', p.horario_fim':'';
  $svr=$temVariacoesCol?', p.tem_variacoes':'';
  $sdest=$temDestaqueCol?', p.destaque':'';

  $_diasCod=['dom','seg','ter','qua','qui','sex','sab'];
  $_diaHoje =$_diasCod[(int)date('w')];
  $_horaAgora=date('H:i');

  $_categoriaDisponivelAgora=function($cat) use ($_diaHoje,$_horaAgora){
    if(!empty($cat['dias_semana'])){
      $dias=json_decode($cat['dias_semana'],true)??[];
      if(!empty($dias) && !in_array($_diaHoje,$dias)) return false;
    }
    if(!empty($cat['horario_ini']) && $_horaAgora < $cat['horario_ini']) return false;
    if(!empty($cat['horario_fim']) && $_horaAgora > $cat['horario_fim']) return false;
    return true;
  };

  $variacoesMinPrecoPorProduto=[];
  if($temVariacoesCol){
    try{
      $stmtVarMin=$conn->prepare("SELECT produto_id, MIN(preco) AS preco_min FROM produto_variacoes WHERE loja_id=? AND ativo=1 GROUP BY produto_id");
      $stmtVarMin->execute([$lojaId]);
      foreach($stmtVarMin->fetchAll(PDO::FETCH_ASSOC) as $row){
        $variacoesMinPrecoPorProduto[(int)$row['produto_id']]=(float)$row['preco_min'];
      }
    }catch(Throwable $e){}
  }

  $produtosPorCat=[];
  foreach($categorias as $cat){
    if(!$_categoriaDisponivelAgora($cat)) continue;
    $s=$conn->prepare("SELECT p.id,p.nome,p.descricao,p.preco{$si}{$sp}{$spd}{$spe}{$spet}{$sqm}{$spg}{$sds}{$shi}{$shf}{$svr}{$sdest},IFNULL(e.quantidade,0) AS estoque FROM produtos p LEFT JOIN estoque e ON e.produto_id=p.id AND e.loja_id=p.loja_id WHERE p.categoria_id=? AND p.ativo=1 AND p.loja_id=? ORDER BY p.ordem IS NULL,p.ordem,p.nome");
    $s->execute([$cat['id'],$lojaId]);
    $prods=$s->fetchAll(PDO::FETCH_ASSOC);
    if($prods){
      foreach($prods as &$pr){
        $pr['imagem']=fixImgPath($pr['imagem']??'');
        $pr['promo_imagem']=!empty($pr['promo_imagem'])?fixImgPath($pr['promo_imagem']):null;
        $pr['preco_produto']=(float)$pr['preco'];
        $pr['preco_base']=(float)$pr['preco'];
        $pr['tem_variacoes']=(!empty($pr['tem_variacoes'])&&(int)$pr['tem_variacoes']===1)?1:0;
        if($pr['tem_variacoes'] && isset($variacoesMinPrecoPorProduto[(int)$pr['id']])){
          $minVar=$variacoesMinPrecoPorProduto[(int)$pr['id']];
          $pr['preco_base']=$minVar>0?$minVar:$pr['preco_base'];
        }
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
  foreach($produtosPorCat as $ps) foreach($ps as $p) if($p['em_promo']||!empty($p['destaque'])) $destaques[]=$p;
  foreach($combosPorCat as $cs) foreach($cs as $c) $destaques[]=$c;

  /* Produtos em promocao (so produtos simples, combo nao entra em Promo) — usado
     pelo icone "Promo" da bottom-nav e pelo modal de lista/auto-popup abaixo. */
  $produtosEmPromo=[];
  foreach($produtosPorCat as $ps) foreach($ps as $p) if($p['em_promo']) $produtosEmPromo[]=$p;

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

  return compact('categorias','produtosPorCat','combosPorCat','destaques','produtosEmPromo','promoAutoPopup');
}
