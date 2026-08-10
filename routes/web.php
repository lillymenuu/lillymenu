<?php

return [
  'financial.categories.index' => ['method' => 'GET', 'uri' => '/financial/categories', 'action' => 'FinancialCategoryController@index'],
  'financial.categories.show' => ['method' => 'GET', 'uri' => '/financial/categories/{id}', 'action' => 'FinancialCategoryController@show'],
  'financial.categories.store' => ['method' => 'POST', 'uri' => '/financial/categories', 'action' => 'FinancialCategoryController@store'],
  'financial.categories.update' => ['method' => 'PUT', 'uri' => '/financial/categories/{id}', 'action' => 'FinancialCategoryController@update'],
  'financial.categories.destroy' => ['method' => 'DELETE', 'uri' => '/financial/categories/{id}', 'action' => 'FinancialCategoryController@destroy'],

  'financial.accounts.index' => ['method' => 'GET', 'uri' => '/financial/accounts', 'action' => 'FinancialAccountController@index'],
  'financial.accounts.show' => ['method' => 'GET', 'uri' => '/financial/accounts/{id}', 'action' => 'FinancialAccountController@show'],
  'financial.accounts.store' => ['method' => 'POST', 'uri' => '/financial/accounts', 'action' => 'FinancialAccountController@store'],
  'financial.accounts.update' => ['method' => 'PUT', 'uri' => '/financial/accounts/{id}', 'action' => 'FinancialAccountController@update'],
  'financial.accounts.destroy' => ['method' => 'DELETE', 'uri' => '/financial/accounts/{id}', 'action' => 'FinancialAccountController@destroy'],

  'financial.payment-methods.index' => ['method' => 'GET', 'uri' => '/financial/payment-methods', 'action' => 'PaymentMethodController@index'],
  'financial.payment-methods.show' => ['method' => 'GET', 'uri' => '/financial/payment-methods/{id}', 'action' => 'PaymentMethodController@show'],
  'financial.payment-methods.store' => ['method' => 'POST', 'uri' => '/financial/payment-methods', 'action' => 'PaymentMethodController@store'],
  'financial.payment-methods.update' => ['method' => 'PUT', 'uri' => '/financial/payment-methods/{id}', 'action' => 'PaymentMethodController@update'],
  'financial.payment-methods.destroy' => ['method' => 'DELETE', 'uri' => '/financial/payment-methods/{id}', 'action' => 'PaymentMethodController@destroy'],

  'financial.transactions.index' => ['method' => 'GET', 'uri' => '/financial/transactions', 'action' => 'FinancialTransactionController@index'],
  'financial.transactions.show' => ['method' => 'GET', 'uri' => '/financial/transactions/{id}', 'action' => 'FinancialTransactionController@show'],
  'financial.transactions.store' => ['method' => 'POST', 'uri' => '/financial/transactions', 'action' => 'FinancialTransactionController@store'],
  'financial.transactions.update' => ['method' => 'PUT', 'uri' => '/financial/transactions/{id}', 'action' => 'FinancialTransactionController@update'],
  'financial.transactions.destroy' => ['method' => 'DELETE', 'uri' => '/financial/transactions/{id}', 'action' => 'FinancialTransactionController@destroy'],

  'financial.reports.dashboard' => ['method' => 'GET', 'uri' => '/financial/reports/dashboard', 'action' => 'FinancialReportController@dashboard'],
  'financial.reports.summary' => ['method' => 'GET', 'uri' => '/financial/reports/summary', 'action' => 'FinancialReportController@summary'],
  'financial.reports.monthly-summary' => ['method' => 'GET', 'uri' => '/financial/reports/monthly-summary', 'action' => 'FinancialReportController@monthlySummary'],
  'financial.reports.cash-flow' => ['method' => 'GET', 'uri' => '/financial/reports/cash-flow', 'action' => 'FinancialReportController@cashFlow'],
  'financial.reports.dre' => ['method' => 'GET', 'uri' => '/financial/reports/dre', 'action' => 'FinancialReportController@dre'],
  'financial.reports.expense-by-category' => ['method' => 'GET', 'uri' => '/financial/reports/expense-by-category', 'action' => 'FinancialReportController@expenseByCategory'],
  'financial.reports.income-by-payment-method' => ['method' => 'GET', 'uri' => '/financial/reports/income-by-payment-method', 'action' => 'FinancialReportController@incomeByPaymentMethod'],
];
