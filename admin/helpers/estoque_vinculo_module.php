<?php

/**
 * Vários produtos podem compartilhar o mesmo controle de estoque (ex.: o mesmo
 * item físico vendido sob nomes/descrições diferentes no cardápio). Em vez de
 * reescrever os ~14 lugares que leem "estoque" pra resolver um grupo, cada
 * produto vinculado continua com sua própria linha real em "estoque" — só que
 * toda escrita passa a espelhar a mesma quantidade pros outros membros do
 * grupo logo em seguida (ver estoqueVinculoSincronizar). Assim leitura nunca
 * precisa mudar, só escrita.
 */

if (!function_exists('estoqueVinculoEnsureModule')) {
  function estoqueVinculoEnsureModule(PDO $conn): void
  {
    static $done = false;
    if ($done) return;
    $done = true;

    try {
      $conn->exec("CREATE TABLE IF NOT EXISTS estoque_grupos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        loja_id INT NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
      $conn->exec("CREATE TABLE IF NOT EXISTS estoque_grupo_membros (
        produto_id INT NOT NULL PRIMARY KEY,
        grupo_id INT NOT NULL,
        loja_id INT NOT NULL,
        KEY idx_egm_grupo (grupo_id, loja_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Throwable $e) {
    }
  }
}

/**
 * Ids de produto no mesmo grupo de $produtoId, incluindo ele mesmo. Sem grupo,
 * retorna so [$produtoId].
 */
if (!function_exists('estoqueVinculoMembros')) {
  function estoqueVinculoMembros(PDO $conn, int $produtoId, int $lojaId): array
  {
    estoqueVinculoEnsureModule($conn);
    if ($produtoId <= 0) {
      return [];
    }
    try {
      $stmt = $conn->prepare("
        SELECT m2.produto_id
        FROM estoque_grupo_membros m1
        JOIN estoque_grupo_membros m2 ON m2.grupo_id = m1.grupo_id AND m2.loja_id = m1.loja_id
        WHERE m1.produto_id = ? AND m1.loja_id = ?
      ");
      $stmt->execute([$produtoId, $lojaId]);
      $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN, 0));
      if ($ids) {
        return $ids;
      }
    } catch (Throwable $e) {
    }
    return [$produtoId];
  }
}

/**
 * Chamar DEPOIS de qualquer escrita em "estoque" pra $produtoId. Copia a
 * quantidade atual de $produtoId pros outros membros do grupo (valor
 * absoluto, nao delta — seguro chamar mais de uma vez). $mov, se informado
 * (['tipo'=>'entrada'|'saida','quantidade'=>int,'origem'=>string,
 * 'referencia_id'=>?int]), espelha tambem uma linha em estoque_movimentacoes
 * pra cada outro membro, senao o historico deles fica vazio apesar do saldo
 * estar mudando junto.
 */
if (!function_exists('estoqueVinculoSincronizar')) {
  function estoqueVinculoSincronizar(PDO $conn, int $produtoId, int $lojaId, ?array $mov = null): void
  {
    if ($produtoId <= 0) {
      return;
    }
    $membros = estoqueVinculoMembros($conn, $produtoId, $lojaId);
    $outros = array_filter($membros, fn($id) => $id !== $produtoId);
    if (!$outros) {
      return;
    }
    try {
      $stmtQtd = $conn->prepare("SELECT quantidade FROM estoque WHERE produto_id = ? AND loja_id = ?");
      $stmtQtd->execute([$produtoId, $lojaId]);
      $quantidade = $stmtQtd->fetchColumn();
      if ($quantidade === false) {
        return;
      }
      $quantidade = (int) $quantidade;

      $stmtInsert = $conn->prepare("INSERT IGNORE INTO estoque (produto_id, quantidade, loja_id) VALUES (?, 0, ?)");
      $stmtUpdate = $conn->prepare("UPDATE estoque SET quantidade = ? WHERE produto_id = ? AND loja_id = ?");
      $stmtMov = $mov ? $conn->prepare("
        INSERT INTO estoque_movimentacoes (produto_id, tipo, quantidade, origem, referencia_id, loja_id)
        VALUES (?, ?, ?, ?, ?, ?)
      ") : null;

      foreach ($outros as $outroId) {
        $stmtInsert->execute([$outroId, $lojaId]);
        $stmtUpdate->execute([$quantidade, $outroId, $lojaId]);
        if ($stmtMov) {
          $stmtMov->execute([
            $outroId,
            $mov['tipo'],
            $mov['quantidade'],
            $mov['origem'],
            $mov['referencia_id'] ?? null,
            $lojaId,
          ]);
        }
      }
    } catch (Throwable $e) {
    }
  }
}
