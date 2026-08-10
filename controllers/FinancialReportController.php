<?php
require_once __DIR__ . '/../requests/FinancialReportRequest.php';
require_once __DIR__ . '/../services/FinancialReportService.php';

class FinancialReportController
{
  protected $service;

  public function __construct()
  {
    $this->service = new FinancialReportService();
  }

  public function dashboard($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->dashboard($conn, $tenantId, $filters);
  }

  public function summary($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->summary($conn, $tenantId, $filters);
  }

  public function monthlySummary($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    $appNow = new DateTimeImmutable('now', new DateTimeZone('America/Fortaleza'));
    $month = (int) ($input['reference_month'] ?? $appNow->format('n'));
    $year = (int) ($input['reference_year'] ?? $appNow->format('Y'));
    return $this->service->monthlySummary($conn, $tenantId, $month, $year, $filters);
  }

  public function cashFlow($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->cashFlow($conn, $tenantId, $filters);
  }

  public function dre($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->dre($conn, $tenantId, $filters);
  }

  public function expenseByCategory($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->expenseByCategory($conn, $tenantId, $filters);
  }

  public function incomeByPaymentMethod($conn, $tenantId, array $input = [])
  {
    $filters = FinancialReportRequest::validate($input);
    return $this->service->incomeByPaymentMethod($conn, $tenantId, $filters);
  }
}
