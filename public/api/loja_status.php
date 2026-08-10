<?php
session_start();
date_default_timezone_set('America/Fortaleza');
header('Content-Type: application/json');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';
require_once '../../admin/helpers/config.php';
require_once '../../admin/helpers/whatsapp.php';

function cfg(PDO $db, int $lid, string $chave, $default = ''): string {
  static $cache = [];
  $k = $lid.':'.$chave;
  if (isset($cache[$k])) return $cache[$k];
  $s = $db->prepare("SELECT valor FROM configuracoes WHERE chave=? AND loja_id=? LIMIT 1");
  $s->execute([$chave, $lid]);
  $v = $s->fetchColumn();
  return $cache[$k] = ($v !== false ? (string)$v : (string)$default);
}

try {
  $lojaId = definirLojaIdSessao($conn);

  $receberPedidosAtivo = cfg($conn,$lojaId,'receber_pedidos_ativo','1') === '1';
  $entAtiva = entregaDisponivelAgora($conn);
  $retAtiva = cfg($conn,$lojaId,'pedido_retirada_ativo','1') === '1';
  $lojaAberta = estaAberto($conn) && $receberPedidosAtivo;
  $catalogoVersao = cfg($conn,$lojaId,'catalogo_versao','');

  /* Semana completa de horários (mesma lógica do painel "Horário" do loja.php) */
  $horSemana   = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
  $horaAb      = cfg($conn,$lojaId,'horario_abertura','');
  $horaFe      = cfg($conn,$lojaId,'horario_fechamento','');
  $diasFuncRaw = cfg($conn,$lojaId,'dias_funcionamento','');
  $diasFunc    = $diasFuncRaw ? array_map('intval', array_filter(explode(',', $diasFuncRaw))) : [];
  $diasNomes   = [1=>'Domingo',2=>'Segunda',3=>'Terça',4=>'Quarta',5=>'Quinta',6=>'Sexta',7=>'Sábado'];
  $agoraDt     = new DateTime('now', new DateTimeZone('America/Fortaleza'));
  $phpNHoje    = (int)$agoraDt->format('N');
  $ckHoje      = ($phpNHoje % 7) + 1;
  $horaAtualMin= (int)$agoraDt->format('H') * 60 + (int)$agoraDt->format('i');

  $semana = [];
  for ($dk=1; $dk<=7; $dk++) {
    $hd = $horSemana[$dk] ?? $horSemana[(string)$dk] ?? null;
    if (!$hd && $horaAb && $horaFe) {
      if (!$diasFunc || in_array($dk, $diasFunc)) {
        $hd = ['inicio'=>$horaAb,'fim'=>$horaFe];
      }
    }
    $diaAberto = $hd && !empty($hd['inicio']) && !empty($hd['fim']);
    $fechaBreve = false;
    if ($dk === $ckHoje && $diaAberto && !empty($hd['fim'])) {
      $fimParts = explode(':', $hd['fim']);
      $fimMin   = (int)($fimParts[0] ?? 0) * 60 + (int)($fimParts[1] ?? 0);
      $diff     = $fimMin - $horaAtualMin;
      $fechaBreve = ($diff > 0 && $diff <= 60);
    }
    $semana[] = [
      'dia' => $diasNomes[$dk],
      'hoje' => $dk === $ckHoje,
      'aberto' => $diaAberto,
      'inicio' => $diaAberto ? $hd['inicio'] : '',
      'fim' => $diaAberto ? $hd['fim'] : '',
      'fechaBreve' => $fechaBreve,
    ];
  }

  /* Categorias com cronograma proprio (agendamento) que estao bloqueadas agora —
     usado pelo loja.js para detectar quando o horario passa de um limite mesmo
     sem nenhuma edicao no admin (o catalogo_versao so muda com uma acao do admin). */
  $categoriasBloqueadas = [];
  try {
    $catCols = $conn->query("SHOW COLUMNS FROM categorias")->fetchAll(PDO::FETCH_COLUMN,0);
    if (in_array('dias_semana',$catCols,true) && in_array('horario_ini',$catCols,true) && in_array('horario_fim',$catCols,true)) {
      $diasCod = ['dom','seg','ter','qua','qui','sex','sab'];
      $diaHojeCod = $diasCod[(int)$agoraDt->format('w')];
      $horaAgoraStr = $agoraDt->format('H:i');
      $stmtCatAg = $conn->prepare("
        SELECT id, dias_semana, horario_ini, horario_fim
        FROM categorias
        WHERE loja_id = ? AND ativo = 1
          AND (dias_semana IS NOT NULL OR horario_ini IS NOT NULL OR horario_fim IS NOT NULL)
      ");
      $stmtCatAg->execute([$lojaId]);
      foreach ($stmtCatAg->fetchAll(PDO::FETCH_ASSOC) as $catAg) {
        $bloqueada = false;
        if (!empty($catAg['dias_semana'])) {
          $diasCat = json_decode($catAg['dias_semana'],true) ?: [];
          if (!empty($diasCat) && !in_array($diaHojeCod,$diasCat,true)) $bloqueada = true;
        }
        if (!$bloqueada && !empty($catAg['horario_ini']) && $horaAgoraStr < $catAg['horario_ini']) $bloqueada = true;
        if (!$bloqueada && !empty($catAg['horario_fim']) && $horaAgoraStr > $catAg['horario_fim']) $bloqueada = true;
        if ($bloqueada) $categoriasBloqueadas[] = (int)$catAg['id'];
      }
    }
  } catch (Exception $e) {}
  sort($categoriasBloqueadas);

  /* Próximo horário (mesma lógica do loja.php) */
  $proximoHorario = '';
  if (!$lojaAberta) {
    $hs = json_decode(cfg($conn,$lojaId,'horarios_semana',''),true) ?: [];
    $agora = new DateTime('now', new DateTimeZone('America/Fortaleza'));
    $dn = [1=>'Dom',2=>'Seg',3=>'Ter',4=>'Qua',5=>'Qui',6=>'Sex',7=>'Sab'];
    for ($i=1;$i<=7;$i++){
      $d=clone $agora; $d->modify("+$i day");
      $ck=(((int)$d->format('N'))%7)+1;
      $hd=$hs[$ck]??$hs[(string)$ck]??null;
      if($hd&&!empty($hd['inicio'])){ $proximoHorario=$dn[$ck].' às '.$hd['inicio']; break; }
    }
    if(!$proximoHorario){ $ab=cfg($conn,$lojaId,'horario_abertura',''); if($ab) $proximoHorario='às '.$ab; }
  }

  echo json_encode([
    'ok' => true,
    'aberto' => $lojaAberta,
    'receberPedidosAtivo' => $receberPedidosAtivo,
    'proximoHorario' => $proximoHorario,
    'entAtiva' => $entAtiva,
    'retAtiva' => $retAtiva,
    'semana' => $semana,
    'catalogoVersao' => $catalogoVersao,
    'categoriasBloqueadas' => $categoriasBloqueadas,
  ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode(['ok'=>false,'msg'=>'Erro interno']);
}
