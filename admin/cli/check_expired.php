<?php
/*
 * Script diario (nao chamado via navegador) que:
 *  1) marca como 'suspensa' as assinaturas cujo ciclo pago (ciclo_fim) ja venceu,
 *     desativando loja/admins junto — hoje isso so acontece de forma lazy quando
 *     alguem da loja loga (admin/protect.php); esse script deixa o dado certo no
 *     banco mesmo sem ninguem logar, o que importa pro dashboard do superadmin.
 *  2) marca como 'atrasado' as cobrancas Pix (Mercado Pago) que ficaram 'pendente'
 *     e cujo QR Code ja expirou (mp_expiracao no passado), pra nao ficarem
 *     penduradas como "pendente" pra sempre.
 *
 * Primeiro script CLI do projeto (nao havia convencao anterior pra seguir).
 *
 * Configuracao no Agendador de Tarefas do Windows:
 *   Programa/script:  C:\xampp\php\php.exe
 *   Argumentos:       C:\xampp\htdocs\lillymenu\admin\cli\check_expired.php
 *   Gatilho:          Diariamente
 */

if (php_sapi_name() !== 'cli') {
  http_response_code(403);
  exit('Este script so pode ser executado via linha de comando.');
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../helpers/mercadopago.php';

garantirMercadopagoColunas($conn);

$hoje = date('Y-m-d');

try {
  $stmt = $conn->prepare("
    SELECT a.id, a.loja_id
    FROM assinaturas a
    WHERE a.status = 'ativa' AND a.ciclo_fim IS NOT NULL AND a.ciclo_fim < ?
  ");
  $stmt->execute([$hoje]);
  $vencidas = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($vencidas as $assinatura) {
    $conn->prepare("UPDATE assinaturas SET status = 'suspensa', bloqueada_em = NOW() WHERE id = ?")
      ->execute([(int) $assinatura['id']]);
    $conn->prepare("UPDATE lojas SET ativo = 0 WHERE id = ?")
      ->execute([(int) $assinatura['loja_id']]);
    $conn->prepare("UPDATE admins SET ativo = 0 WHERE loja_id = ?")
      ->execute([(int) $assinatura['loja_id']]);
  }

  echo count($vencidas) . " assinatura(s) marcada(s) como suspensa.\n";
} catch (Exception $e) {
  echo "Erro ao suspender assinaturas vencidas: " . $e->getMessage() . "\n";
}

try {
  $stmt = $conn->prepare("
    UPDATE cobrancas
    SET status = 'atrasado'
    WHERE status = 'pendente' AND origem = 'mercadopago' AND mp_expiracao IS NOT NULL AND mp_expiracao < NOW()
  ");
  $stmt->execute();
  echo $stmt->rowCount() . " cobranca(s) Pix expirada(s) marcada(s) como atrasado.\n";
} catch (Exception $e) {
  echo "Erro ao expirar cobrancas Pix: " . $e->getMessage() . "\n";
}
