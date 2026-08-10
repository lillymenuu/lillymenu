<?php
function statusLabel($status){
  return [
    'recebido'   => 'Recebido',
    'producao'   => 'Em produção',
    'entrega'    => 'Saiu para entrega',
    'finalizado' => 'Finalizado',
    'cancelado'  => 'Cancelado'
  ][$status] ?? 'Desconhecido';
}
?>