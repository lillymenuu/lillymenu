/*
 * Opcoes comuns do Sentry (servidor e navegador). Nada de dado pessoal sai do sistema: sem
 * usuario, cookies, cabecalhos, corpo das requisicoes nem parametros da URL (que podem trazer
 * telefone, ex.: ?tel=...). So a mensagem e a pilha do erro. tracesSampleRate 0 = so erros.
 */
export const SENTRY_OPCOES = {
  tracesSampleRate: 0,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
} as const;
