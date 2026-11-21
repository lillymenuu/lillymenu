"use client";

import { useEffect } from "react";

/* Erro que derrubou ate o layout raiz: registra no Sentry (se configurado) e mostra uma tela simples. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#111827" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Algo deu errado</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 15 }}>Tente de novo. Se o problema continuar, fale com o suporte.</p>
          <button type="button" onClick={reset} style={{ border: 0, borderRadius: 999, padding: "10px 20px", background: "#9C5523", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
