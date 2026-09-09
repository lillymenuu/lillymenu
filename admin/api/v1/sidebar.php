<?php
/*
 * Versao JSON de admin/partials/sidebar.php para o novo frontend Next.js.
 * Mesma logica de permissao por usuario (menu.*) e por plano contratado
 * (recursos_json), so que calculada a partir do admin/loja do token Bearer
 * em vez de $_SESSION. Nao inclui notificacoes (sino) nem o toggle de
 * loja aberta/fechada ainda — ficam para uma proxima etapa.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/api_auth.php';

header('Content-Type: application/json');

$auth      = apiAuthExigir($conn);
$adminId   = $auth['admin_id'];
$lojaId    = $auth['loja_id'];
$perfil    = $auth['perfil'];

$menuPermMap = [];
try {
  $stmt = $conn->prepare("SHOW TABLES LIKE 'permissoes_niveis'");
  $stmt->execute();
  $temPermissoes = (bool) $stmt->fetchColumn();
  $stmt = $conn->prepare("SHOW TABLES LIKE 'permissoes_usuarios'");
  $stmt->execute();
  $temPermUsuarios = (bool) $stmt->fetchColumn();
  if ($temPermissoes && $temPermUsuarios) {
    $stmt = $conn->prepare("
      SELECT pn.permissoes_json
      FROM permissoes_usuarios pu
      JOIN permissoes_niveis pn ON pn.id = pu.permissao_id
      WHERE pu.admin_id = ?
      LIMIT 1
    ");
    $stmt->execute([$adminId]);
    $permissoesJson = $stmt->fetchColumn();
    if ($permissoesJson) {
      $decoded = json_decode((string) $permissoesJson, true);
      if (is_array($decoded)) {
        foreach ($decoded as $perm) {
          $perm = (string) $perm;
          if (strpos($perm, 'menu.') === 0) {
            $menuPermMap[$perm] = true;
          }
        }
      }
    }
  }
} catch (Exception $e) {
  $menuPermMap = [];
}
$menuRestrito = !empty($menuPermMap);
$menuPode = function (string $chave) use ($menuRestrito, $menuPermMap): bool {
  if (!$menuRestrito) {
    return true;
  }
  return isset($menuPermMap[$chave]);
};

$recursosPlano = null;
if ($perfil !== 'superadmin') {
  try {
    $stmtPl = $conn->prepare("
      SELECT p.recursos_json
      FROM assinaturas a
      INNER JOIN planos p ON p.id = a.plano_id
      WHERE a.loja_id = ?
      ORDER BY a.id DESC
      LIMIT 1
    ");
    $stmtPl->execute([$lojaId]);
    $recursosJson = $stmtPl->fetchColumn();
    if ($recursosJson) {
      $decodedRecursos = json_decode((string) $recursosJson, true);
      if (is_array($decodedRecursos)) {
        $recursosPlano = $decodedRecursos;
      }
    }
  } catch (Exception $e) {
    $recursosPlano = null;
  }
}
$planoPode = function (string $chave) use ($recursosPlano): bool {
  if ($recursosPlano === null) {
    return true;
  }
  return $chave === 'menu.dashboard' || in_array($chave, $recursosPlano, true);
};

$pode = function (string $chave) use ($menuPode, $planoPode): bool {
  return $menuPode($chave) && $planoPode($chave);
};

$menu = [
  'dashboard'          => $pode('menu.dashboard'),
  'pdv'                => $pode('menu.pdv'),
  'gestor'             => $pode('menu.gestor_pedidos'),
  'pedidos'            => $pode('menu.pedidos'),
  'produtos'           => $pode('menu.produtos'),
  'promo'              => $pode('menu.promo'),
  'estoque'            => $pode('menu.estoque'),
  'clientes'           => $pode('menu.clientes'),
  'relatorios'         => $pode('menu.relatorios'),
  'fidelidade'         => $pode('menu.relatorios_fidelidade'),
  'orcamentos'         => $pode('menu.orcamentos'),
  'controleCaixa'      => $pode('menu.controle_caixa'),
  'controleFiado'      => $pode('menu.controle_fiado'),
  'motoboys'           => $pode('menu.motoboys'),
  'modoGarcom'         => $pode('menu.modo_garcom'),
  'financeiro'         => $pode('menu.financeiro'),
  'cupons'             => $pode('menu.cupons'),
  'listaTransmissao'   => $pode('menu.lista_transmissao'),
  'whatslilly'         => $pode('menu.whatslilly'),
  'configuracoes'      => $pode('menu.configuracoes'),
  'crossSellConfig'    => $pode('menu.cross_sell_config'),
  'crossSellRelatorio' => $pode('menu.relatorio_cross_sell'),
  'lojas'              => $perfil === 'superadmin',
  'gerenciamento'      => $perfil === 'superadmin',
];

require_once __DIR__ . '/../../helpers/config.php';
$lojaNome = config($conn, 'nome_loja', 'Minha Loja');
$lojaPerfilImg = (string) config($conn, 'loja_perfil', '');
$lojaVerificada = config($conn, 'loja_verificada', '0') === '1';
$forceFechada = config($conn, 'loja_force_fechada', '0') === '1';

$planoNome   = 'Customizado';
$planoStatus = '';
$planoExpira = '';
$planoBadge  = '';
try {
  $stmtPlano = $conn->prepare("
    SELECT a.status, a.trial_fim, a.ciclo_fim, p.nome AS plano_nome
    FROM assinaturas a
    LEFT JOIN planos p ON p.id = a.plano_id
    WHERE a.loja_id = ?
    ORDER BY a.id DESC
    LIMIT 1
  ");
  $stmtPlano->execute([$lojaId]);
  $assinatura = $stmtPlano->fetch(PDO::FETCH_ASSOC) ?: [];
  if (!empty($assinatura['plano_nome'])) {
    $planoNome = $assinatura['plano_nome'];
  }
  $status = strtolower(trim((string) ($assinatura['status'] ?? '')));
  if ($status === 'ativo') {
    $status = 'ativa';
  }
  $expiraRaw = null;
  if ($status === 'trial') {
    $planoStatus = 'trial';
    $expiraRaw = $assinatura['trial_fim'] ?? null;
  } else {
    $expiraRaw = $assinatura['ciclo_fim'] ?? ($assinatura['trial_fim'] ?? null);
  }
  if ($expiraRaw) {
    $expiraTs = strtotime($expiraRaw);
    if ($expiraTs !== false && $expiraTs < strtotime(date('Y-m-d'))) {
      $planoExpira = 'Expirado';
      $planoStatus = 'expirado';
    } else {
      $planoExpira = 'ate ' . date('d/m', $expiraTs);
    }
  }
  if ($planoStatus === 'trial') {
    $planoBadge = 'Trial';
  }
} catch (Exception $e) {
}

$stmtAdmin = $conn->prepare("SELECT nome, email FROM admins WHERE id = ? LIMIT 1");
$stmtAdmin->execute([$adminId]);
$adminRow = $stmtAdmin->fetch(PDO::FETCH_ASSOC) ?: [];

echo json_encode([
  'ok'    => true,
  'loja'  => [
    'id'         => $lojaId,
    'nome'       => $lojaNome,
    'inicial'    => mb_strtoupper(mb_substr($lojaNome, 0, 1)),
    'logo'       => $lojaPerfilImg !== '' ? $lojaPerfilImg : null,
    'verificada' => $lojaVerificada,
    'aberta'     => !$forceFechada,
  ],
  'plano' => [
    'nome'   => $planoNome,
    'status' => $planoStatus,
    'expira' => $planoExpira,
    'badge'  => $planoBadge,
  ],
  'admin' => [
    'nome'   => $adminRow['nome'] ?? '',
    'email'  => $adminRow['email'] ?? '',
    'perfil' => $perfil,
  ],
  'menu' => $menu,
]);
