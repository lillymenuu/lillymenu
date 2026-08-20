<?php
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/mailer.php';

header('Content-Type: application/json; charset=utf-8');

$email = trim((string) ($_POST['email'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Informe um e-mail valido.']);
  exit;
}

try {
  $stmt = $conn->prepare("SELECT id, nome FROM admins WHERE email = ? AND ativo = 1 LIMIT 1");
  $stmt->execute([$email]);
  $admin = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($admin) {
    $token = bin2hex(random_bytes(32));
    $expira = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $conn->prepare("UPDATE admins SET reset_token = ?, reset_expira = ? WHERE id = ?")
      ->execute([$token, $expira, (int) $admin['id']]);

    $link = 'https://lillymenu.com/admin/reset.php?token=' . $token;
    $nomeAdmin = $admin['nome'] !== '' ? $admin['nome'] : 'usuario';
    $linkEscapado = htmlspecialchars($link);
    $corpo = '
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(8,20,33,.08);">
          <tr>
            <td style="background:#9C5523;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px;">LillyMenu</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:19px;color:#111827;">Ola, ' . htmlspecialchars($nomeAdmin) . '!</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44515f;">
                Recebemos um pedido para redefinir a senha da sua conta no LillyMenu. Clique no botao abaixo para criar uma nova senha. Este link expira em 1 hora.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="' . $linkEscapado . '" style="display:inline-block;background:#9C5523;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;">Redefinir senha</a>
              </div>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#8a94a0;">
                Se voce nao pediu essa redefinicao, pode ignorar este e-mail com seguranca - sua senha atual continua valendo.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#8a94a0;">
                Se o botao nao funcionar, copie e cole este link no navegador:<br>
                <a href="' . $linkEscapado . '" style="color:#9C5523;">' . $linkEscapado . '</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    $resultado = enviarEmail($email, $nomeAdmin, 'Redefinicao de senha - LillyMenu', $corpo);
    if (!$resultado['ok']) {
      error_log('[reset_request] Falha ao enviar email de redefinicao para ' . $email . ': ' . ($resultado['erro'] ?? ''));
    }
  }
} catch (Exception $e) {
  error_log('[reset_request] Erro: ' . $e->getMessage());
}

/* Sempre responde ok, exista ou nao o email - evita que alguem descubra
   quais emails estao cadastrados no sistema por tentativa e erro. */
echo json_encode(['ok' => true]);
