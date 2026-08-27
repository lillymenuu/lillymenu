<?php
function obterLojaIdDaRequisicao(PDO $conn): int {
  if (session_status() === PHP_SESSION_NONE) {
    @session_start();
  }

  $paramLoja = $_GET['loja_id'] ?? $_POST['loja_id'] ?? null;
  if ($paramLoja !== null && $paramLoja !== '' && ctype_digit((string) $paramLoja)) {
    return (int) $paramLoja;
  }

  $slug = trim((string) ($_GET['loja'] ?? $_POST['loja'] ?? ''));
  $slug = preg_replace('/\.php$/i', '', $slug);
  if ($slug !== '') {
    if (ctype_digit($slug)) {
      return (int) $slug;
    }
    $slugLimpo = preg_replace('/[^a-zA-Z0-9_-]/', '', $slug);
    if ($slugLimpo !== '') {
      try {
        $cols = $conn->query("SHOW COLUMNS FROM configuracoes")->fetchAll(PDO::FETCH_COLUMN, 0);
        if (in_array('loja_id', $cols, true)) {
          $stmt = $conn->prepare("
            SELECT loja_id
            FROM configuracoes
            WHERE chave = 'link_loja'
              AND (valor = ? OR valor LIKE ? OR valor LIKE ?)
            LIMIT 1
          ");
          $like2 = '%/' . $slugLimpo;
          $like3 = '%/' . $slugLimpo . '/%';
          $stmt->execute([$slugLimpo, $like2, $like3]);
          $id = (int) $stmt->fetchColumn();
          if ($id > 0) {
            return $id;
          }
        }
      } catch (Exception $e) {
      }
      try {
        $stmtNome = $conn->prepare("SELECT id FROM lojas WHERE nome = ? LIMIT 1");
        $stmtNome->execute([$slug]);
        $id = (int) $stmtNome->fetchColumn();
        if ($id > 0) {
          return $id;
        }
      } catch (Exception $e) {
      }
    }
  }

  if (!empty($_SESSION['loja_id'])) {
    return (int) $_SESSION['loja_id'];
  }

  return 1;
}

function definirLojaIdSessao(PDO $conn): int {
  $lojaId = obterLojaIdDaRequisicao($conn);
  if ($lojaId > 0) {
    $_SESSION['loja_id'] = $lojaId;
  }
  return $lojaId;
}

/* Slug curto da loja (dominio.com/nomedaloja/...) a partir do loja_id —
   caminho inverso de obterLojaIdDaRequisicao(). Mesma logica usada em
   admin/modo_garcom.php pra montar o link de acesso do garcom: usa o slug
   configurado em "Link customizado" (configuracoes.link_loja) e, se a loja
   nunca customizou, cai no nome da loja normalizado. */
function obterLojaSlug(PDO $conn, int $lojaId): string {
  if ($lojaId <= 0) {
    return '';
  }
  $stmt = $conn->prepare("SELECT chave, valor FROM configuracoes WHERE loja_id = ? AND chave IN ('nome_loja','link_loja')");
  $stmt->execute([$lojaId]);
  $nomeLojaCfg = '';
  $linkLojaCfg = '';
  foreach ($stmt as $r) {
    if ($r['chave'] === 'nome_loja') {
      $nomeLojaCfg = $r['valor'];
    }
    if ($r['chave'] === 'link_loja') {
      $linkLojaCfg = $r['valor'];
    }
  }

  $slug = '';
  if ($linkLojaCfg) {
    if (preg_match('#[?&]loja=([^&]+)#', $linkLojaCfg, $m)) {
      $slug = urldecode($m[1]);
    } elseif (preg_match('#/([^/?]+)/?$#', $linkLojaCfg, $m)) {
      $slug = $m[1];
    } else {
      $slug = trim($linkLojaCfg, '/');
    }
    $slug = preg_replace('/\.php$/i', '', $slug);
  }
  if ($slug === '') {
    $slug = mb_strtolower($nomeLojaCfg, 'UTF-8');
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim($slug, '-');
  }
  return $slug;
}
