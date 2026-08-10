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
