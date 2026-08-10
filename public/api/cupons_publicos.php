<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');
require_once '../../config/database.php';
require_once '../../helpers/loja_context.php';

$lojaId = definirLojaIdSessao($conn);

try {
  $stmt = $conn->query("SHOW TABLES LIKE 'cupons'");
  if (!$stmt->fetchColumn()) {
    echo json_encode(['ok'=>true,'cupons'=>[]]); exit;
  }

  $colunas    = $conn->query("SHOW COLUMNS FROM cupons")->fetchAll(PDO::FETCH_COLUMN, 0);
  $temPublico = in_array('publico', $colunas);

  /*
   * Se a coluna `publico` existir, mostra somente os marcados como públicos.
   * Caso não exista, mostra todos os ativos (compatibilidade com schemas antigos).
   * Cupons com ativo=0 NUNCA são listados.
   */
  $filtroPublico = $temPublico ? "AND publico = 1" : "";

  $stmt = $conn->prepare("
    SELECT codigo, tipo, desconto, minimo, quantidade_total, quantidade_usada
    FROM cupons
    WHERE loja_id = ?
      AND ativo = 1
      {$filtroPublico}
      AND (quantidade_total = 0 OR quantidade_usada < quantidade_total)
    ORDER BY id DESC
    LIMIT 20
  ");
  $stmt->execute([$lojaId]);
  $cupons = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $lista = array_map(function($c) {
    $desc = $c['tipo'] === 'percent'
      ? number_format((float)$c['desconto'], 0) . '% off'
      : ($c['tipo'] === 'frete'
          ? 'Frete grátis'
          : 'R$ ' . number_format((float)$c['desconto'], 2, ',', '.') . ' off');
    return [
      'codigo'     => $c['codigo'],
      'tipo'       => $c['tipo'],
      'desconto'   => (float)$c['desconto'],
      'minimo'     => (float)$c['minimo'],
      'desc_label' => $desc,
    ];
  }, $cupons);

  echo json_encode(['ok'=>true,'cupons'=>$lista], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
  echo json_encode(['ok'=>true,'cupons'=>[]]);
}
