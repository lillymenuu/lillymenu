"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, LayoutDashboard, Store, Headset, Globe } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { saCall, type SaLoja, type SaLojasResposta } from "@/lib/superadmin";
import { cn } from "cn";

/* Busca real (não decorativa): atalho ⌘K/Ctrl+K abre um modal central, igual ao print de
   referência — grupo "Páginas" (navegação real do painel, sempre visível) + grupo "Lojas"
   (carrega a listagem já usada em /superadmin/lojas sob demanda, filtra pelo nome ao digitar).
   Clicar num resultado de loja leva pra Lojas já com ela aberta (?loja=<id>, lido em
   sa-lojas-manager.tsx); clicar numa página navega direto. */

const STATUS_ESTILO: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  suspensa: "bg-rose-100 text-rose-700",
};

const PAGINAS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/lojas", label: "Lojas", icon: Store },
  { href: "/superadmin/suporte", label: "Suporte", icon: Headset },
  { href: "/superadmin/landing", label: "Landing page", icon: Globe },
];

export function SaTopbarSearch() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [lojas, setLojas] = useState<SaLoja[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  const garantirCarregado = useCallback(async () => {
    if (lojas !== null || carregando) return;
    setCarregando(true);
    const r = await saCall<SaLojasResposta | { ok: false }>("superadmin_lojas");
    setCarregando(false);
    if (r.ok) setLojas((r as SaLojasResposta).lojas);
  }, [lojas, carregando]);

  const abrir = useCallback(() => {
    setAberto(true);
    void garantirCarregado();
  }, [garantirCarregado]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrir();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [abrir]);

  function fechar(v: boolean) {
    setAberto(v);
    if (!v) setTermo("");
  }

  const paginasFiltradas = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return t ? PAGINAS.filter((p) => p.label.toLowerCase().includes(t)) : PAGINAS;
  }, [termo]);

  const lojasFiltradas = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (!t) return [];
    return (lojas ?? []).filter((l) => l.nome.toLowerCase().includes(t)).slice(0, 6);
  }, [termo, lojas]);

  function irParaPagina(href: string) {
    fechar(false);
    router.push(href);
  }

  function irParaLoja(loja: SaLoja) {
    fechar(false);
    router.push(`/superadmin/lojas?loja=${loja.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-full border bg-muted/40 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <Search size={15} className="shrink-0" />
        <span className="flex-1 truncate text-left">Buscar uma página ou loja...</span>
        <kbd className="shrink-0 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <Dialog open={aberto} onOpenChange={fechar}>
        <DialogContent showCloseButton={false} className="top-24 max-w-lg translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar uma página ou loja..."
              className="h-6 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="button" onClick={() => fechar(false)} className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Fechar busca">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto py-2">
            <p className="px-4 pt-1 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Páginas</p>
            {paginasFiltradas.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Nenhuma página encontrada.</p>}
            {paginasFiltradas.map((p) => (
              <button
                key={p.href}
                type="button"
                onClick={() => irParaPagina(p.href)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <p.icon size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{p.label}</span>
                <ChevronRight size={14} className="shrink-0 text-muted-foreground/50" />
              </button>
            ))}

            {termo.trim().length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Lojas</p>
                {carregando ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Carregando...</p>
                ) : lojasFiltradas.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Nenhuma loja encontrada.</p>
                ) : (
                  lojasFiltradas.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => irParaLoja(l)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                    >
                      <Store size={16} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{l.nome}</span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_ESTILO[l.status] ?? "bg-slate-100 text-slate-600")}>{l.status}</span>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
