"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "cn";

const TAMANHO = 5;
/* Mesmo alfabeto dos codigos gerados (sem 0/O, 1/I/L): o resto e descartado ao digitar. */
const VALIDO = /[23456789ABCDEFGHJKMNPQRSTUVWXYZ]/;

function limpar(texto: string): string[] {
  return texto
    .toUpperCase()
    .split("")
    .filter((c) => VALIDO.test(c))
    .slice(0, TAMANHO);
}

/**
 * Entrar com o codigo de acesso rapido: 5 caixas que avancam sozinhas, aceitam colar o codigo
 * inteiro e enviam assim que a ultima e preenchida.
 */
export function CodigoAcesso({ onVoltar, onEntrou }: { onVoltar: () => void; onEntrou: (assinaturaBloqueada: boolean) => void }) {
  const [digitos, setDigitos] = useState<string[]>(Array(TAMANHO).fill(""));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [tremer, setTremer] = useState(false);
  const caixas = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    caixas.current[0]?.focus();
  }, []);

  async function enviar(codigo: string) {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/login/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.erro ?? "Não foi possível entrar.");
        setTremer(true);
        setDigitos(Array(TAMANHO).fill(""));
        setTimeout(() => caixas.current[0]?.focus(), 0);
        return;
      }
      onEntrou(Boolean(data.assinaturaBloqueada));
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  /** Escreve a partir da caixa `inicio` (1 caractere digitado ou um codigo colado). */
  function preencher(inicio: number, texto: string) {
    const chars = limpar(texto);
    if (chars.length === 0) return;
    const novo = [...digitos];
    chars.forEach((c, i) => {
      if (inicio + i < TAMANHO) novo[inicio + i] = c;
    });
    setDigitos(novo);
    setErro(null);
    const proxima = Math.min(inicio + chars.length, TAMANHO - 1);
    caixas.current[proxima]?.focus();
    if (novo.every((d) => d !== "")) enviar(novo.join(""));
  }

  function aoTeclar(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const novo = [...digitos];
      if (novo[i]) {
        novo[i] = "";
      } else if (i > 0) {
        novo[i - 1] = "";
        caixas.current[i - 1]?.focus();
      }
      setDigitos(novo);
    } else if (e.key === "ArrowLeft" && i > 0) {
      caixas.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < TAMANHO - 1) {
      caixas.current[i + 1]?.focus();
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <button
        type="button"
        onClick={onVoltar}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <h1 className="text-2xl font-semibold tracking-tight">Insira seu código</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Digite o código de 5 caracteres que o administrador da loja compartilhou com você.</p>

      <div
        className={cn("mt-8 flex justify-center gap-2.5", tremer && "animate-[tremer_0.35s_ease-in-out]")}
        onAnimationEnd={() => setTremer(false)}
      >
        {digitos.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              caixas.current[i] = el;
            }}
            value={d}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            spellCheck={false}
            maxLength={TAMANHO}
            disabled={enviando}
            aria-label={`Caractere ${i + 1} de ${TAMANHO}`}
            onChange={(e) => preencher(i, e.target.value.slice(-TAMANHO))}
            onPaste={(e) => {
              e.preventDefault();
              preencher(i, e.clipboardData.getData("text"));
            }}
            onKeyDown={(e) => aoTeclar(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "size-13 rounded-2xl border bg-background text-center text-xl font-semibold uppercase outline-none transition-colors",
              "focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:opacity-60",
              erro ? "border-red-300" : d ? "border-neutral-400" : "border-border"
            )}
          />
        ))}
      </div>

      <div className="mt-4 min-h-5 text-center text-sm">
        {enviando ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Entrando...
          </span>
        ) : erro ? (
          <span className="text-destructive">{erro}</span>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem um código? <span className="font-medium text-primary">Peça ao administrador da loja.</span>
      </p>
    </div>
  );
}
