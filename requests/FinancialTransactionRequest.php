<?php
require_once __DIR__ . '/BaseRequest.php';
require_once __DIR__ . '/../models/FinancialAccount.php';
require_once __DIR__ . '/../models/FinancialCategory.php';
require_once __DIR__ . '/../models/PaymentMethod.php';

class FinancialTransactionRequest extends BaseRequest
{
  public static function validate($conn, $tenantId, array $input)
  {
    $errors = [];
    $tenantId = (int) $tenantId;

    $accountId = self::integer($input['account_id'] ?? null, 'account_id', $errors, true, 1);
    $categoryId = self::integer($input['category_id'] ?? null, 'category_id', $errors, true, 1);
    $paymentMethodId = self::integer($input['payment_method_id'] ?? null, 'payment_method_id', $errors, false, 1);
    $type = self::enum($input['type'] ?? '', 'type', ['income', 'expense'], $errors, true);
    $description = self::string($input['description'] ?? '', 'description', $errors, true, 255);
    $amount = self::decimal($input['amount'] ?? null, 'amount', $errors, true, 0.01);
    $transactionDate = self::date($input['transaction_date'] ?? null, 'transaction_date', $errors, true);
    $referenceMonth = self::integer($input['reference_month'] ?? null, 'reference_month', $errors, false, 1);
    $referenceYear = self::integer($input['reference_year'] ?? null, 'reference_year', $errors, false, 2000);
    $notes = self::nullableText($input['notes'] ?? null);

    if ($accountId && !FinancialAccount::find($conn, $accountId, $tenantId)) {
      $errors['account_id'] = 'Conta inválida para este tenant.';
    }

    $category = null;
    if ($categoryId) {
      $category = FinancialCategory::find($conn, $categoryId, $tenantId);
      if (!$category) {
        $errors['category_id'] = 'Categoria inválida para este tenant.';
      } elseif ($type && ($category['type'] ?? '') !== $type) {
        $errors['category_id'] = 'A categoria deve ter o mesmo tipo do lançamento.';
      }
    }

    if ($paymentMethodId && !PaymentMethod::find($conn, $paymentMethodId, $tenantId)) {
      $errors['payment_method_id'] = 'Forma de pagamento inválida para este tenant.';
    }

    if ($errors) {
      self::fail($errors);
    }

    $timestamp = strtotime($transactionDate);
    return [
      'tenant_id' => $tenantId,
      'account_id' => $accountId,
      'category_id' => $categoryId,
      'payment_method_id' => $paymentMethodId ?: null,
      'type' => $type,
      'description' => $description,
      'amount' => $amount,
      'transaction_date' => $transactionDate,
      'reference_month' => $referenceMonth ?: (int) (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone('America/Fortaleza'))->format('n'),
      'reference_year' => $referenceYear ?: (int) (new DateTimeImmutable('@' . $timestamp))->setTimezone(new DateTimeZone('America/Fortaleza'))->format('Y'),
      'notes' => $notes,
    ];
  }
}
