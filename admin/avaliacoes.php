<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/helpers/config.php';

$lojaId   = (int)($_SESSION['loja_id'] ?? 1);
$lojaNome = config($conn, 'nome_loja', 'Minha Loja');
$_SESSION['loja_nome'] = $lojaNome;
$cssVer    = filemtime(__DIR__ . '/assets/css/dashboard.css');
$finCssVer = filemtime(__DIR__ . '/assets/css/financial_module.css');
$rota      = basename($_SERVER['PHP_SELF']);

/* Garante tabela */
try {
  $conn->exec("CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT UNSIGNED NOT NULL,
    loja_id INT UNSIGNED NOT NULL,
    cliente_id INT UNSIGNED NULL,
    nota TINYINT NOT NULL,
    descricao TEXT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pedido (pedido_id, loja_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {}

/* Filtros */
$filtroNota  = isset($_GET['nota']) && $_GET['nota'] !== '' ? (int)$_GET['nota'] : null;
$filtroBusca = trim($_GET['busca'] ?? '');
$pagina      = max(1, (int)($_GET['pagina'] ?? 1));
$limite      = 6;

/* Stats */
$stats = $conn->query("
  SELECT COUNT(*) AS total, ROUND(AVG(nota),1) AS media,
    SUM(nota=5) AS n5, SUM(nota=4) AS n4, SUM(nota=3) AS n3,
    SUM(nota=2) AS n2, SUM(nota=1) AS n1
  FROM avaliacoes WHERE loja_id={$lojaId}
")->fetch(PDO::FETCH_ASSOC) ?: [];

$total = (int)($stats['total'] ?? 0);
$media = (float)($stats['media'] ?? 0);

/* Distribuição para gráfico */
$distData = [5=>(int)($stats['n5']??0),4=>(int)($stats['n4']??0),3=>(int)($stats['n3']??0),2=>(int)($stats['n2']??0),1=>(int)($stats['n1']??0)];

/* Lista filtrada */
$where  = ['a.loja_id = ?'];
$params = [$lojaId];
if ($filtroNota !== null) { $where[] = 'a.nota = ?'; $params[] = $filtroNota; }
if ($filtroBusca) {
  $where[] = '(c.nome LIKE ? OR a.descricao LIKE ?)';
  $params[] = "%{$filtroBusca}%"; $params[] = "%{$filtroBusca}%";
}
$sqlW = 'WHERE '.implode(' AND ', $where);

$stmtCount = $conn->prepare("SELECT COUNT(*) FROM avaliacoes a LEFT JOIN clientes c ON c.id=a.cliente_id AND c.loja_id=a.loja_id LEFT JOIN pedidos p ON p.id=a.pedido_id AND p.loja_id=a.loja_id {$sqlW}");
$stmtCount->execute($params);
$totalF   = (int)$stmtCount->fetchColumn();
$paginas  = max(1,(int)ceil($totalF/$limite));
$pagina   = min($pagina,$paginas);
$offset   = ($pagina-1)*$limite;

$pedCols   = $conn->query("SHOW COLUMNS FROM pedidos")->fetchAll(PDO::FETCH_COLUMN,0);
$selCodigo = in_array('codigo',$pedCols) ? "COALESCE(NULLIF(p.codigo,''),p.id)" : "p.id";

$stmtList = $conn->prepare("
  SELECT a.id, a.nota, a.descricao, a.criado_em,
         a.pedido_id, {$selCodigo} AS codigo_pedido,
         p.total AS pedido_total, p.criado_em AS pedido_data,
         c.nome AS cliente_nome, c.telefone AS cliente_tel
  FROM avaliacoes a
  LEFT JOIN pedidos  p ON p.id=a.pedido_id  AND p.loja_id=a.loja_id
  LEFT JOIN clientes c ON c.id=a.cliente_id AND c.loja_id=a.loja_id
  {$sqlW}
  ORDER BY a.criado_em DESC
  LIMIT {$limite} OFFSET {$offset}
");
$stmtList->execute($params);
$avaliacoes = $stmtList->fetchAll(PDO::FETCH_ASSOC);

/* Helpers */
function rs(int $n): string {
  $h=''; for($i=1;$i<=5;$i++) $h.=$i<=$n
    ?'<i class="bi bi-star-fill" style="color:#f59e0b;font-size:.8rem"></i>'
    :'<i class="bi bi-star"     style="color:#d1d5db;font-size:.8rem"></i>';
  return $h;
}
$notaLabels=[1=>'Péssimo',2=>'Ruim',3=>'Regular',4=>'Bom',5=>'Ótimo'];
$notaCores=[1=>'#ef4444',2=>'#f97316',3=>'#f59e0b',4=>'#3b82f6',5=>'#10b981'];

/* Paginação compacta */
function pgItems(int $p, int $total): array {
  if($total<=7) return range(1,$total);
  $it=[1];
  if($p>3) $it[]='...';
  for($i=max(2,$p-1);$i<=min($total-1,$p+1);$i++) $it[]=$i;
  if($p<$total-2) $it[]='...';
  $it[]=$total;
  return $it;
}

function pgUrl(array $get, int $p): string {
  return '?'.http_build_query(array_merge($get,['pagina'=>$p]));
}
$avaliacoesCssVer = filemtime(__DIR__ . '/assets/css/avaliacoes.css');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Avaliações — <?= htmlspecialchars($lojaNome) ?></title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
  <link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
  <link href="./assets/css/financial_module.css?v=<?= $finCssVer ?>" rel="stylesheet">
  <link href="./assets/css/avaliacoes.css?v=<?= $avaliacoesCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy fin-body">
<?php include __DIR__ . '/partials/sidebar.php'; ?>
<div class="fin-page">

  <!-- Header -->
  <div class="fin-header">
    <div>
      <h1 class="fin-title">Avaliações dos Clientes</h1>
      <div class="fin-subtitle">Opiniões e notas sobre os pedidos da sua loja</div>
    </div>
    <form method="get" style="display:flex;align-items:center;gap:8px">
      <input class="av-search" type="search" name="busca" placeholder="Buscar…" value="<?= htmlspecialchars($filtroBusca) ?>" style="width:160px;flex:none">
      <?php if($filtroNota||$filtroBusca): ?>
        <a href="avaliacoes.php" class="av-btn-limpar">✕ Limpar</a>
      <?php endif; ?>
    </form>
  </div>

  <!-- Stat cards + distribuição -->
  <div class="fin-grid fin-grid-2" style="margin-bottom:18px">

    <!-- Stat cards -->
    <div class="fin-card" style="padding:16px">
      <div class="fin-card-head" style="margin-bottom:12px">
        <div>
          <h2 class="fin-card-title">Resumo</h2>
          <div class="fin-card-subtitle">Total e média das avaliações</div>
        </div>
        <div class="fin-icon"><i class="bi bi-star-half"></i></div>
      </div>
      <div class="av-stats">
        <!-- Total -->
        <div class="av-stat">
          <div class="av-stat-val"><?= $total ?></div>
          <div class="av-stat-lbl">Total</div>
        </div>
        <!-- Média -->
        <div class="av-stat">
          <div class="av-stat-val" style="color:<?= $media>=4?'#10b981':($media>=3?'#f59e0b':'#ef4444') ?>"><?= $total>0?number_format($media,1,',','.'):'-' ?></div>
          <div class="av-stat-stars"><?= $total>0?rs((int)round($media)):'' ?></div>
          <div class="av-stat-lbl">Média</div>
        </div>
        <!-- Por nota -->
        <?php foreach([5=>'Ótimo',4=>'Bom',3=>'Regular',2=>'Ruim',1=>'Péssimo'] as $n=>$l): ?>
          <a href="?nota=<?=$n?>&busca=<?=urlencode($filtroBusca)?>" style="text-decoration:none">
            <div class="av-stat is-link <?= $filtroNota===$n?'is-active':'' ?>">
              <div class="av-stat-val" style="font-size:1.1rem;color:<?= $notaCores[$n] ?>"><?= $distData[$n] ?></div>
              <div class="av-stat-stars"><?= rs($n) ?></div>
              <div class="av-stat-lbl"><?= $l ?></div>
            </div>
          </a>
        <?php endforeach; ?>
      </div>
    </div>

    <!-- Distribuição visual -->
    <div class="fin-card" style="padding:16px">
      <div class="fin-card-head" style="margin-bottom:12px">
        <div>
          <h2 class="fin-card-title">Distribuição</h2>
          <div class="fin-card-subtitle">Percentual por nota</div>
        </div>
        <div class="fin-icon"><i class="bi bi-bar-chart-steps"></i></div>
      </div>
      <?php if($total>0): ?>
        <div class="av-dist">
          <?php foreach([5,4,3,2,1] as $n):
            $cnt = $distData[$n];
            $pct = $total>0 ? round($cnt/$total*100) : 0;
          ?>
          <div class="av-dist-row">
            <span style="width:14px;font-size:.72rem;color:<?= $notaCores[$n] ?>;font-weight:700"><?= $n ?></span>
            <i class="bi bi-star-fill" style="color:<?= $notaCores[$n] ?>;font-size:.72rem"></i>
            <div class="av-dist-bar-wrap">
              <div class="av-dist-bar" style="width:<?= $pct ?>%;background:<?= $notaCores[$n] ?>"></div>
            </div>
            <div class="av-dist-cnt"><?= $cnt ?></div>
            <span style="font-size:.68rem;color:#9ca3af;width:28px"><?= $pct ?>%</span>
          </div>
          <?php endforeach; ?>
        </div>
      <?php else: ?>
        <div style="text-align:center;padding:20px;color:#bbb;font-size:.82rem">Sem dados</div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Lista de avaliações -->
  <div class="fin-card" style="padding:16px">
    <div class="fin-card-head" style="margin-bottom:12px">
      <div>
        <h2 class="fin-card-title">Avaliações</h2>
        <div class="fin-card-subtitle">
          <?= $totalF ?> resultado<?= $totalF!=1?'s':'' ?><?= $filtroNota?' · '.rs($filtroNota):'' ?>
        </div>
      </div>
      <?php if($filtroNota||$filtroBusca): ?>
        <a href="avaliacoes.php" class="av-btn-limpar" style="font-size:.78rem">✕ Limpar filtros</a>
      <?php endif; ?>
    </div>

    <?php if($avaliacoes): ?>
      <div class="av-list">
        <?php foreach($avaliacoes as $av): ?>
          <div class="av-item">
            <div class="av-item-top">
              <div>
                <div class="av-item-cliente"><?= htmlspecialchars($av['cliente_nome']??'Cliente') ?></div>
                <?php if(!empty($av['cliente_tel'])): ?>
                  <div class="av-item-tel"><i class="bi bi-telephone"></i> <?= htmlspecialchars($av['cliente_tel']) ?></div>
                <?php endif; ?>
              </div>
              <div class="av-item-nota">
                <?= rs((int)$av['nota']) ?>
                <span class="av-nota-pill" style="background:<?= $notaCores[(int)$av['nota']] ?>">
                  <?= $notaLabels[(int)$av['nota']] ?>
                </span>
              </div>
            </div>
            <div class="av-item-meta">
              <span>Pedido <span class="av-item-pedido">#<?= htmlspecialchars((string)($av['codigo_pedido']??$av['pedido_id'])) ?></span></span>
              <?php if(!empty($av['pedido_data'])): ?>
                <span><?= date('d/m/Y H:i',strtotime($av['pedido_data'])) ?></span>
              <?php endif; ?>
              <?php if(!empty($av['pedido_total'])): ?>
                <span>R$ <?= number_format((float)$av['pedido_total'],2,',','.') ?></span>
              <?php endif; ?>
            </div>
            <?php if(!empty($av['descricao'])): ?>
              <div class="av-item-desc"><?= nl2br(htmlspecialchars($av['descricao'])) ?></div>
            <?php endif; ?>
            <div class="av-item-date">
              <i class="bi bi-clock" style="font-size:.65rem"></i>
              <?= date('d/m/Y \à\s H:i',strtotime($av['criado_em'])) ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>

      <!-- Paginação compacta -->
      <?php if($paginas>1): ?>
        <div class="fin-pagination" style="margin-top:14px">
          <?php if($pagina>1): ?>
            <a class="fin-page-btn" href="<?= pgUrl($_GET,$pagina-1) ?>">‹</a>
          <?php endif; ?>
          <?php foreach(pgItems($pagina,$paginas) as $it): ?>
            <?php if($it==='...'): ?>
              <span class="fin-page-ellipsis">…</span>
            <?php else: ?>
              <a class="fin-page-btn <?= (int)$it===$pagina?'is-active':'' ?>" href="<?= pgUrl($_GET,$it) ?>"><?= $it ?></a>
            <?php endif; ?>
          <?php endforeach; ?>
          <?php if($pagina<$paginas): ?>
            <a class="fin-page-btn" href="<?= pgUrl($_GET,$pagina+1) ?>">›</a>
          <?php endif; ?>
        </div>
      <?php endif; ?>

    <?php else: ?>
      <div class="av-empty">
        <i class="bi bi-star"></i>
        <p><?= $total>0?'Nenhuma avaliação para os filtros selecionados.':'Ainda não há avaliações.' ?></p>
      </div>
    <?php endif; ?>
  </div>

  <div class="dash-footer">Cardápio Digital Lilly &copy; <?= date('Y') ?></div>
</div><!-- /fin-page -->
</main>
</body>
</html>
