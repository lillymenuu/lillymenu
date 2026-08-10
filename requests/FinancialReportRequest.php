<?php
require_once __DIR__ . '/BaseRequest.php';

class FinancialReportRequest extends BaseRequest
{
  public static function validate(array $input)
  {
    $errors = [];

    $type = self::enum($input['type'] ?? '', 'type', ['income', 'expense'], $errors, false);
    $accountId = self::integer($input['account_id'] ?? null, 'account_id', $errors, false, 1);
    $categoryId = self::integer($input['category_id'] ?? null, 'category_id', $errors, false, 1);
    $paymentMethodId = self::integer($input['payment_method_id'] ?? null, 'payment_method_id', $errors, false, 1);
    $referenceMonth = self::integer($input['reference_month'] ?? null, 'reference_month', $errors, false, 1);
    $referenceYear = self::integer($input['reference_year'] ?? null, 'reference_year', $errors, false, 2000);
    $dateFrom = self::date($input['date_from'] ?? null, 'date_from', $errors, false);
    $dateTo = self::date($input['date_to'] ?? null, 'date_to', $errors, false);

    if ($errors) {
      self::fail($errors);
    }

    return array_filter([
      'type' => $type ?: null,
      'account_id' => $accountId,
      'category_id' => $categoryId,
      'payment_method_id' => $paymentMethodId,
      'reference_month' => $referenceMonth,
      'reference_year' => $referenceYear,
      'date_from' => $dateFrom ?: null,
      'date_to' => $dateTo ?: null,
    ], static function ($value) {
      return $value !== null && $value !== '';
    });
  }
}
