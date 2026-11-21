import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPCOES } from "@/lib/sentryOpcoes";

/*
 * Monitoramento de erros do servidor (Sentry). Fica desligado enquanto NEXT_PUBLIC_SENTRY_DSN nao
 * estiver definido na Vercel. Sem dados pessoais: ver lib/sentryOpcoes.ts.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, ...SENTRY_OPCOES, dataCollection: { ...SENTRY_OPCOES.dataCollection, httpBodies: [] }, environment: process.env.VERCEL_ENV ?? "development" });
}

/* Erros de rotas de API, Server Components e Server Actions. */
export const onRequestError = Sentry.captureRequestError;
