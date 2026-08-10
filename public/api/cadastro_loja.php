<?php
require_once __DIR__ . '/../../config/database.php';

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
  $stmt = $conn->prepare("INSERT INTO lojas (nome, ativo, plano_id) VALUES (?, 0, ?)");
  $stmt->execute([$lojaNome, $planoId > 0 ? $planoId : null]);
  $lojaId = (int) $conn->lastInsertId();

  $stmt = $conn->prepare("
    INSERT INTO admins (nome, usuario, email, senha, perfil, ativo, loja_id)
    VALUES (?, ?, ?, ?, 'admin', 0, ?)
  ");
  $stmt->execute([
    $adminNome,
    $email,
    $email,
    password_hash($senha, PASSWORD_DEFAULT),
    $lojaId
  ]);

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
  $assunto = 'Cadastro recebido - Will Delivery';
  $mensagem = "Ola, {$adminNome}!\n\nRecebemos o seu cadastro. Em breve nossa equipe ira analisar e liberar o acesso ao sistema.\n\nWill Delivery";
  $headers = "From: Will Delivery <no-reply@willdelivery.local>\r\n";
  $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
  @mail($email, $assunto, $mensagem, $headers);

  $stmt = $conn->prepare("SELECT email FROM admins WHERE perfil = 'superadmin' AND ativo = 1");
  $stmt->execute();
  $superadmins = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
  if ($superadmins) {
    $assuntoAdm = 'Novo cadastro de loja - Will Delivery';
    $msgAdm = "Novo cadastro recebido.\n\nCliente: {$adminNome}\nEmpresa: {$empresa}\nContato: {$contato}\nEmail: {$email}\nCNPJ: {$cnpj}\nCEP: {$cep}\nEndereco: {$rua}, {$numero} - {$bairro} - {$cidade}/{$estado}\nFaturamento: {$faturamento}\nSegmento: {$segmento}\n\nAcesse o painel do superadmin para liberar o acesso.";
    foreach ($superadmins as $emailAdm) {
      if ($emailAdm) {
        @mail($emailAdm, $assuntoAdm, $msgAdm, $headers);
      }
    }
  }

  echo json_encode(['ok' => true]);
} catch (Exception $e) {
  $conn->rollBack();
  echo json_encode(['ok' => false, 'msg' => $e->getMessage() ?: 'Erro ao cadastrar loja.']);
}

