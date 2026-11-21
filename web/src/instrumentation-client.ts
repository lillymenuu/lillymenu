/*
 * Monitoramento de erros no navegador (Sentry). Carregado sob demanda: sem NEXT_PUBLIC_SENTRY_DSN o
 * SDK nem entra no carregamento da pagina (nao pesa no cardapio dos clientes).
 */
import { SENTRY_OPCOES } from "@/lib/sentryOpcoes";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({ dsn, ...SENTRY_OPCOES, dataCollection: { ...SENTRY_OPCOES.dataCollection, httpBodies: [] }, environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development" });
  });
}
