"use client";

import { useState } from "react";
import { Copy, Check, Smile, Frown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Reacao = "gostou" | "nao_gostou" | null;

export function VerseOfDay({
  texto,
  referencia,
  data,
  fonteUrl,
  reacaoInicial,
}: {
  texto: string;
  referencia: string;
  data: string;
  fonteUrl: string;
  reacaoInicial: Reacao;
}) {
  const [reacao, setReacao] = useState<Reacao>(reacaoInicial);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${texto}${referencia ? " — " + referencia : ""}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponivel; sem fallback, nao e critico
    }
  }

  async function reagir(nova: Exclude<Reacao, null>) {
    setReacao(nova);
    await fetch("/api/versiculo-reacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reacao: nova, data, texto, referencia }),
    }).catch(() => {});
  }

  return (
    <Card className="relative overflow-hidden">
      <button
        onClick={copiar}
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        aria-label="Copiar versículo do dia"
        title="Copiar"
      >
        {copiado ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center justify-between pr-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Versículo de Hoje
          </span>
        </div>
        <p className="text-sm leading-relaxed">{texto}</p>
        <div className="flex items-center justify-between pt-1">
          {referencia ? (
            <a
              href={fonteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              {referencia}
            </a>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Gostou?</span>
            <button
              onClick={() => reagir("gostou")}
              className={`rounded-md p-1 hover:bg-muted ${reacao === "gostou" ? "text-primary" : ""}`}
              aria-label="Gostei"
            >
              <Smile size={16} />
            </button>
            <button
              onClick={() => reagir("nao_gostou")}
              className={`rounded-md p-1 hover:bg-muted ${reacao === "nao_gostou" ? "text-destructive" : ""}`}
              aria-label="Não gostei"
            >
              <Frown size={16} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
