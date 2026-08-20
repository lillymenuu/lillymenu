<?php

/**
 * Verifica se o admin logado pode acessar uma tela (chave menu.*), considerando
 * as duas camadas de bloqueio: permissao por usuario/nivel (permissoes_niveis) e
 * recursos liberados pelo plano contratado (planos.recursos_json). Mesma logica
 * usada em admin/partials/sidebar.php pra decidir o que aparece no menu — aqui
 * serve pra bloquear o acesso direto pela URL, nao so esconder o link.
 */
if (!function_exists('acessoMenuPermitido')) {
  function acessoMenuPermitido(PDO $conn, string $chave): bool
  {
    if (isset($_SESSION['admin_id'])) {
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
          $stmt->execute([$_SESSION['admin_id']]);
          $permissoesJson = $stmt->fetchColumn();
          if ($permissoesJson) {
            $decoded = json_decode((string) $permissoesJson, true);
            if (is_array($decoded) && $decoded && !in_array($chave, $decoded, true)) {
              return false;
            }
          }
        }
      } catch (Exception $e) {
      }
    }

    if (($_SESSION['admin_perfil'] ?? '') === 'superadmin') {
      return true;
    }

    try {
      $stmt = $conn->prepare("
        SELECT p.recursos_json
        FROM assinaturas a
        INNER JOIN planos p ON p.id = a.plano_id
        WHERE a.loja_id = ?
        ORDER BY a.id DESC
        LIMIT 1
      ");
      $stmt->execute([(int) ($_SESSION['loja_id'] ?? 0)]);
      $recursosJson = $stmt->fetchColumn();
      if ($recursosJson) {
        $decoded = json_decode((string) $recursosJson, true);
        if (is_array($decoded)) {
          return $chave === 'menu.dashboard' || in_array($chave, $decoded, true);
        }
      }
    } catch (Exception $e) {
    }

    return true;
  }
}

if (!function_exists('acessoExigirMenu')) {
  function acessoExigirMenu(PDO $conn, string $chave): void
  {
    if (!acessoMenuPermitido($conn, $chave)) {
      header('Location: dashboard');
      exit;
    }
  }
}
