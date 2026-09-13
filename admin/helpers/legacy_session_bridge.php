<?php
/*
 * Ponte de sessao pra reaproveitar, sem modificar, endpoints legados que
 * exigem admin/protect.php (autenticacao por sessao PHP) a partir de um
 * endpoint v1 autenticado por Bearer token.
 *
 * protect.php sempre chama session_start() no topo. Se a gente ja tiver
 * chamado session_start() antes e preenchido $_SESSION manualmente, essa
 * segunda chamada e um no-op que PRESERVA os valores (testado
 * empiricamente) — mas emite um Notice ("Ignoring session_start()...").
 * Alguns endpoints legados (ex.: pdv_salvar.php) reativam
 * display_errors/E_ALL antes de dar require em protect.php, o que faria
 * esse Notice vazar como HTML antes do JSON. O error handler abaixo
 * silencia notice/warning (sem afetar erros reais/fatais).
 */
if (!function_exists('legacySessionBridge')) {
  function legacySessionBridge(array $auth): void {
    if (session_status() !== PHP_SESSION_ACTIVE) {
      session_start();
    }
    $_SESSION['admin_id'] = $auth['admin_id'];
    $_SESSION['loja_id'] = $auth['loja_id'];
    $_SESSION['admin_perfil'] = $auth['perfil'];

    set_error_handler(function ($errno) {
      return in_array($errno, [E_NOTICE, E_DEPRECATED, E_WARNING, E_USER_NOTICE, E_USER_DEPRECATED, E_USER_WARNING], true);
    });
  }
}
