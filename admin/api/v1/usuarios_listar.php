<?php
/*
 * Endpoint novo (nao existia no legado, que montava a lista inline em PHP
 * dentro de admin/configuracoes.php) — consolida usuarios da loja + niveis
 * de permissao (fixos nivel-1/nivel-2/nivel-3 + personalizados ja usados
 * por algum usuario da loja) num unico JSON pro card "Usuarios" do /settings.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';
require_once __DIR__ . '/../../helpers/operacao.php';

header('Content-Type: application/json; charset=utf-8');

$auth   = apiAuthExigir($conn);
$lojaId = $auth['loja_id'];
$_SESSION['admin_id'] = $auth['admin_id'];
$_SESSION['admin_perfil'] = $auth['perfil'];
$_SESSION['loja_id'] = $lojaId;

function tabelaExisteV1(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

$permsMenu = [
  'menu.dashboard',
  'menu.pdv',
  'menu.gestor_pedidos',
  'menu.pedidos',
  'menu.produtos',
  'menu.estoque',
  'menu.clientes',
  'menu.relatorios',
  'menu.relatorios_fidelidade',
  'menu.controle_caixa',
  'menu.cupons',
  'menu.configuracoes'
];
$niveisPadrao = [
  'nivel-1' => [
    'nome' => 'Nivel 1',
    'descricao' => 'Acesso total ao sistema',
    'permissoes' => $permsMenu
  ],
  'nivel-2' => [
    'nome' => 'Nivel 2',
    'descricao' => 'Operador de caixa',
    'permissoes' => [
      'menu.pdv',
      'menu.gestor_pedidos',
      'menu.clientes'
    ]
  ],
  'nivel-3' => [
    'nome' => 'Nivel 3',
    'descricao' => 'Consulta de relatorios',
    'permissoes' => [
      'menu.relatorios',
      'menu.relatorios_fidelidade'
    ]
  ]
];

function garantirNiveisPadrao(PDO $conn, array $niveisPadrao): array {
  $niveisFixos = [];
  foreach ($niveisPadrao as $slug => $nivel) {
    $stmt = $conn->prepare("SELECT id, nome, permissoes_json FROM permissoes_niveis WHERE slug = ? LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
      $permsJson = json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
      $stmtIns = $conn->prepare("
        INSERT INTO permissoes_niveis (nome, slug, permissoes_json, criado_em)
        VALUES (?, ?, ?, NOW())
      ");
      $stmtIns->execute([$nivel['nome'], $slug, $permsJson]);
      $row = [
        'id' => (int) $conn->lastInsertId(),
        'nome' => $nivel['nome'],
        'permissoes_json' => $permsJson
      ];
    }
    $permissoesJson = $row['permissoes_json'] ?? json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
    $decoded = json_decode((string) $permissoesJson, true);
    $temMenu = false;
    if (is_array($decoded)) {
      foreach ($decoded as $perm) {
        if (strpos((string) $perm, 'menu.') === 0) {
          $temMenu = true;
          break;
        }
      }
    }
    if (!$temMenu) {
      $permissoesJson = json_encode($nivel['permissoes'], JSON_UNESCAPED_UNICODE);
      $stmtUp = $conn->prepare("
        UPDATE permissoes_niveis
        SET permissoes_json = ?, atualizado_em = NOW()
        WHERE slug = ?
      ");
      $stmtUp->execute([$permissoesJson, $slug]);
    }
    $niveisFixos[$slug] = [
      'id' => (int) ($row['id'] ?? 0),
      'slug' => $slug,
      'nome' => $row['nome'] ?? $nivel['nome'],
      'descricao' => $nivel['descricao'],
      'permissoes_json' => $permissoesJson
    ];
  }
  return $niveisFixos;
}

function rotuloNivelUsuario(array $usuario): string {
  $slug = $usuario['permissao_slug'] ?? null;
  if ($slug === 'nivel-1') return 'Admin';
  if ($slug === 'nivel-2') return 'Garçom';
  if ($slug) return (string) ($usuario['permissao_nome'] ?? 'Personalizada');
  return ($usuario['perfil'] ?? '') === 'admin' ? 'Admin' : 'Sem permissão';
}

$niveisAdmin = [];
$niveisPersonalizados = [];
$nivelAdminId = 0;
$nivelGarcomId = 0;
$temPermissoes = tabelaExisteV1($conn, 'permissoes_niveis');
$temPermUsuarios = tabelaExisteV1($conn, 'permissoes_usuarios');

if ($temPermissoes) {
  garantirNiveisPadrao($conn, $niveisPadrao);
  $stmt = $conn->query("
    SELECT id, nome, slug
    FROM permissoes_niveis
    WHERE slug IN ('nivel-1','nivel-2','nivel-3')
    ORDER BY FIELD(slug, 'nivel-1','nivel-2','nivel-3')
  ");
  $niveisAdmin = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  foreach ($niveisAdmin as $nivel) {
    if ($nivel['slug'] === 'nivel-1') $nivelAdminId = (int) $nivel['id'];
    if ($nivel['slug'] === 'nivel-2') $nivelGarcomId = (int) $nivel['id'];
  }

  if ($temPermUsuarios) {
    $stmt = $conn->prepare("
      SELECT DISTINCT pn.id, pn.nome, pn.slug
      FROM permissoes_niveis pn
      JOIN permissoes_usuarios pu ON pu.permissao_id = pn.id
      JOIN admins a ON a.id = pu.admin_id
      WHERE a.loja_id = ? AND pn.slug NOT IN ('nivel-1','nivel-2')
      ORDER BY pn.nome
    ");
    $stmt->execute([$lojaId]);
    $niveisPersonalizados = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
}

$colsAdmins = $conn->query("SHOW COLUMNS FROM admins")->fetchAll(PDO::FETCH_COLUMN, 0);
$temAtivo = in_array('ativo', $colsAdmins, true);
$temLojaAdmin = in_array('loja_id', $colsAdmins, true);
$temCodigoAcesso = in_array('codigo_acesso', $colsAdmins, true);
$sqlUsuarios = "
  SELECT a.id, a.nome, a.email, a.usuario, a.perfil, " . ($temAtivo ? "a.ativo" : "1 AS ativo") . ",
         " . ($temCodigoAcesso ? "a.codigo_acesso" : "NULL AS codigo_acesso") . ",
         pn.id AS permissao_id, pn.nome AS permissao_nome, pn.slug AS permissao_slug
  FROM admins a
  LEFT JOIN permissoes_usuarios pu ON pu.admin_id = a.id
  LEFT JOIN permissoes_niveis pn ON pn.id = pu.permissao_id
";
$whereUsuarios = ["a.perfil <> 'superadmin'"];
$paramsUsuarios = [];
if ($temAtivo) {
  $whereUsuarios[] = "a.ativo = 1";
}
if ($temLojaAdmin) {
  $whereUsuarios[] = "a.loja_id = ?";
  $paramsUsuarios[] = $lojaId;
}
if ($whereUsuarios) {
  $sqlUsuarios .= " WHERE " . implode(' AND ', $whereUsuarios);
}
$sqlUsuarios .= " ORDER BY a.nome";
$stmt = $conn->prepare($sqlUsuarios);
$stmt->execute($paramsUsuarios);
$usuariosAdmin = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

echo json_encode([
  'ok' => true,
  'sou_admin_principal' => souAdminPrincipal($conn),
  'nivel_admin_id' => $nivelAdminId,
  'nivel_garcom_id' => $nivelGarcomId,
  'niveis' => array_map(fn($n) => ['id' => (int) $n['id'], 'nome' => $n['nome'], 'slug' => $n['slug']], $niveisAdmin),
  'niveis_personalizados' => array_map(fn($n) => ['id' => (int) $n['id'], 'nome' => $n['nome'], 'slug' => $n['slug']], $niveisPersonalizados),
  'usuarios' => array_map(function ($u) {
    return [
      'id' => (int) $u['id'],
      'nome' => $u['nome'],
      'email' => $u['email'],
      'usuario' => $u['usuario'],
      'perfil' => $u['perfil'],
      'ativo' => (int) $u['ativo'],
      'codigo_acesso' => $u['codigo_acesso'],
      'permissao_id' => $u['permissao_id'] !== null ? (int) $u['permissao_id'] : null,
      'permissao_nome' => $u['permissao_nome'],
      'permissao_slug' => $u['permissao_slug'],
      'rotulo_nivel' => rotuloNivelUsuario($u),
    ];
  }, $usuariosAdmin),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
