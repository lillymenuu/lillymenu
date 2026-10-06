"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { saCall, type SaLoja, type SaLojasResposta } from "@/lib/superadmin";
import { cn } from "cn";

/* Busca real de lojas (não decorativa): carrega a listagem já usada em /superadmin/lojas sob
   demanda (1x, no primeiro foco) e filtra pelo nome no cliente. Clicar num resultado leva direto
   pra tela de Lojas já com aquela loja aberta (?loja=<id>, lido em sa-lojas-manager.tsx). */

const STATUS_ESTILO: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  suspensa: "bg-rose-100 text-rose-700",
};

export function SaTopbarSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const [lojas, setLojas] = useState<SaLoja[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setAberto(true);
      }
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  async function garantirCarregado() {
    if (lojas !== null || carregando) return;
    setCarregando(true);
    const r = await saCall<SaLojasResposta | { ok: false }>("superadmin_lojas");
    setCarregando(false);
    if (r.ok) setLojas((r as SaLojasResposta).lojas);
  }

  const resultados = termo.trim().length > 0 ? (lojas ?? []).filter((l) => l.nome.toLowerCase().includes(termo.trim().toLowerCase())).slice(0, 6) : [];

  function irPara(loja: SaLoja) {
    setAberto(false);
    setTermo("");
    router.push(`/superadmin/lojas?loja=${loja.id}`);
  }

  return (
    <div ref={containerRef} className="relative min-w-0 max-w-sm flex-1">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => {
          setAberto(true);
          void garantirCarregado();
        }}
        placeholder="Buscar uma loja..."
        className="h-9 w-full rounded-full border bg-muted/40 pr-14 pl-9.5 text-sm outline-none focus:bg-background focus:ring-2 focus:ring-indigo-500/30"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>

      {aberto && termo.trim().length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg">
          {carregando ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Carregando...</p>
          ) : resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {resultados.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => irPara(l)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted">
                    <span className="min-w-0 flex-1 truncate font-medium">{l.nome}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_ESTILO[l.status] ?? "bg-slate-100 text-slate-600")}>{l.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
