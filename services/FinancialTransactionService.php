<?php
require_once __DIR__ . '/../models/FinancialTransaction.php';

class FinancialTransactionService
{
  public function list($conn, $tenantId, array $filters = [])
  {
    return FinancialTransaction::all($conn, $tenantId, $filters);
  }

  public function show($conn, $tenantId, $id)
  {
    return FinancialTransaction::find($conn, $id, $tenantId);
  }

  public function create($conn, $tenantId, array $data)
  {
    return FinancialTransaction::create($conn, $tenantId, $data);
  }

  public function update($conn, $tenantId, $id, array $data)
  {
    return FinancialTransaction::update($conn, $id, $tenantId, $data);
  }

  public function delete($conn, $tenantId, $id)
  {
    return FinancialTransaction::delete($conn, $id, $tenantId);
  }
}
