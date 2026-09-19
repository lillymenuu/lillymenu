"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

type TopProduto = { nome: string; valor: number; saidas: number; estoque: number };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Numero que sobe de 0 ate o valor quando `ativo` — respeita prefers-reduced-motion. */
function useContagem(alvo: number, ativo: boolean, atrasoMs: number, duracaoMs = 1000) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setValor(alvo), 0);
      return () => clearTimeout(t);
    }
    let raf = 0;
    let inicio: number | null = null;
    const timer = setTimeout(() => {
      const passo = (t: number) => {
        inicio ??= t;
        const p = Math.min(1, (t - inicio) / duracaoMs);
        setValor(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    }, atrasoMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [alvo, ativo, atrasoMs, duracaoMs]);
  return valor;
}

function Linha({ produto, posicao, maximo, ativo }: { produto: TopProduto; posicao: number; maximo: number; ativo: boolean }) {
  const atraso = posicao * 110;
  const saidas = useContagem(produto.saidas, ativo, atraso + 150);
  const pct = maximo > 0 ? (produto.saidas / maximo) * 100 : 0;
  const lider = posicao === 0;
  const semEstoque = produto.estoque <= 0;
  const estoqueBaixo = !semEstoque && produto.estoque <= 5;

  return (
    <li
      className={cn(
        "group rounded-xl px-2 py-2.5 transition-all duration-500 ease-out hover:bg-muted/60 sm:px-3",
        ativo ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
      style={{ transitionDelay: ativo ? `${atraso}ms` : "0ms" }}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
            lider ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "bg-muted text-muted-foreground"
          )}
        >
          {posicao + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{produto.nome}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {saidas}
              <span className="ml-1 text-xs font-normal text-muted-foreground">saídas</span>
            </span>
          </div>

          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "relative h-full origin-left rounded-full transition-[width] duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]",
                lider
                  ? "bg-gradient-to-r from-primary/80 to-primary"
                  : "bg-gradient-to-r from-primary/35 to-primary/60 group-hover:from-primary/55 group-hover:to-primary/85"
              )}
              style={{ width: ativo ? `${Math.max(pct, 2)}%` : "0%", transitionDelay: ativo ? `${atraso + 100}ms` : "0ms" }}
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[topbar-brilho_2.8s_ease-in-out_1.6s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden" />
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums">{brl.format(produto.valor)}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium tabular-nums",
                semEstoque
                  ? "bg-destructive/10 text-destructive"
                  : estoqueBaixo
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {semEstoque ? "Sem estoque" : estoqueBaixo ? `Estoque baixo: ${produto.estoque}` : `Estoque: ${produto.estoque}`}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

/** Ranking horizontal dos produtos com mais saida — barras proporcionais que crescem ao entrar na tela. */
export function TopProdutosChart({ produtos }: { produtos: TopProduto[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setAtivo(true), 0);
      return () => clearTimeout(t);
    }
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setAtivo(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const maximo = Math.max(0, ...produtos.map((p) => p.saidas));

  return (
    <>
      <style>{`@keyframes topbar-brilho{0%{transform:translateX(-100%)}60%,100%{transform:translateX(320%)}}`}</style>
      <ol ref={ref} className="space-y-1">
        {produtos.map((p, i) => (
          <Linha key={`${p.nome}-${i}`} produto={p} posicao={i} maximo={maximo} ativo={ativo} />
        ))}
      </ol>
    </>
  );
}
