<?php
require_once __DIR__ . '/protect.php';
require_once __DIR__ . '/../config/database.php';

$lojaId = (int) ($_SESSION['loja_id'] ?? 1);
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

function tabelaExisteEntradaSaida(PDO $conn, string $tabela): bool {
  try {
    $stmt = $conn->prepare("SHOW TABLES LIKE ?");
    $stmt->execute([$tabela]);
    return (bool) $stmt->fetchColumn();
  } catch (Exception $e) {
    return false;
  }
}

function garantirEstruturaEntradaSaida(PDO $conn, int $lojaId): void {
  static $checked = false;
  if ($checked) return;
  $checked = true;

  $sqlPath = __DIR__ . '/sql/create_entrada_saida.sql';
  if (is_file($sqlPath)) {
    $sql = (string) file_get_contents($sqlPath);
    $partes = preg_split('/;\s*(?:\r?\n|$)/', $sql);
    foreach ($partes as $parte) {
      $stmtSql = trim($parte);
      if ($stmtSql !== '') $conn->exec($stmtSql);
    }
  }

  if (tabelaExisteEntradaSaida($conn, 'entrada_saida_formas')) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM entrada_saida_formas WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
    if ((int) $stmt->fetchColumn() === 0) {
      $ins = $conn->prepare("INSERT INTO entrada_saida_formas (loja_id, nome, ativo) VALUES (?, ?, 1)");
      foreach (['Pix', 'Dinheiro', 'Credito', 'Debito', 'Voucher', 'Outros'] as $nome) {
        $ins->execute([$lojaId, $nome]);
      }
    }
  }

  if (tabelaExisteEntradaSaida($conn, 'entrada_saida_categorias')) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM entrada_saida_categorias WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
    if ((int) $stmt->fetchColumn() === 0) {
      $ins = $conn->prepare("INSERT INTO entrada_saida_categorias (loja_id, nome, tipo, ativo) VALUES (?, ?, ?, 1)");
      foreach ([['Receitas', 'entrada'], ['Despesas', 'saida'], ['Ajustes', 'ambos']] as $row) {
        $ins->execute([$lojaId, $row[0], $row[1]]);
      }
    }
  }

  if (tabelaExisteEntradaSaida($conn, 'entrada_saida_subcategorias')) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM entrada_saida_subcategorias WHERE loja_id = ?");
    $stmt->execute([$lojaId]);
    if ((int) $stmt->fetchColumn() === 0 && tabelaExisteEntradaSaida($conn, 'entrada_saida_categorias')) {
      $cats = $conn->prepare("SELECT id, nome FROM entrada_saida_categorias WHERE loja_id = ?");
      $cats->execute([$lojaId]);
      $map = [];
      foreach ($cats->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $map[strtolower((string) $row['nome'])] = (int) $row['id'];
      }
      $subcats = [];
      if (!empty($map['receitas'])) {
        $subcats[] = [$map['receitas'], 'Vendas'];
        $subcats[] = [$map['receitas'], 'Bancos'];
      }
      if (!empty($map['despesas'])) {
        $subcats[] = [$map['despesas'], 'Operacional'];
        $subcats[] = [$map['despesas'], 'Fornecedores'];
      }
      if (!empty($map['ajustes'])) {
        $subcats[] = [$map['ajustes'], 'Caixa'];
      }
      if ($subcats) {
        $ins = $conn->prepare("INSERT INTO entrada_saida_subcategorias (loja_id, categoria_id, nome, ativo) VALUES (?, ?, ?, 1)");
        foreach ($subcats as $row) {
          $ins->execute([$lojaId, $row[0], $row[1]]);
        }
      }
    }
  }
}

function entradaSaidaRedirect(array $params = []): void {
  $qs = $params ? ('?' . http_build_query($params)) : '';
  header('Location: entrada_saida.php' . $qs);
  exit;
}

function moedaEntradaSaida($valor): string {
  return 'R$ ' . number_format((float) $valor, 2, ',', '.');
}

