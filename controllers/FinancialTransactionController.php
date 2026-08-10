<?php
require_once __DIR__ . '/../requests/FinancialTransactionRequest.php';
require_once __DIR__ . '/../services/FinancialTransactionService.php';

class FinancialTransactionController
{
  protected $service;

  public function __construct()
  {
    $this->service = new FinancialTransactionService();
  }

  public function index($conn, $tenantId, array $filters = [])
  {
    return $this->service->list($conn, $tenantId, $filters);
  }

  public function show($conn, $tenantId, $id)
  {
    return $this->service->show($conn, $tenantId, $id);
  }

  public function store($conn, $tenantId, array $input)
  {
    $data = FinancialTransactionRequest::validate($conn, $tenantId, $input);
    return $this->service->create($conn, $tenantId, $data);
  }

  public function update($conn, $tenantId, $id, array $input)
  {
    $data = FinancialTransactionRequest::validate($conn, $tenantId, $input);
    return $this->service->update($conn, $tenantId, $id, $data);
  }

  public function destroy($conn, $tenantId, $id)
  {
    return $this->service->delete($conn, $tenantId, $id);
  }
}
