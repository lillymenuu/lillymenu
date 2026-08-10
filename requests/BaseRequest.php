<?php

class RequestValidationException extends InvalidArgumentException
{
  protected $errors = [];

  public function __construct(array $errors, $message = 'Dados inválidos.')
  {
    parent::__construct($message);
    $this->errors = $errors;
  }

  public function errors()
  {
    return $this->errors;
  }
}

abstract class BaseRequest
{
  protected static function fail(array $errors)
  {
    throw new RequestValidationException($errors);
  }

  protected static function string($value, $field, array &$errors, $required = true, $max = 255)
  {
    $value = trim((string) ($value ?? ''));
    if ($required && $value === '') {
      $errors[$field] = "O campo {$field} é obrigatório.";
      return '';
    }
    if ($value !== '' && mb_strlen($value) > $max) {
      $errors[$field] = "O campo {$field} deve ter no máximo {$max} caracteres.";
    }
    return $value;
  }

  protected static function integer($value, $field, array &$errors, $required = true, $min = null)
  {
    if ($value === null || $value === '') {
      if ($required) {
        $errors[$field] = "O campo {$field} é obrigatório.";
      }
      return null;
    }
    if (filter_var($value, FILTER_VALIDATE_INT) === false) {
      $errors[$field] = "O campo {$field} deve ser inteiro.";
      return null;
    }
    $value = (int) $value;
    if ($min !== null && $value < $min) {
      $errors[$field] = "O campo {$field} deve ser maior ou igual a {$min}.";
    }
    return $value;
  }

  protected static function decimal($value, $field, array &$errors, $required = true, $min = null)
  {
    if ($value === null || $value === '') {
      if ($required) {
        $errors[$field] = "O campo {$field} é obrigatório.";
      }
      return null;
    }
    $normalized = preg_replace('/[^\d,.\-]/', '', (string) $value);
    if ($normalized === null) {
      $normalized = '';
    }
    if (strpos($normalized, ',') !== false && strpos($normalized, '.') !== false) {
      $normalized = str_replace('.', '', $normalized);
      $normalized = str_replace(',', '.', $normalized);
    } elseif (strpos($normalized, ',') !== false) {
      $normalized = str_replace(',', '.', $normalized);
    }
    if (!is_numeric($normalized)) {
      $errors[$field] = "O campo {$field} deve ser numérico.";
      return null;
    }
    $value = (float) $normalized;
    if ($min !== null && $value < $min) {
      $errors[$field] = "O campo {$field} deve ser maior ou igual a {$min}.";
    }
    return $value;
  }

  protected static function boolean($value, $default = 1)
  {
    if ($value === null || $value === '') {
      return (int) $default;
    }
    return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
  }

  protected static function enum($value, $field, array $allowed, array &$errors, $required = true)
  {
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
      if ($required) {
        $errors[$field] = "O campo {$field} é obrigatório.";
      }
      return '';
    }
    if (!in_array($value, $allowed, true)) {
      $errors[$field] = "O campo {$field} é inválido.";
    }
    return $value;
  }

  protected static function date($value, $field, array &$errors, $required = true)
  {
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
      if ($required) {
        $errors[$field] = "O campo {$field} é obrigatório.";
      }
      return '';
    }
    $date = date_create($value);
    if (!$date) {
      $errors[$field] = "O campo {$field} deve ser uma data válida.";
      return '';
    }
    return $date->format('Y-m-d');
  }

  protected static function nullableText($value, $max = 5000)
  {
    $value = trim((string) ($value ?? ''));
    if ($value === '') {
      return null;
    }
    return mb_substr($value, 0, $max);
  }
}