function colunaExisteEntradaSaida(PDO $conn, string $tabela, string $coluna): bool {
  try {
    $stmt = $conn->prepare("
      SELECT COUNT(*)
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    ");
    $stmt->execute([$tabela, $coluna]);
    return (int) $stmt->fetchColumn() > 0;
  } catch (Throwable $e) {
    return false;
  }
}

function ajustarSaldoBancoEntradaSaida(PDO $conn, int $lojaId, int $bancoId, float $delta): void {
  if ($bancoId <= 0) return;
  $stmt = $conn->prepare("SELECT saldo_atual FROM entrada_saida_bancos WHERE id = ? AND loja_id = ? LIMIT 1");
  $stmt->execute([$bancoId, $lojaId]);
  $saldoAtual = $stmt->fetchColumn();
  if ($saldoAtual === false) {
    throw new RuntimeException('Banco informado não encontrado.');
  }
  $novoSaldo = (float) $saldoAtual + $delta;
  if ($novoSaldo < 0) {
    throw new RuntimeException('O banco selecionado não possui saldo suficiente para esta saída.');
  }
  $stmt = $conn->prepare("UPDATE entrada_saida_bancos SET saldo_atual = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
  $stmt->execute([$novoSaldo, $bancoId, $lojaId]);
}

garantirEstruturaEntradaSaida($conn, $lojaId);

if (tabelaExisteEntradaSaida($conn, 'entrada_saida_lancamentos') && !colunaExisteEntradaSaida($conn, 'entrada_saida_lancamentos', 'banco_id')) {
  try {
    $conn->exec("ALTER TABLE entrada_saida_lancamentos ADD COLUMN banco_id INT NULL AFTER subcategoria_id");
  } catch (Throwable $e) {
  }
}
if (tabelaExisteEntradaSaida($conn, 'entrada_saida_lancamentos') && !colunaExisteEntradaSaida($conn, 'entrada_saida_lancamentos', 'quantidade')) {
  try {
    $conn->exec("ALTER TABLE entrada_saida_lancamentos ADD COLUMN quantidade INT NOT NULL DEFAULT 1 AFTER descricao");
  } catch (Throwable $e) {
  }
}
if (tabelaExisteEntradaSaida($conn, 'entrada_saida_lancamentos') && !colunaExisteEntradaSaida($conn, 'entrada_saida_lancamentos', 'desconto')) {
  try {
    $conn->exec("ALTER TABLE entrada_saida_lancamentos ADD COLUMN desconto DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER quantidade");
  } catch (Throwable $e) {
  }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = trim((string) ($_POST['action'] ?? ''));
  try {
    if ($action === 'salvar_lancamento') {
      $tipo = strtolower(trim((string) ($_POST['tipo'] ?? 'entrada')));
      $data = trim((string) ($_POST['data_lancamento'] ?? ''));
      $descricao = trim((string) ($_POST['descricao'] ?? ''));
      $quantidade = max(1, (int) ($_POST['quantidade'] ?? 1));
      $valor = (float) ($_POST['valor'] ?? 0);
      $desconto = max(0, (float) ($_POST['desconto'] ?? 0));
      $formaId = (int) ($_POST['forma_id'] ?? 0);
      $categoriaId = (int) ($_POST['categoria_id'] ?? 0);
      $subcategoriaId = (int) ($_POST['subcategoria_id'] ?? 0);
      $bancoId = (int) ($_POST['banco_id'] ?? 0);
      $valorTotal = max(0, ($valor * $quantidade) - $desconto);

      if (!in_array($tipo, ['entrada', 'saida'], true)) throw new RuntimeException('Tipo inválido.');
      if ($data === '') throw new RuntimeException('Informe a data.');
      if ($descricao === '') throw new RuntimeException('Informe a descrição.');
      if ($valor <= 0) throw new RuntimeException('Informe um valor válido.');

      if ($tipo === 'saida' && $bancoId > 0) {
        ajustarSaldoBancoEntradaSaida($conn, $lojaId, $bancoId, -$valorTotal);
      }

      $stmt = $conn->prepare("
        INSERT INTO entrada_saida_lancamentos
          (loja_id, tipo, data_lancamento, descricao, quantidade, desconto, valor, forma_id, categoria_id, subcategoria_id, banco_id, criado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ");
      $stmt->execute([
        $lojaId,
        $tipo,
        $data,
        $descricao,
        $quantidade,
        $desconto,
        $valorTotal,
        $formaId > 0 ? $formaId : null,
        $categoriaId > 0 ? $categoriaId : null,
        $subcategoriaId > 0 ? $subcategoriaId : null,
        $bancoId > 0 ? $bancoId : null,
        $adminId > 0 ? $adminId : null,
      ]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Lançamento salvo com sucesso.'];
      entradaSaidaRedirect();
    }

    if ($action === 'editar_lancamento') {
      $id = (int) ($_POST['id'] ?? 0);
      $tipo = strtolower(trim((string) ($_POST['tipo'] ?? 'entrada')));
      $data = trim((string) ($_POST['data_lancamento'] ?? ''));
      $descricao = trim((string) ($_POST['descricao'] ?? ''));
      $quantidade = max(1, (int) ($_POST['quantidade'] ?? 1));
      $valor = (float) ($_POST['valor'] ?? 0);
      $desconto = max(0, (float) ($_POST['desconto'] ?? 0));
      $formaId = (int) ($_POST['forma_id'] ?? 0);
      $categoriaId = (int) ($_POST['categoria_id'] ?? 0);
      $subcategoriaId = (int) ($_POST['subcategoria_id'] ?? 0);
      $bancoId = (int) ($_POST['banco_id'] ?? 0);
      $valorTotal = max(0, ($valor * $quantidade) - $desconto);

      if ($id <= 0) throw new RuntimeException('Lancamento invalido.');
      if (!in_array($tipo, ['entrada', 'saida'], true)) throw new RuntimeException('Tipo invalido.');
      if ($data === '' || $descricao === '' || $valor <= 0) throw new RuntimeException('Preencha os campos obrigatorios.');

      $stmt = $conn->prepare("SELECT tipo, valor, banco_id FROM entrada_saida_lancamentos WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$id, $lojaId]);
      $atual = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$atual) throw new RuntimeException('Lançamento não encontrado.');
      if (($atual['tipo'] ?? '') === 'saida' && (int) ($atual['banco_id'] ?? 0) > 0) {
        ajustarSaldoBancoEntradaSaida($conn, $lojaId, (int) $atual['banco_id'], (float) $atual['valor']);
      }
      if ($tipo === 'saida' && $bancoId > 0) {
        ajustarSaldoBancoEntradaSaida($conn, $lojaId, $bancoId, -$valorTotal);
      }

      $stmt = $conn->prepare("
        UPDATE entrada_saida_lancamentos
           SET tipo = ?, data_lancamento = ?, descricao = ?, quantidade = ?, desconto = ?, valor = ?, forma_id = ?, categoria_id = ?, subcategoria_id = ?, banco_id = ?, atualizado_em = NOW()
         WHERE id = ? AND loja_id = ?
      ");
      $stmt->execute([
        $tipo,
        $data,
        $descricao,
        $quantidade,
        $desconto,
        $valorTotal,
        $formaId > 0 ? $formaId : null,
        $categoriaId > 0 ? $categoriaId : null,
        $subcategoriaId > 0 ? $subcategoriaId : null,
        $bancoId > 0 ? $bancoId : null,
        $id,
        $lojaId
      ]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Lancamento atualizado com sucesso.'];
      entradaSaidaRedirect();
    }

    if ($action === 'excluir_lancamento') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Lancamento invalido.');

      $stmt = $conn->prepare("SELECT tipo, valor, banco_id FROM entrada_saida_lancamentos WHERE id = ? AND loja_id = ? LIMIT 1");
      $stmt->execute([$id, $lojaId]);
      $lancamento = $stmt->fetch(PDO::FETCH_ASSOC);
      if (!$lancamento) throw new RuntimeException('Lancamento nao encontrado.');

      if (($lancamento['tipo'] ?? '') === 'saida' && (int) ($lancamento['banco_id'] ?? 0) > 0) {
        ajustarSaldoBancoEntradaSaida($conn, $lojaId, (int) $lancamento['banco_id'], (float) $lancamento['valor']);
      }

      $stmt = $conn->prepare("DELETE FROM entrada_saida_lancamentos WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);

      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Lancamento excluido com sucesso.'];
      entradaSaidaRedirect();
    }

    if ($action === 'salvar_banco') {
      $nome = trim((string) ($_POST['nome'] ?? ''));
      $saldo = (float) ($_POST['saldo_atual'] ?? 0);
      if ($nome === '') throw new RuntimeException('Informe o nome do banco.');
      $stmt = $conn->prepare("INSERT INTO entrada_saida_bancos (loja_id, nome, saldo_atual, ativo, atualizado_em) VALUES (?, ?, ?, 1, NOW())");
      $stmt->execute([$lojaId, $nome, $saldo]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Banco cadastrado com sucesso.'];
      entradaSaidaRedirect(['modal' => 'banco']);
    }

    if ($action === 'editar_banco') {
      $id = (int) ($_POST['id'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      $saldo = (float) ($_POST['saldo_atual'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Banco invalido.');
      if ($nome === '') throw new RuntimeException('Informe o nome do banco.');
      $stmt = $conn->prepare("UPDATE entrada_saida_bancos SET nome = ?, saldo_atual = ?, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
      $stmt->execute([$nome, $saldo, $id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Banco atualizado com sucesso.'];
      entradaSaidaRedirect(['modal' => 'banco']);
    }

    if ($action === 'excluir_banco') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Banco invalido.');
      $stmt = $conn->prepare("UPDATE entrada_saida_bancos SET ativo = 0, atualizado_em = NOW() WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Banco removido com sucesso.'];
      entradaSaidaRedirect(['modal' => 'banco']);
    }

    if ($action === 'salvar_forma') {
      $nome = trim((string) ($_POST['nome'] ?? ''));
      if ($nome === '') throw new RuntimeException('Informe a forma de pagamento.');
      $stmt = $conn->prepare("INSERT INTO entrada_saida_formas (loja_id, nome, ativo) VALUES (?, ?, 1)");
      $stmt->execute([$lojaId, $nome]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Forma de pagamento cadastrada.'];
      entradaSaidaRedirect(['modal' => 'forma']);
    }

    if ($action === 'editar_forma') {
      $id = (int) ($_POST['id'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      if ($id <= 0 || $nome === '') throw new RuntimeException('Informe a forma de pagamento.');
      $stmt = $conn->prepare("UPDATE entrada_saida_formas SET nome = ? WHERE id = ? AND loja_id = ?");
      $stmt->execute([$nome, $id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Forma atualizada com sucesso.'];
      entradaSaidaRedirect(['modal' => 'forma']);
    }

    if ($action === 'excluir_forma') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Forma invalida.');
      $stmt = $conn->prepare("UPDATE entrada_saida_formas SET ativo = 0 WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Forma removida com sucesso.'];
      entradaSaidaRedirect(['modal' => 'forma']);
    }

    if ($action === 'salvar_categoria') {
      $nome = trim((string) ($_POST['nome'] ?? ''));
      $tipo = strtolower(trim((string) ($_POST['tipo_categoria'] ?? 'ambos')));
      if ($nome === '') throw new RuntimeException('Informe a categoria.');
      if (!in_array($tipo, ['entrada', 'saida', 'ambos'], true)) $tipo = 'ambos';
      $stmt = $conn->prepare("INSERT INTO entrada_saida_categorias (loja_id, nome, tipo, ativo) VALUES (?, ?, ?, 1)");
      $stmt->execute([$lojaId, $nome, $tipo]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Categoria cadastrada.'];
      entradaSaidaRedirect(['modal' => 'categoria']);
    }

    if ($action === 'editar_categoria') {
      $id = (int) ($_POST['id'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      $tipo = strtolower(trim((string) ($_POST['tipo_categoria'] ?? 'ambos')));
      if ($id <= 0 || $nome === '') throw new RuntimeException('Informe a categoria.');
      if (!in_array($tipo, ['entrada', 'saida', 'ambos'], true)) $tipo = 'ambos';
      $stmt = $conn->prepare("UPDATE entrada_saida_categorias SET nome = ?, tipo = ? WHERE id = ? AND loja_id = ?");
      $stmt->execute([$nome, $tipo, $id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Categoria atualizada com sucesso.'];
      entradaSaidaRedirect(['modal' => 'categoria']);
    }

    if ($action === 'excluir_categoria') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Categoria invalida.');
      $stmt = $conn->prepare("UPDATE entrada_saida_categorias SET ativo = 0 WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Categoria removida com sucesso.'];
      entradaSaidaRedirect(['modal' => 'categoria']);
    }

    if ($action === 'salvar_subcategoria') {
      $categoriaId = (int) ($_POST['categoria_id_sub'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      if ($categoriaId <= 0) throw new RuntimeException('Selecione a categoria.');
      if ($nome === '') throw new RuntimeException('Informe a subcategoria.');
      $stmt = $conn->prepare("INSERT INTO entrada_saida_subcategorias (loja_id, categoria_id, nome, ativo) VALUES (?, ?, ?, 1)");
      $stmt->execute([$lojaId, $categoriaId, $nome]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Subcategoria cadastrada.'];
      entradaSaidaRedirect(['modal' => 'subcategoria']);
    }

    if ($action === 'editar_subcategoria') {
      $id = (int) ($_POST['id'] ?? 0);
      $categoriaId = (int) ($_POST['categoria_id_sub'] ?? 0);
      $nome = trim((string) ($_POST['nome'] ?? ''));
      if ($id <= 0 || $categoriaId <= 0 || $nome === '') throw new RuntimeException('Preencha os dados da subcategoria.');
      $stmt = $conn->prepare("UPDATE entrada_saida_subcategorias SET categoria_id = ?, nome = ? WHERE id = ? AND loja_id = ?");
      $stmt->execute([$categoriaId, $nome, $id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Subcategoria atualizada com sucesso.'];
      entradaSaidaRedirect(['modal' => 'subcategoria']);
    }

    if ($action === 'excluir_subcategoria') {
      $id = (int) ($_POST['id'] ?? 0);
      if ($id <= 0) throw new RuntimeException('Subcategoria invalida.');
      $stmt = $conn->prepare("UPDATE entrada_saida_subcategorias SET ativo = 0 WHERE id = ? AND loja_id = ?");
      $stmt->execute([$id, $lojaId]);
      $_SESSION['entrada_saida_flash'] = ['ok' => true, 'msg' => 'Subcategoria removida com sucesso.'];
      entradaSaidaRedirect(['modal' => 'subcategoria']);
    }
  } catch (Throwable $e) {
    if ($conn->inTransaction()) {
      $conn->rollBack();
    }
    $_SESSION['entrada_saida_flash'] = ['ok' => false, 'msg' => $e->getMessage()];
    entradaSaidaRedirect();
  }
}

$flash = $_SESSION['entrada_saida_flash'] ?? null;
unset($_SESSION['entrada_saida_flash']);

$prefillFrom = trim((string) ($_GET['prefill_from'] ?? ''));
$prefillTipo = strtolower(trim((string) ($_GET['prefill_tipo'] ?? 'entrada')));
if (!in_array($prefillTipo, ['entrada', 'saida'], true)) {
  $prefillTipo = 'entrada';
}
$prefillData = trim((string) ($_GET['prefill_data'] ?? date('Y-m-d')));
if ($prefillData === '') {
  $prefillData = date('Y-m-d');
}
$prefillDescricao = trim((string) ($_GET['prefill_descricao'] ?? ''));
$prefillValor = (float) ($_GET['prefill_valor'] ?? 0);
$prefillValorInput = $prefillValor > 0 ? rtrim(rtrim(number_format($prefillValor, 2, '.', ''), '0'), '.') : '';
$prefillQuantidade = max(1, (int) ($_GET['prefill_quantidade'] ?? 1));
$prefillCategoriaId = max(0, (int) ($_GET['prefill_categoria_id'] ?? 0));
$prefillSubcategoriaId = max(0, (int) ($_GET['prefill_subcategoria_id'] ?? 0));

$formas = [];
$categorias = [];
$subcategorias = [];
$bancos = [];
$materiasPrimas = [];

if (tabelaExisteEntradaSaida($conn, 'entrada_saida_formas')) {
  $stmt = $conn->prepare("SELECT id, nome FROM entrada_saida_formas WHERE loja_id = ? AND ativo = 1 ORDER BY nome");
  $stmt->execute([$lojaId]);
  $formas = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
if (tabelaExisteEntradaSaida($conn, 'entrada_saida_categorias')) {
  $stmt = $conn->prepare("SELECT id, nome, tipo FROM entrada_saida_categorias WHERE loja_id = ? AND ativo = 1 ORDER BY nome");
  $stmt->execute([$lojaId]);
  $categorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
if (tabelaExisteEntradaSaida($conn, 'entrada_saida_subcategorias')) {
  $stmt = $conn->prepare("
    SELECT s.id, s.categoria_id, s.nome, c.nome AS categoria_nome
    FROM entrada_saida_subcategorias s
    LEFT JOIN entrada_saida_categorias c ON c.id = s.categoria_id
    WHERE s.loja_id = ? AND s.ativo = 1
    ORDER BY s.nome
  ");
  $stmt->execute([$lojaId]);
  $subcategorias = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
if (tabelaExisteEntradaSaida($conn, 'entrada_saida_bancos')) {
  $stmt = $conn->prepare("SELECT id, nome, saldo_atual FROM entrada_saida_bancos WHERE loja_id = ? AND ativo = 1 ORDER BY nome");
  $stmt->execute([$lojaId]);
  $bancos = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
if (tabelaExisteEntradaSaida($conn, 'materia_prima_cadastros')) {
  $stmt = $conn->prepare("
    SELECT id, nome_produto, valor_unitario, quantidade, desconto, categoria_id, subcategoria_id, fornecedor
    FROM materia_prima_cadastros
    WHERE loja_id = ?
    ORDER BY nome_produto ASC, id DESC
  ");
  $stmt->execute([$lojaId]);
  $materiasPrimas = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$q = trim((string) ($_GET['q'] ?? ''));
$tipoFiltro = strtolower(trim((string) ($_GET['tipo'] ?? 'todos')));
$formaFiltro = (int) ($_GET['forma_id'] ?? 0);
$categoriaFiltro = (int) ($_GET['categoria_id'] ?? 0);
$dataInicio = trim((string) ($_GET['data_inicio'] ?? ''));
$dataFim = trim((string) ($_GET['data_fim'] ?? ''));
$prefillTipo = strtolower(trim((string) ($_GET['prefill_tipo'] ?? '')));
$prefillData = trim((string) ($_GET['prefill_data'] ?? ''));
$prefillDescricao = trim((string) ($_GET['prefill_descricao'] ?? ''));
$prefillValor = trim((string) ($_GET['prefill_valor'] ?? ''));
$prefillQuantidade = trim((string) ($_GET['prefill_quantidade'] ?? ''));
$prefillCategoriaId = (int) ($_GET['prefill_categoria_id'] ?? 0);
$prefillSubcategoriaId = (int) ($_GET['prefill_subcategoria_id'] ?? 0);
$pagina = max(1, (int) ($_GET['pagina'] ?? 1));
$porPagina = 5;

$tipoLancamentoInicial = in_array($prefillTipo, ['entrada', 'saida'], true) ? $prefillTipo : 'entrada';
$dataLancamentoInicial = $prefillData !== '' ? $prefillData : date('Y-m-d');
$descricaoLancamentoInicial = $prefillDescricao;
$valorLancamentoInicial = $prefillValor !== '' ? $prefillValor : '';
$quantidadeLancamentoInicial = ($prefillQuantidade !== '' && (float) $prefillQuantidade > 0) ? $prefillQuantidade : '1';

$where = ["l.loja_id = ?"];
$params = [$lojaId];
if ($tipoFiltro !== '' && $tipoFiltro !== 'todos' && in_array($tipoFiltro, ['entrada', 'saida'], true)) {
  $where[] = "l.tipo = ?";
  $params[] = $tipoFiltro;
}
if ($formaFiltro > 0) {
  $where[] = "l.forma_id = ?";
  $params[] = $formaFiltro;
}
if ($categoriaFiltro > 0) {
  $where[] = "l.categoria_id = ?";
  $params[] = $categoriaFiltro;
}
if ($dataInicio !== '') {
  $where[] = "l.data_lancamento >= ?";
  $params[] = $dataInicio;
}
if ($dataFim !== '') {
  $where[] = "l.data_lancamento <= ?";
  $params[] = $dataFim;
}
if ($q !== '') {
  $where[] = "(l.descricao LIKE ? OR fp.nome LIKE ? OR c.nome LIKE ? OR s.nome LIKE ?)";
  $like = '%' . $q . '%';
  array_push($params, $like, $like, $like, $like);
}
$whereSql = implode(' AND ', $where);
$sqlBase = "
  FROM entrada_saida_lancamentos l
  LEFT JOIN entrada_saida_formas fp ON fp.id = l.forma_id
  LEFT JOIN entrada_saida_categorias c ON c.id = l.categoria_id
  LEFT JOIN entrada_saida_subcategorias s ON s.id = l.subcategoria_id
  WHERE {$whereSql}
";

$stmt = $conn->prepare("SELECT COUNT(*) {$sqlBase}");
$stmt->execute($params);
$totalRegistros = (int) $stmt->fetchColumn();
$paginas = max(1, (int) ceil($totalRegistros / $porPagina));
if ($pagina > $paginas) $pagina = $paginas;
$offset = ($pagina - 1) * $porPagina;

$stmt = $conn->prepare("
  SELECT l.*, fp.nome AS forma_nome, c.nome AS categoria_nome, s.nome AS subcategoria_nome
  {$sqlBase}
  ORDER BY l.data_lancamento DESC, l.id DESC
  LIMIT {$porPagina} OFFSET {$offset}
");
$stmt->execute($params);
$lancamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $conn->prepare("
  SELECT
    COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor ELSE 0 END),0) AS total_entradas,
    COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor ELSE 0 END),0) AS total_saidas
  {$sqlBase}
");
$stmt->execute($params);
$resumoLanc = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
$totalEntradasLanc = (float) ($resumoLanc['total_entradas'] ?? 0);
$totalSaidas = (float) ($resumoLanc['total_saidas'] ?? 0);
$stmt = $conn->prepare("SELECT COALESCE(SUM(saldo_atual),0) FROM entrada_saida_bancos WHERE loja_id = ? AND ativo = 1");
$stmt->execute([$lojaId]);
$saldoBancos = (float) $stmt->fetchColumn();
$totalEntradas = $totalEntradasLanc + $saldoBancos;
$saldoGeral = $totalEntradas - $totalSaidas;

$queryBase = $_GET;
unset($queryBase['pagina']);
$cssVer = filemtime(__DIR__ . '/assets/css/dashboard.css');
$entradaSaidaCssVer = filemtime(__DIR__ . '/assets/css/entrada_saida.css');
$entradaSaidaJsVer = filemtime(__DIR__ . '/assets/js/entrada_saida.js');
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Entrada / saída</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
<link href="./assets/css/dashboard.css?v=<?= $cssVer ?>" rel="stylesheet">
<link rel="shortcut icon" href="./assets/img/favicon_store.png">
<link rel="icon" type="image/png" href="./assets/img/favicon_store.png">
<link href="./assets/css/entrada_saida.css?v=<?= $entradaSaidaCssVer ?>" rel="stylesheet">
</head>
<body class="dash-diggy entrada-saida-page">
<?php include __DIR__ . '/partials/sidebar.php'; ?>

<div class="container-fluid py-3">
  <div class="es-page">
    <div class="es-header">
      <div>
        <button class="dash-menu-btn mb-3" onclick="toggleSidebar()" aria-label="Abrir menu"><i class="bi bi-list"></i></button>
        <h1 class="es-title">Entrada / saída</h1>
        <div class="es-subtitle">Controle lançamentos diários, bancos e cadastros auxiliares em um só lugar.</div>
      </div>
      <div class="es-actions">
        <button type="button" class="es-btn-outline" data-bs-toggle="modal" data-bs-target="#modalBanco"><i class="bi bi-bank"></i>Cadastrar bancos</button>
        <button type="button" class="es-btn-outline" data-bs-toggle="modal" data-bs-target="#modalForma"><i class="bi bi-credit-card-2-front"></i>Formas de pagamento</button>
        <button type="button" class="es-btn-outline" data-bs-toggle="modal" data-bs-target="#modalCategoria"><i class="bi bi-tags"></i>Categoria</button>
        <button type="button" class="es-btn-outline" data-bs-toggle="modal" data-bs-target="#modalSubcategoria"><i class="bi bi-diagram-3"></i>Subcategoria</button>
      </div>
    </div>

    <div id="esFlashWrap">
    <?php if ($flash): ?>
      <div class="es-notice <?= !empty($flash['ok']) ? 'ok' : 'err' ?>" id="esToastFlash">
        <div class="es-notice-icon"><i class="bi <?= !empty($flash['ok']) ? 'bi-stars' : 'bi-exclamation-triangle' ?>"></i></div>
        <div>
          <div class="es-notice-title"><?= !empty($flash['ok']) ? 'Alteração concluída' : 'Não foi possível concluir' ?></div>
          <div class="es-notice-text"><?= htmlspecialchars((string) ($flash['msg'] ?? '')) ?></div>
        </div>
      </div>
    <?php endif; ?>
    </div>

    <div class="es-stats" id="esStatsWrap">
      <div class="es-stat"><div class="es-stat-label">Entradas</div><div class="es-stat-value green"><?= moedaEntradaSaida($totalEntradas) ?></div><div class="es-stat-foot">Lançamentos de entrada + bancos cadastrados</div></div>
      <div class="es-stat"><div class="es-stat-label">Saídas</div><div class="es-stat-value red"><?= moedaEntradaSaida($totalSaidas) ?></div><div class="es-stat-foot">Total de despesas registradas</div></div>
      <div class="es-stat"><div class="es-stat-label">Saldo geral</div><div class="es-stat-value blue"><?= moedaEntradaSaida($saldoGeral) ?></div><div class="es-stat-foot">Entradas menos saídas</div></div>
      <div class="es-stat"><div class="es-stat-label">Bancos</div><div class="es-stat-value"><?= moedaEntradaSaida($saldoBancos) ?></div><div class="es-stat-foot"><?= count($bancos) ?> banco(s) cadastrado(s)</div></div>
    </div>

    <div class="es-grid-top" id="esTopWrap">
      <div class="es-card"><div class="es-card-body">
        <form method="post" class="es-form-grid" id="formLancamentoES">
          <input type="hidden" name="action" value="salvar_lancamento">
          <input type="hidden" name="materia_prima_id" id="esMateriaPrimaId">
          <div class="es-field" style="grid-column:1/-1;">
            <label class="es-label">Tipo de lançamento</label>
            <div class="es-segmented">
              <button type="button" class="es-type-btn <?= $prefillTipo === 'entrada' ? 'active' : '' ?>" data-es-tipo="entrada">Entrada</button>
              <button type="button" class="es-type-btn <?= $prefillTipo === 'saida' ? 'active' : '' ?>" data-es-tipo="saida">Saída</button>
            </div>
            <input type="hidden" name="tipo" id="esTipoInput" value="<?= htmlspecialchars($prefillTipo) ?>">
          </div>
          <div class="es-field"><label class="es-label">Data</label><input type="date" class="form-control es-input" name="data_lancamento" value="<?= htmlspecialchars($prefillData) ?>" required></div>
          <div class="es-field es-autocomplete" style="grid-column:span 2;" id="esAutocompleteWrap">
            <label class="es-label">Descrição / matéria-prima</label>
            <input type="text" class="form-control es-input" name="descricao" id="esDescricaoInput" value="<?= htmlspecialchars($prefillDescricao) ?>" placeholder="Digite para localizar uma matéria-prima cadastrada..." autocomplete="off" required>
            <div class="es-autocomplete-menu" id="esMateriasPrimasMenu">
              <?php if (!$materiasPrimas): ?>
                <div class="es-autocomplete-empty">Nenhuma matéria-prima cadastrada.</div>
              <?php else: foreach ($materiasPrimas as $mp): $mpLabel = trim((string) $mp['nome_produto']) . (!empty($mp['fornecedor']) ? ' | ' . trim((string) $mp['fornecedor']) : ''); ?>
                <button type="button" class="es-autocomplete-item" data-es-mp-item data-id="<?= (int) $mp['id'] ?>" data-value="<?= htmlspecialchars($mpLabel, ENT_QUOTES) ?>" data-nome="<?= htmlspecialchars((string) $mp['nome_produto'], ENT_QUOTES) ?>" data-fornecedor="<?= htmlspecialchars((string) ($mp['fornecedor'] ?? ''), ENT_QUOTES) ?>" data-valor="<?= htmlspecialchars((string) $mp['valor_unitario'], ENT_QUOTES) ?>" data-quantidade="<?= htmlspecialchars((string) $mp['quantidade'], ENT_QUOTES) ?>" data-desconto="<?= htmlspecialchars((string) $mp['desconto'], ENT_QUOTES) ?>" data-categoria-id="<?= (int) ($mp['categoria_id'] ?? 0) ?>" data-subcategoria-id="<?= (int) ($mp['subcategoria_id'] ?? 0) ?>">
                  <span class="es-autocomplete-name"><?= htmlspecialchars((string) $mp['nome_produto']) ?></span>
                  <span class="es-autocomplete-meta"><?= htmlspecialchars((string) ($mp['fornecedor'] ?: 'Sem fornecedor')) ?> · <?= moedaEntradaSaida($mp['valor_unitario']) ?></span>
                </button>
              <?php endforeach; endif; ?>
            </div>
            
          </div>
          <div class="es-field"><label class="es-label">Valor</label><input type="number" step="0.01" min="0" class="form-control es-input" name="valor" id="esValorInput" value="<?= htmlspecialchars($prefillValorInput) ?>" placeholder="0,00" required></div>
          <div class="es-field"><label class="es-label">Quantidade</label><input type="number" min="1" class="form-control es-input" name="quantidade" id="esQuantidadeInput" value="<?= (int) $prefillQuantidade ?>" required></div>
          <div class="es-field"><label class="es-label">Desconto</label><input type="number" step="0.01" min="0" class="form-control es-input" name="desconto" id="esDescontoInput" value="0" placeholder="0,00"></div>
          <div class="es-field"><label class="es-label">Total do lançamento</label><input type="text" class="form-control es-input es-input-readonly" id="esTotalLancamento" value="R$ 0,00" readonly></div>
          <div class="es-field"><label class="es-label">Forma de pagamento</label><select class="form-select es-select" name="forma_id"><option value="">Selecione</option><?php foreach ($formas as $forma): ?><option value="<?= (int) $forma['id'] ?>"><?= htmlspecialchars($forma['nome']) ?></option><?php endforeach; ?></select></div>
          <div class="es-field"><label class="es-label">Categoria</label><select class="form-select es-select" name="categoria_id" id="esCategoriaSelect"><option value="">Selecione</option><?php foreach ($categorias as $categoria): ?><option value="<?= (int) $categoria['id'] ?>" data-tipo="<?= htmlspecialchars($categoria['tipo']) ?>" <?= $prefillCategoriaId === (int) $categoria['id'] ? 'selected' : '' ?>><?= htmlspecialchars($categoria['nome']) ?></option><?php endforeach; ?></select></div>
          <div class="es-field"><label class="es-label">Banco / origem</label><select class="form-select es-select" name="banco_id" id="esBancoSelect"><option value="">Não informar</option><?php foreach ($bancos as $banco): ?><option value="<?= (int) $banco['id'] ?>"><?= htmlspecialchars($banco['nome']) ?></option><?php endforeach; ?></select></div>
          <div class="es-field" style="grid-column:span 2;"><label class="es-label">Subcategoria</label><select class="form-select es-select" name="subcategoria_id" id="esSubcategoriaSelect"><option value="">Selecione</option><?php foreach ($subcategorias as $sub): ?><option value="<?= (int) $sub['id'] ?>" data-categoria="<?= (int) $sub['categoria_id'] ?>" <?= $prefillSubcategoriaId === (int) $sub['id'] ? 'selected' : '' ?>><?= htmlspecialchars($sub['nome']) ?></option><?php endforeach; ?></select></div>
          <div class="es-field" style="grid-column:1/-1;"><button type="submit" class="es-btn-primary es-submit"><i class="bi bi-plus-circle"></i>Salvar lançamento</button></div>
        </form>
      </div></div>

      <div class="es-card"><div class="es-card-body">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div><div class="es-title" style="font-size:1rem;">Bancos cadastrados</div><div class="es-subtitle" style="font-size:.82rem;">Os valores abaixo entram no total de entradas.</div></div>
          <button type="button" class="es-btn-primary" data-bs-toggle="modal" data-bs-target="#modalBanco"><i class="bi bi-plus-lg"></i></button>
        </div>
        <div class="es-side-list">
          <?php if (!$bancos): ?>
            <div class="es-empty">Nenhum banco cadastrado.</div>
          <?php else: foreach ($bancos as $banco): ?>
            <div class="es-mini">
              <div><strong><?= htmlspecialchars($banco['nome']) ?></strong><span class="d-block">Saldo atual</span></div>
              <div class="es-mini-actions">
                <strong><?= moedaEntradaSaida($banco['saldo_atual']) ?></strong>
                <button
                  type="button"
                  class="es-action-btn js-editar-banco"
                  data-id="<?= (int) $banco['id'] ?>"
                  data-nome="<?= htmlspecialchars($banco['nome'], ENT_QUOTES) ?>"
                  data-saldo="<?= htmlspecialchars((string) $banco['saldo_atual'], ENT_QUOTES) ?>"
                ><i class="bi bi-pencil"></i></button>
              </div>
            </div>
          <?php endforeach; endif; ?>
        </div>
      </div></div>
    </div>

    <div class="es-card es-table-card" id="esTableWrap">
      <div class="es-table-head">
        <div class="es-table-title-wrap">
          <div class="es-title" style="font-size:1rem;">Lançamentos</div>
          <div class="es-subtitle" style="font-size:.82rem;">Controle e visualize todos os lançamentos registrados.</div>
        </div>
        <button type="button" class="es-btn-outline es-table-toggle" id="esTableToggleBtn"><i class="bi bi-eye"></i><span>Ocultar tabela</span></button>
      </div>
      <div class="es-table-panel" id="esTablePanel">
      <form method="get" class="es-filters" id="esFiltrosForm">
        <div class="es-field"><label class="es-label">Buscar</label><input type="text" name="q" id="esBuscaInput" class="form-control es-input" value="<?= htmlspecialchars($q) ?>" placeholder="Descrição, forma, categoria..."></div>
        <div class="es-field"><label class="es-label">Tipo</label><select class="form-select es-select" name="tipo"><option value="todos" <?= $tipoFiltro === 'todos' ? 'selected' : '' ?>>Todos</option><option value="entrada" <?= $tipoFiltro === 'entrada' ? 'selected' : '' ?>>Entrada</option><option value="saida" <?= $tipoFiltro === 'saida' ? 'selected' : '' ?>>Saída</option></select></div>
        <div class="es-field"><label class="es-label">Forma</label><select class="form-select es-select" name="forma_id"><option value="0">Todas</option><?php foreach ($formas as $forma): ?><option value="<?= (int) $forma['id'] ?>" <?= $formaFiltro === (int) $forma['id'] ? 'selected' : '' ?>><?= htmlspecialchars($forma['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="es-field"><label class="es-label">Categoria</label><select class="form-select es-select" name="categoria_id"><option value="0">Todas</option><?php foreach ($categorias as $categoria): ?><option value="<?= (int) $categoria['id'] ?>" <?= $categoriaFiltro === (int) $categoria['id'] ? 'selected' : '' ?>><?= htmlspecialchars($categoria['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="es-field"><label class="es-label">Período</label><div class="es-periodo"><input type="date" name="data_inicio" class="form-control es-input" value="<?= htmlspecialchars($dataInicio) ?>"><input type="date" name="data_fim" class="form-control es-input" value="<?= htmlspecialchars($dataFim) ?>"></div></div>
        <div class="es-field d-flex justify-content-end"><a href="entrada_saida.php" class="es-btn-outline"><i class="bi bi-arrow-counterclockwise"></i>Limpar</a></div>
      </form>

      <div class="es-table-wrap">
        <table class="es-table">
          <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Forma</th><th>Categoria</th><th>Subcategoria</th><th>Valor</th><th>Ações</th></tr></thead>
          <tbody>
            <?php if (!$lancamentos): ?>
              <tr><td colspan="8" class="es-empty">Nenhum lançamento encontrado.</td></tr>
            <?php else: foreach ($lancamentos as $row): ?>
              <tr>
                <td><?= htmlspecialchars(date('d/m/Y', strtotime((string) $row['data_lancamento']))) ?></td>
                <td><span class="es-badge <?= $row['tipo'] === 'saida' ? 'saida' : 'entrada' ?>"><?= $row['tipo'] === 'saida' ? 'Saída' : 'Entrada' ?></span></td>
                <td><?= htmlspecialchars($row['descricao']) ?></td>
                <td><?= htmlspecialchars((string) ($row['forma_nome'] ?: '—')) ?></td>
                <td><?= htmlspecialchars((string) ($row['categoria_nome'] ?: '—')) ?></td>
                <td><?= htmlspecialchars((string) ($row['subcategoria_nome'] ?: '—')) ?></td>
                <td><strong><?= moedaEntradaSaida($row['valor']) ?></strong></td>
                <td>
                  <button
                    type="button"
                    class="es-action-btn js-editar-lancamento"
                    data-id="<?= (int) $row['id'] ?>"
                    data-tipo="<?= htmlspecialchars($row['tipo'], ENT_QUOTES) ?>"
                    data-data="<?= htmlspecialchars((string) $row['data_lancamento'], ENT_QUOTES) ?>"
                    data-descricao="<?= htmlspecialchars($row['descricao'], ENT_QUOTES) ?>"
                    data-quantidade="<?= (int) ($row['quantidade'] ?? 1) ?>"
                    data-desconto="<?= htmlspecialchars((string) ($row['desconto'] ?? 0), ENT_QUOTES) ?>"
                    data-valor="<?= htmlspecialchars((string) $row['valor'], ENT_QUOTES) ?>"
                    data-total="<?= htmlspecialchars((string) $row['valor'], ENT_QUOTES) ?>"
                    data-forma-id="<?= (int) ($row['forma_id'] ?? 0) ?>"
                    data-categoria-id="<?= (int) ($row['categoria_id'] ?? 0) ?>"
                    data-subcategoria-id="<?= (int) ($row['subcategoria_id'] ?? 0) ?>"
                    data-banco-id="<?= (int) ($row['banco_id'] ?? 0) ?>"
                  ><i class="bi bi-pencil"></i></button>
                  <button
                    type="button"
                    class="es-action-btn js-es-delete"
                    data-action="excluir_lancamento"
                    data-id="<?= (int) $row['id'] ?>"
                    data-confirm="Excluir este lançamento?"
                  ><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            <?php endforeach; endif; ?>
          </tbody>
        </table>
      </div>

      <div class="es-pagination">
        <div class="es-pagination-info">Mostrando <?= $totalRegistros ? ($offset + 1) : 0 ?>–<?= min($offset + $porPagina, $totalRegistros) ?> de <?= $totalRegistros ?> lançamentos</div>
        <div class="es-pagination-nav">
          <?php $mkUrl = function(int $p) use ($queryBase): string { return 'entrada_saida.php?' . http_build_query(array_merge($queryBase, ['pagina' => $p])); }; ?>
          <a class="es-page-btn <?= $pagina <= 1 ? 'disabled' : '' ?>" href="<?= $pagina <= 1 ? '#' : htmlspecialchars($mkUrl($pagina - 1)) ?>"><i class="bi bi-chevron-left"></i></a>
          <?php for ($p = 1; $p <= $paginas; $p++): ?><a class="es-page-btn <?= $p === $pagina ? 'active' : '' ?>" href="<?= htmlspecialchars($mkUrl($p)) ?>"><?= $p ?></a><?php endfor; ?>
          <a class="es-page-btn <?= $pagina >= $paginas ? 'disabled' : '' ?>" href="<?= $pagina >= $paginas ? '#' : htmlspecialchars($mkUrl($pagina + 1)) ?>"><i class="bi bi-chevron-right"></i></a>
        </div>
      </div>
      </div>
    </div>
</div>
</div>

<form method="post" id="esDeleteForm" class="d-none">
  <input type="hidden" name="action" id="esDeleteAction">
  <input type="hidden" name="id" id="esDeleteId">
</form>

<div class="modal fade es-modal" id="modalBanco" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Cadastrar banco</h5>
          <div class="es-subtitle" style="margin-top:2px;">Inclua o saldo atual para somar nas entradas.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post">
        <div class="modal-body es-modal-grid">
          <input type="hidden" name="action" value="salvar_banco">
          <div class="es-field"><label class="es-label">Nome do banco</label><input type="text" class="form-control es-input" name="nome" required></div>
          <div class="es-field"><label class="es-label">Saldo atual</label><input type="number" step="0.01" min="0" class="form-control es-input" name="saldo_atual" placeholder="0,00" required></div>
          <div class="es-modal-list">
            <?php if (!$bancos): ?>
              <div class="es-empty">Nenhum banco cadastrado.</div>
            <?php else: foreach ($bancos as $banco): ?>
              <div class="es-modal-item">
                <span><?= htmlspecialchars($banco['nome']) ?></span>
                <div class="es-modal-actions">
                  <strong><?= moedaEntradaSaida($banco['saldo_atual']) ?></strong>
                  <button type="button" class="es-action-btn js-editar-banco" data-id="<?= (int) $banco['id'] ?>" data-nome="<?= htmlspecialchars($banco['nome'], ENT_QUOTES) ?>" data-saldo="<?= htmlspecialchars((string) $banco['saldo_atual'], ENT_QUOTES) ?>"><i class="bi bi-pencil"></i></button>
                  <button type="button" class="es-action-btn js-es-delete" data-action="excluir_banco" data-id="<?= (int) $banco['id'] ?>" data-confirm="Excluir este banco?"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            <?php endforeach; endif; ?>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar banco</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalEditarBanco" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Editar banco</h5>
          <div class="es-subtitle" style="margin-top:2px;">Atualize o nome e o saldo atual.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post">
        <div class="modal-body es-modal-grid">
          <input type="hidden" name="action" value="editar_banco">
          <input type="hidden" name="id" id="editarBancoId">
          <div class="es-field"><label class="es-label">Nome do banco</label><input type="text" class="form-control es-input" name="nome" id="editarBancoNome" required></div>
          <div class="es-field"><label class="es-label">Saldo atual</label><input type="number" step="0.01" min="0" class="form-control es-input" name="saldo_atual" id="editarBancoSaldo" required></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar alterações</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalForma" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Formas de pagamento</h5>
          <div class="es-subtitle" style="margin-top:2px;">Cadastre novas formas para os lancamentos.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post">
        <div class="modal-body es-modal-grid">
          <input type="hidden" name="action" value="salvar_forma" id="formaActionInput">
          <input type="hidden" name="id" id="formaIdInput">
          <div class="es-field"><label class="es-label">Nome da forma</label><input type="text" class="form-control es-input" name="nome" id="formaNomeInput" required></div>
          <div class="es-modal-list">
            <?php foreach ($formas as $forma): ?>
              <div class="es-modal-item">
                <span><?= htmlspecialchars($forma['nome']) ?></span>
                <div class="es-modal-actions">
                  <button type="button" class="es-action-btn js-editar-forma" data-id="<?= (int) $forma['id'] ?>" data-nome="<?= htmlspecialchars($forma['nome'], ENT_QUOTES) ?>"><i class="bi bi-pencil"></i></button>
                  <button type="button" class="es-action-btn js-es-delete" data-action="excluir_forma" data-id="<?= (int) $forma['id'] ?>" data-confirm="Excluir esta forma de pagamento?"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar forma</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalCategoria" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Categoria</h5>
          <div class="es-subtitle" style="margin-top:2px;">Defina se a categoria pertence a entrada, saida ou ambos.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post">
        <div class="modal-body es-modal-grid">
          <input type="hidden" name="action" value="salvar_categoria" id="categoriaActionInput">
          <input type="hidden" name="id" id="categoriaIdInput">
          <div class="es-field"><label class="es-label">Nome da categoria</label><input type="text" class="form-control es-input" name="nome" id="categoriaNomeInput" required></div>
          <div class="es-field">
            <label class="es-label">Tipo</label>
            <select class="form-select es-select" name="tipo_categoria" id="categoriaTipoInput">
              <option value="entrada">Entrada</option>
              <option value="saida">Saida</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          <div class="es-modal-list">
            <?php foreach ($categorias as $categoria): ?>
              <div class="es-modal-item">
                <span><?= htmlspecialchars($categoria['nome']) ?></span>
                <div class="es-modal-actions">
                  <span class="es-badge <?= $categoria['tipo'] === 'saida' ? 'saida' : 'entrada' ?>"><?= htmlspecialchars(ucfirst($categoria['tipo'])) ?></span>
                  <button type="button" class="es-action-btn js-editar-categoria" data-id="<?= (int) $categoria['id'] ?>" data-nome="<?= htmlspecialchars($categoria['nome'], ENT_QUOTES) ?>" data-tipo="<?= htmlspecialchars($categoria['tipo'], ENT_QUOTES) ?>"><i class="bi bi-pencil"></i></button>
                  <button type="button" class="es-action-btn js-es-delete" data-action="excluir_categoria" data-id="<?= (int) $categoria['id'] ?>" data-confirm="Excluir esta categoria?"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar categoria</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalSubcategoria" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Subcategoria</h5>
          <div class="es-subtitle" style="margin-top:2px;">Vincule a subcategoria a uma categoria existente.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post">
        <div class="modal-body es-modal-grid">
          <input type="hidden" name="action" value="salvar_subcategoria" id="subcategoriaActionInput">
          <input type="hidden" name="id" id="subcategoriaIdInput">
          <div class="es-field"><label class="es-label">Nome da subcategoria</label><input type="text" class="form-control es-input" name="nome" id="subcategoriaNomeInput" required></div>
          <div class="es-field">
            <label class="es-label">Categoria</label>
            <select class="form-select es-select" name="categoria_id_sub" id="subcategoriaCategoriaInput" required>
              <option value="">Selecione</option>
              <?php foreach ($categorias as $categoria): ?>
                <option value="<?= (int) $categoria['id'] ?>"><?= htmlspecialchars($categoria['nome']) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="es-modal-list">
            <?php if (!$subcategorias): ?>
              <div class="es-empty">Nenhuma subcategoria cadastrada.</div>
            <?php else: foreach ($subcategorias as $sub): ?>
              <div class="es-modal-item">
                <span><?= htmlspecialchars($sub['nome']) ?></span>
                <div class="es-modal-actions">
                  <small><?= htmlspecialchars($sub['categoria_nome']) ?></small>
                  <button type="button" class="es-action-btn js-editar-subcategoria" data-id="<?= (int) $sub['id'] ?>" data-nome="<?= htmlspecialchars($sub['nome'], ENT_QUOTES) ?>" data-categoria-id="<?= (int) $sub['categoria_id'] ?>"><i class="bi bi-pencil"></i></button>
                  <button type="button" class="es-action-btn js-es-delete" data-action="excluir_subcategoria" data-id="<?= (int) $sub['id'] ?>" data-confirm="Excluir esta subcategoria?"><i class="bi bi-trash"></i></button>
                </div>
              </div>
            <?php endforeach; endif; ?>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar subcategoria</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalEditarLancamento" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Editar lançamento</h5>
          <div class="es-subtitle" style="margin-top:2px;">Atualize os dados do lançamento.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <form method="post" class="modal-body es-modal-grid">
        <input type="hidden" name="action" value="editar_lancamento">
        <input type="hidden" name="id" id="editarLancamentoId">
        <div class="es-field es-col-3">
          <label class="es-label">Tipo</label>
          <select class="form-select es-select" name="tipo" id="editarLancamentoTipo">
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </div>
        <div class="es-field es-col-3"><label class="es-label">Data</label><input type="date" class="form-control es-input" name="data_lancamento" id="editarLancamentoData" required></div>
        <div class="es-field es-col-6" style="grid-column:1/-1;"><label class="es-label">Descrição</label><input type="text" class="form-control es-input" name="descricao" id="editarLancamentoDescricao" required></div>
        <div class="es-field es-col-3"><label class="es-label">Valor</label><input type="number" step="0.01" min="0" class="form-control es-input" name="valor" id="editarLancamentoValor" required></div>
        <div class="es-field es-col-3"><label class="es-label">Quantidade</label><input type="number" min="1" class="form-control es-input" name="quantidade" id="editarLancamentoQuantidade" value="1" required></div>
        <div class="es-field es-col-3"><label class="es-label">Desconto</label><input type="number" step="0.01" min="0" class="form-control es-input" name="desconto" id="editarLancamentoDesconto" value="0"></div>
        <div class="es-field es-col-3"><label class="es-label">Forma</label><select class="form-select es-select" name="forma_id" id="editarLancamentoForma"><option value="">Selecione</option><?php foreach ($formas as $forma): ?><option value="<?= (int) $forma['id'] ?>"><?= htmlspecialchars($forma['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="es-field es-col-2"><label class="es-label">Categoria</label><select class="form-select es-select" name="categoria_id" id="editarLancamentoCategoria"><option value="">Selecione</option><?php foreach ($categorias as $categoria): ?><option value="<?= (int) $categoria['id'] ?>" data-tipo="<?= htmlspecialchars($categoria['tipo']) ?>"><?= htmlspecialchars($categoria['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="es-field es-col-2"><label class="es-label">Banco / origem</label><select class="form-select es-select" name="banco_id" id="editarLancamentoBanco"><option value="">Não informar</option><?php foreach ($bancos as $banco): ?><option value="<?= (int) $banco['id'] ?>"><?= htmlspecialchars($banco['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="es-field es-col-2"><label class="es-label">Subcategoria</label><select class="form-select es-select" name="subcategoria_id" id="editarLancamentoSubcategoria"><option value="">Selecione</option><?php foreach ($subcategorias as $sub): ?><option value="<?= (int) $sub['id'] ?>" data-categoria="<?= (int) $sub['categoria_id'] ?>"><?= htmlspecialchars($sub['nome']) ?></option><?php endforeach; ?></select></div>
        <div class="modal-footer es-modal-footer-inline px-0 pb-0">
          <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Cancelar</button>
          <button type="submit" class="es-btn-primary">Salvar alterações</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade es-modal" id="modalConfirmarExclusao" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:420px;">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h5 class="modal-title">Confirmar exclusão</h5>
          <div class="es-subtitle" style="margin-top:2px;">Essa ação não poderá ser desfeita.</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <div class="es-notice err" style="margin-bottom:0;">
          <div class="es-notice-icon"><i class="bi bi-trash3"></i></div>
          <div>
            <div class="es-notice-title">Deseja continuar?</div>
            <div class="es-notice-text" id="esConfirmDeleteText">Tem certeza que deseja excluir este registro?</div>
          </div>
        </div>
      </div>
      <div class="modal-footer es-modal-footer-inline">
        <button type="button" class="es-btn-outline" data-bs-dismiss="modal">Não</button>
        <button type="button" class="es-btn-primary" id="esConfirmDeleteBtn">Sim, excluir</button>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="./assets/js/entrada_saida.js?v=<?= $entradaSaidaJsVer ?>"></script>
</body>
</html>
