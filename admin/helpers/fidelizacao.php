function atualizarFidelizacao(PDO $conn, int $cliente_id, ?int $lojaId = null): void {

  $stmt = $conn->prepare("
    SELECT IFNULL(SUM(total),0) AS total
    FROM pedidos
    WHERE cliente_id = ?" . ($lojaId ? " AND loja_id = ?" : "") . "
  ");
  $params = [$cliente_id];
  if ($lojaId) {
    $params[] = $lojaId;
  }
  $stmt->execute($params);
  $total = (float)$stmt->fetchColumn();

  $nivel = 'Bronze';

  if ($total >= 1500) {
    $nivel = 'VIP';
  } elseif ($total >= 800) {
    $nivel = 'Ouro';
  } elseif ($total >= 300) {
    $nivel = 'Prata';
  }

  $stmt = $conn->prepare("
    UPDATE clientes
    SET pontos = ?, nivel = ?
    WHERE id = ?" . ($lojaId ? " AND loja_id = ?" : "") . "
  ");
  $params = [(int)$total, $nivel, $cliente_id];
  if ($lojaId) {
    $params[] = $lojaId;
  }
  $stmt->execute($params);
}
