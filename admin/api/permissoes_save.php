<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../protect.php';
require_once __DIR__ . '/../helpers/operacao.php';

header('Content-Type: application/json');

exigirPerfil(['admin', 'gerente']);

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function slugificar(string $valor): string {
  $valor = trim($valor);
  if ($valor === '') {
    return '';
  }
  if (function_exists('iconv')) {
    $valor = iconv('UTF-8', 'ASCII//TRANSLIT', $valor);
  }
  $valor = strtolower($valor);
  $valor = preg_replace('/[^a-z0-9]+/', '-', $valor);
  $valor = trim($valor, '-');
  return $valor;
}

function perfilPorNivel(?string $slug): string {
  if ($slug === 'nivel-1') {
    return 'admin';
  }
  if ($slug === 'nivel-2') {
    return 'operador';
  }
  return 'garcom';
}

if (!tabelaExiste($conn, 'permissoes_niveis') || !tabelaExiste($conn, 'permissoes_usuarios')) {
  echo json_encode(['ok' => false, 'msg' => 'Tabela de permissoes nao encontrada.']);
  exit;
}

$nome = trim((string) ($_POST['nome'] ?? ''));
$id = (int) ($_POST['id'] ?? 0);
$permissoesRaw = (string) ($_POST['permissoes'] ?? '[]');
$usuariosRaw = (string) ($_POST['usuarios'] ?? '[]');
$lojaId = (int) ($_SESSION['loja_id'] ?? 1);

if ($nome === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe o nome do nivel.']);
  exit;
}

$permissoes = json_decode($permissoesRaw, true);
if (!is_array($permissoes)) {
  echo json_encode(['ok' => false, 'msg' => 'Permissoes invalidas.']);
  exit;
}
$usuarios = json_decode($usuariosRaw, true);
if (!is_array($usuarios)) {
  echo json_encode(['ok' => false, 'msg' => 'Usuarios invalidos.']);
  exit;
}

$usuarios = array_values(array_unique(array_filter(array_map('intval', $usuarios), function($id){
  return $id > 0;
})));

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
if ($temLojaAdmin && $usuarios) {
  $placeholders = implode(',', array_fill(0, count($usuarios), '?'));
  $params = array_merge($usuarios, [$lojaId]);
  $stmt = $conn->prepare("SELECT id FROM admins WHERE id IN ($placeholders) AND loja_id = ?");
  $stmt->execute($params);
  $usuarios = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN, 0));
}

$slug = slugificar($nome);
if ($slug === '') {
  echo json_encode(['ok' => false, 'msg' => 'Nome invalido.']);
  exit;
}

$slugsFixos = ['nivel-1', 'nivel-2', 'nivel-3'];
if ($id > 0) {
  $stmt = $conn->prepare("SELECT slug FROM permissoes_niveis WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $slugAtual = (string) $stmt->fetchColumn();
  if ($slugAtual !== '' && in_array($slugAtual, $slugsFixos, true)) {
    $slug = $slugAtual;
  }
}
if ($id === 0 && !in_array($slug, $slugsFixos, true)) {
  echo json_encode(['ok' => false, 'msg' => 'Somente os niveis 1, 2 e 3 sao permitidos.']);
  exit;
}

$permissoesJson = json_encode(array_values($permissoes), JSON_UNESCAPED_UNICODE);
if ($permissoesJson === false) {
  echo json_encode(['ok' => false, 'msg' => 'Nao foi possivel salvar as permissoes.']);
  exit;
}

try {
  $conn->beginTransaction();

  if ($id > 0) {
    $stmt = $conn->prepare("SELECT id FROM permissoes_niveis WHERE slug = ? AND id <> ? LIMIT 1");
    $stmt->execute([$slug, $id]);
    if ($stmt->fetchColumn()) {
      throw new Exception('Ja existe uma permissao com este nome.');
    }
    $stmt = $conn->prepare("
      UPDATE permissoes_niveis
      SET nome = ?, slug = ?, permissoes_json = ?, atualizado_em = NOW()
      WHERE id = ?
    ");
    $stmt->execute([$nome, $slug, $permissoesJson, $id]);
    $permId = $id;
  } else {
    $stmt = $conn->prepare("SELECT id FROM permissoes_niveis WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $permId = $stmt->fetchColumn();

    if ($permId) {
      $stmt = $conn->prepare("
        UPDATE permissoes_niveis
        SET nome = ?, permissoes_json = ?, atualizado_em = NOW()
        WHERE id = ?
      ");
      $stmt->execute([$nome, $permissoesJson, $permId]);
    } else {
      $stmt = $conn->prepare("
        INSERT INTO permissoes_niveis (nome, slug, permissoes_json, criado_em)
        VALUES (?, ?, ?, NOW())
      ");
      $stmt->execute([$nome, $slug, $permissoesJson]);
      $permId = (int) $conn->lastInsertId();
    }
  }

  if ($permId) {
    if ($temLojaAdmin) {
      $stmt = $conn->prepare("
        DELETE pu
        FROM permissoes_usuarios pu
        JOIN admins a ON a.id = pu.admin_id
        WHERE pu.permissao_id = ? AND a.loja_id = ?
      ");
      $stmt->execute([$permId, $lojaId]);
    } else {
      $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE permissao_id = ?");
      $stmt->execute([$permId]);
    }
  }

  if ($usuarios) {
    $placeholders = implode(',', array_fill(0, count($usuarios), '?'));
    $stmt = $conn->prepare("DELETE FROM permissoes_usuarios WHERE admin_id IN ($placeholders)");
    $stmt->execute($usuarios);

    $stmtInsert = $conn->prepare("
      INSERT INTO permissoes_usuarios (permissao_id, admin_id, criado_em)
      VALUES (?, ?, NOW())
    ");
    foreach ($usuarios as $adminId) {
      $stmtInsert->execute([$permId, $adminId]);
    }
  }

  $stmt = $conn->prepare("SELECT slug FROM permissoes_niveis WHERE id = ? LIMIT 1");
  $stmt->execute([$permId]);
  $slug = $stmt->fetchColumn();
  if ($slug) {
    $perfil = perfilPorNivel((string) $slug);
    if ($usuarios) {
      $placeholders = implode(',', array_fill(0, count($usuarios), '?'));
      $params = array_merge([$perfil], $usuarios);
      $sql = "UPDATE admins SET perfil = ? WHERE id IN ($placeholders)";
      if ($temLojaAdmin) {
        $sql .= " AND loja_id = ?";
        $params[] = $lojaId;
      }
      $stmt = $conn->prepare($sql);
      $stmt->execute($params);
      if (in_array((int) ($_SESSION['admin_id'] ?? 0), $usuarios, true)) {
        $_SESSION['admin_perfil'] = $perfil;
      }
    }
  }

  $conn->commit();
  echo json_encode(['ok' => true, 'id' => $permId]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar.']);
}
