<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/mailer.php';

header('Content-Type: application/json; charset=utf-8');

function tabelaExiste(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function tabelaTemColuna(PDO $conn, string $tabela, string $coluna): bool {
  try {
    $stmt = $conn->prepare("SHOW COLUMNS FROM {$tabela} LIKE ?");
    $stmt->execute([$coluna]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function garantirLeadsTabela(PDO $conn): void {
  try {
    $conn->exec("CREATE TABLE IF NOT EXISTS leads_lojas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(160) NOT NULL,
      empresa VARCHAR(160) NOT NULL,
      email VARCHAR(160) NOT NULL,
      whatsapp VARCHAR(30) NOT NULL,
      cnpj VARCHAR(20) NOT NULL,
      cep VARCHAR(12) NOT NULL,
      rua VARCHAR(160) NOT NULL,
      numero VARCHAR(20) NOT NULL,
      bairro VARCHAR(120) NOT NULL,
      cidade VARCHAR(120) NOT NULL,
      estado VARCHAR(10) NOT NULL,
      complemento VARCHAR(160) NULL,
      faturamento VARCHAR(120) NULL,
      segmento VARCHAR(120) NULL,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_leads_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Exception $e) {
  }
}

function garantirLojasPlanoColuna(PDO $conn): void {
  try {
    if (!tabelaTemColuna($conn, 'lojas', 'plano_id')) {
      $conn->exec("ALTER TABLE lojas ADD COLUMN plano_id INT NULL");
    }
  } catch (Exception $e) {
  }
}

function garantirConfiguracoesLoja(PDO $conn): bool {
  try {
    $cols = $conn->query("SHOW COLUMNS FROM configuracoes")->fetchAll(PDO::FETCH_COLUMN, 0);
    if (!in_array('loja_id', $cols, true)) {
      return true;
    }
    $pkRows = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'PRIMARY'")->fetchAll(PDO::FETCH_ASSOC);
    $pkCols = [];
    foreach ($pkRows as $row) {
      $pkCols[] = $row['Column_name'] ?? '';
    }
    $pkCols = array_values(array_unique(array_filter($pkCols)));
    if ($pkCols === ['chave']) {
      $conn->exec("UPDATE configuracoes SET loja_id = 1 WHERE loja_id IS NULL");
      $conn->exec("ALTER TABLE configuracoes DROP PRIMARY KEY");
      $conn->exec("ALTER TABLE configuracoes ADD PRIMARY KEY (loja_id, chave)");
      return true;
    }
    if (!in_array('loja_id', $pkCols, true)) {
      $hasUnique = $conn->query("SHOW INDEX FROM configuracoes WHERE Key_name = 'uniq_loja_chave'")->fetch(PDO::FETCH_ASSOC);
      if (!$hasUnique) {
        $conn->exec("ALTER TABLE configuracoes ADD UNIQUE KEY uniq_loja_chave (loja_id, chave)");
      }
    }
    return true;
  } catch (Exception $e) {
    return false;
  }
}

function campo(string $chave): string {
  return trim((string) ($_POST[$chave] ?? ''));
}

function onlyDigits(string $valor): string {
  return preg_replace('/\D+/', '', $valor);
}

function validarCnpj(string $cnpj): bool {
  $cnpj = onlyDigits($cnpj);
  if (strlen($cnpj) !== 14) {
    return false;
  }
  if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
    return false;
  }
  $calc1 = 0;
  $peso1 = [5,4,3,2,9,8,7,6,5,4,3,2];
  for ($i=0; $i<12; $i++) {
    $calc1 += (int)$cnpj[$i] * $peso1[$i];
  }
  $resto = $calc1 % 11;
  $dig1 = ($resto < 2) ? 0 : 11 - $resto;
  if ((int)$cnpj[12] !== $dig1) {
    return false;
  }
  $calc2 = 0;
  $peso2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  for ($i=0; $i<13; $i++) {
    $calc2 += (int)$cnpj[$i] * $peso2[$i];
  }
  $resto = $calc2 % 11;
  $dig2 = ($resto < 2) ? 0 : 11 - $resto;
  return (int)$cnpj[13] === $dig2;
}

function validarCpf(string $cpf): bool {
  $cpf = onlyDigits($cpf);
  if (strlen($cpf) !== 11) {
    return false;
  }
  if (preg_match('/^(\d)\1{10}$/', $cpf)) {
    return false;
  }
  for ($t = 9; $t < 11; $t++) {
    $soma = 0;
    for ($i = 0; $i < $t; $i++) {
      $soma += (int)$cpf[$i] * (($t + 1) - $i);
    }
    $resto = ($soma * 10) % 11;
    if ($resto === 10) {
      $resto = 0;
    }
    if ($resto !== (int)$cpf[$t]) {
      return false;
    }
  }
  return true;
}

function validarCnpjOuCpf(string $documento): bool {
  $digitos = onlyDigits($documento);
  if (strlen($digitos) === 11) {
    return validarCpf($digitos);
  }
  return validarCnpj($digitos);
}

$nome = campo('nome');
$empresa = campo('empresa');
$contato = campo('contato');
$email = campo('email');
$senha = (string) ($_POST['senha'] ?? '');
$senha2 = (string) ($_POST['senha2'] ?? '');
$cnpj = campo('cnpj');
$cep = campo('cep');
$rua = campo('rua');
$numero = campo('numero');
$bairro = campo('bairro');
$cidade = campo('cidade');
$estado = campo('estado');
$complemento = campo('complemento');
$faturamento = campo('faturamento');
$segmento = campo('segmento');
$planoId = (int) ($_POST['plano_id'] ?? 0);

if ($nome === '' || $empresa === '' || $contato === '' || $email === '' || $senha === '' || $senha2 === '' || $cnpj === '' || $cep === '' || $rua === '' || $numero === '' || $bairro === '' || $cidade === '' || $estado === '') {
  echo json_encode(['ok' => false, 'msg' => 'Preencha todos os campos obrigatorios.']);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => false, 'msg' => 'Email invalido.']);
  exit;
}

if ($senha !== $senha2) {
  echo json_encode(['ok' => false, 'msg' => 'As senhas nao conferem.']);
  exit;
}
if (strlen($senha) < 6) {
  echo json_encode(['ok' => false, 'msg' => 'A senha deve ter pelo menos 6 caracteres.']);
  exit;
}
if (!validarCnpjOuCpf($cnpj)) {
  echo json_encode(['ok' => false, 'msg' => 'CNPJ ou CPF invalido.']);
  exit;
}
if (strlen(onlyDigits($cep)) !== 8) {
  echo json_encode(['ok' => false, 'msg' => 'CEP invalido.']);
  exit;
}
if (strlen(trim($estado)) < 2) {
  echo json_encode(['ok' => false, 'msg' => 'Estado invalido.']);
  exit;
}

if (!tabelaExiste($conn, 'lojas') || !tabelaExiste($conn, 'admins')) {
  echo json_encode(['ok' => false, 'msg' => 'Estrutura de lojas ainda nao configurada.']);
  exit;
}

// Periodo de teste padrao do cadastro publico e sempre 30 dias, independente do
// dias_trial cadastrado no plano (mesma convencao ja usada em admin/register.php
// e no fallback de admin/protect.php) - o dias_trial por plano e usado em outros
// fluxos administrativos, nao neste cadastro.
$diasTrial = 30;
if ($planoId > 0 && tabelaExiste($conn, 'planos')) {
  $stmt = $conn->prepare("SELECT id FROM planos WHERE id = ? AND ativo = 1 AND landing_slug IS NOT NULL LIMIT 1");
  $stmt->execute([$planoId]);
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok' => false, 'msg' => 'Plano invalido, selecione novamente.']);
    exit;
  }
}

if (tabelaExiste($conn, 'lojas')) {
  garantirLojasPlanoColuna($conn);
}

if (tabelaExiste($conn, 'configuracoes')) {
  if (!garantirConfiguracoesLoja($conn)) {
    echo json_encode(['ok' => false, 'msg' => 'Nao foi possivel preparar as configuracoes da loja.']);
    exit;
  }
}

garantirLeadsTabela($conn);

$stmt = $conn->prepare("SELECT id FROM admins WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
if ($stmt->fetchColumn()) {
  echo json_encode(['ok' => false, 'msg' => 'Este email ja esta cadastrado.']);
  exit;
}

try {
  $conn->beginTransaction();

  $lojaNome = $empresa !== '' ? $empresa : $nome;
  $adminNome = $nome !== '' ? $nome : $lojaNome;
  $stmt = $conn->prepare("INSERT INTO lojas (nome, ativo, plano_id) VALUES (?, 1, ?)");
  $stmt->execute([$lojaNome, $planoId > 0 ? $planoId : null]);
  $lojaId = (int) $conn->lastInsertId();

  $stmt = $conn->prepare("
    INSERT INTO admins (nome, usuario, email, senha, perfil, ativo, loja_id)
    VALUES (?, ?, ?, ?, 'admin', 1, ?)
  ");
  $stmt->execute([
    $adminNome,
    $email,
    $email,
    password_hash($senha, PASSWORD_DEFAULT),
    $lojaId
  ]);

  if (tabelaExiste($conn, 'assinaturas')) {
    $trialInicio = date('Y-m-d');
    $trialFim = date('Y-m-d', strtotime("+{$diasTrial} day"));
    $stmt = $conn->prepare("
      INSERT INTO assinaturas (loja_id, plano_id, status, trial_inicio, trial_fim)
      VALUES (?, ?, 'trial', ?, ?)
    ");
    $stmt->execute([$lojaId, $planoId > 0 ? $planoId : null, $trialInicio, $trialFim]);
  }

  if (tabelaExiste($conn, 'configuracoes')) {
    $configs = [
      'nome_loja' => $lojaNome,
      'loja_contato' => $contato,
      'whatsapp_numero' => $contato,
      'loja_email' => $email,
      'loja_cnpj' => $cnpj,
      'loja_cep' => $cep,
      'loja_rua' => $rua,
      'loja_numero' => $numero,
      'loja_bairro' => $bairro,
      'loja_cidade' => $cidade,
      'loja_estado' => $estado,
      'loja_complemento' => $complemento,
      'lead_empresa' => $empresa,
      'lead_faturamento' => $faturamento,
      'lead_segmento' => $segmento,
      'lead_responsavel' => $adminNome
    ];

    $stmt = $conn->prepare("
      INSERT INTO configuracoes (loja_id, chave, valor)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE valor = VALUES(valor), loja_id = VALUES(loja_id)
    ");
    foreach ($configs as $chave => $valor) {
      $stmt->execute([$lojaId, $chave, $valor]);
    }
  }

  $stmtLead = $conn->prepare("
    INSERT INTO leads_lojas
      (nome, empresa, email, whatsapp, cnpj, cep, rua, numero, bairro, cidade, estado, complemento, faturamento, segmento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ");
  $stmtLead->execute([
    $adminNome,
    $empresa,
    $email,
    $contato,
    $cnpj,
    $cep,
    $rua,
    $numero,
    $bairro,
    $cidade,
    $estado,
    $complemento,
    $faturamento,
    $segmento
  ]);

  $conn->commit();

  $linkAcesso = 'https://lillymenu.com/admin/login';
  $assuntoBoasVindas = 'Seu acesso ao LillyMenu esta liberado!';
  $corpoBoasVindas = '
<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f1ee;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ee;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 30px rgba(8,20,33,.08);">
          <tr>
            <td style="background:#ec4899;padding:28px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px;">LillyMenu</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:19px;color:#1c2733;">Ola, ' . htmlspecialchars($adminNome) . '!</h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#44515f;">
                Seu acesso ao LillyMenu para a loja <strong>' . htmlspecialchars($lojaNome) . '</strong> ja esta liberado.
                Voce tem <strong>' . (int) $diasTrial . ' dias gratis</strong> para testar todos os recursos da plataforma.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#44515f;">
                Use o e-mail <strong>' . htmlspecialchars($email) . '</strong> e a senha que voce cadastrou para entrar.
              </p>
              <div style="text-align:center;margin:0 0 24px;">
                <a href="' . htmlspecialchars($linkAcesso) . '" style="display:inline-block;background:#ec4899;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;">Acessar o sistema</a>
              </div>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#8a94a0;">
                Se o botao nao funcionar, copie e cole este link no navegador:<br>
                <a href="' . htmlspecialchars($linkAcesso) . '" style="color:#ec4899;">' . htmlspecialchars($linkAcesso) . '</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
  $envioResultado = enviarEmail($email, $adminNome, $assuntoBoasVindas, $corpoBoasVindas);
  if (!$envioResultado['ok']) {
    error_log('[cadastro_loja] Falha ao enviar email de boas-vindas para ' . $email . ': ' . ($envioResultado['erro'] ?? ''));
  }

  $stmt = $conn->prepare("SELECT email FROM admins WHERE perfil = 'superadmin' AND ativo = 1");
  $stmt->execute();
  $superadmins = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
  if ($superadmins) {
    $assuntoAdm = 'Novo cadastro de loja - LillyMenu';
    $msgAdm = "Novo cadastro recebido (acesso ja liberado automaticamente).\n\nCliente: {$adminNome}\nEmpresa: {$empresa}\nContato: {$contato}\nEmail: {$email}\nCNPJ: {$cnpj}\nCEP: {$cep}\nEndereco: {$rua}, {$numero} - {$bairro} - {$cidade}/{$estado}\nFaturamento: {$faturamento}\nSegmento: {$segmento}";
    $corpoAdm = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1c2733;">' . nl2br(htmlspecialchars($msgAdm)) . '</div>';
    foreach ($superadmins as $emailAdm) {
      if ($emailAdm) {
        enviarEmail($emailAdm, 'Superadmin', $assuntoAdm, $corpoAdm);
      }
    }
  }

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao cadastrar loja.']);
}

