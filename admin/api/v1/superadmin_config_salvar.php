<?php
/*
 * Configuracoes globais do SaaS (Next.js): PIX/WhatsApp de recebimento,
 * Nominatim e recursos por plano. Mesmas regras de
 * admin/api/gerenciamento_pix_salvar.php, _nominatim_salvar.php e _plano_recursos_salvar.php.
 */

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../helpers/superadmin_auth.php';
require_once __DIR__ . '/../../helpers/gerenciamento_module.php';

header('Content-Type: application/json; charset=utf-8');

apiSuperadminExigir($conn);
gerenciamentoEnsureModule($conn);

$d = json_decode(file_get_contents('php://input'), true) ?: [];
$tipo = (string) ($d['tipo'] ?? '');

function salvarConfigGlobal(PDO $conn, array $configs): void {
  foreach ($configs as $chave => $valor) {
    $stmt = $conn->prepare("UPDATE configuracoes SET valor = ? WHERE loja_id = 0 AND chave = ?");
    $stmt->execute([$valor, $chave]);
    if ($stmt->rowCount() === 0) {
      $conn->prepare("INSERT INTO configuracoes (loja_id, chave, valor) VALUES (0, ?, ?)")->execute([$chave, $valor]);
    }
  }
}

try {
  if ($tipo === 'pix') {
    salvarConfigGlobal($conn, [
      'saas_pix_chave'       => trim((string) ($d['pix_chave'] ?? '')),
      'saas_pix_nome'        => trim((string) ($d['pix_nome'] ?? '')),
      'saas_whatsapp_numero' => trim((string) ($d['whats_numero'] ?? '')),
    ]);
    echo json_encode(['ok' => true]);
  } elseif ($tipo === 'nominatim') {
    salvarConfigGlobal($conn, ['saas_nominatim_ativo' => !empty($d['ativo']) ? '1' : '0']);
    echo json_encode(['ok' => true]);
  } elseif ($tipo === 'recursos') {
    $planoId = (int) ($d['plano_id'] ?? 0);
    if ($planoId <= 0) {
      echo json_encode(['ok' => false, 'msg' => 'Plano inválido.']);
      exit;
    }
    $recursos = is_array($d['recursos'] ?? null) ? $d['recursos'] : [];
    $recursos = array_values(array_filter(array_map('strval', $recursos), fn($v) => strpos($v, 'menu.') === 0));
    $valor = !empty($d['sem_restricao']) ? null : json_encode($recursos, JSON_UNESCAPED_UNICODE);
    $conn->prepare("UPDATE planos SET recursos_json = ? WHERE id = ?")->execute([$valor, $planoId]);
    echo json_encode(['ok' => true]);
  } else {
    echo json_encode(['ok' => false, 'msg' => 'Tipo inválido.']);
  }
} catch (Exception $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao salvar configuração.']);
}
