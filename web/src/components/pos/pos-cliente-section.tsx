"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, UserPlus } from "lucide-react";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PosClienteBusca, PosClienteStats } from "@/lib/pos";
import { PosClienteDialog } from "@/components/pos/pos-cliente-dialog";
import { PosInfoCard } from "@/components/pos/pos-info-card";

export function PosClienteSection({
  cliente,
  onClienteChange,
  onStatsChange,
  cashbackAtivo,
  onCashbackAtivoChange,
}: {
  cliente: PosClienteBusca | null;
  onClienteChange: (c: PosClienteBusca | null) => void;
  onStatsChange: (stats: PosClienteStats | null) => void;
  cashbackAtivo: boolean;
  onCashbackAtivoChange: (v: boolean) => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [comboAberto, setComboAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PosClienteBusca[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cliente) {
      onStatsChange(null);
      return;
    }
    fetch(`/api/cliente/stats?id=${cliente.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) onStatsChange(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  useEffect(() => {
    if (!comboAberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) fecharCombo();
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [comboAberto]);

  async function buscarClientes(termo: string) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/pos/clientes-busca?q=${encodeURIComponent(termo)}`);
      const data = await res.json();
      setResultados(data.ok ? data.clientes : []);
    } catch {
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  }

  function abrirCombo() {
    setComboAberto(true);
    buscarClientes(busca);
  }

  function fecharCombo() {
    setComboAberto(false);
    setBusca("");
    setResultados(null);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
  }

  function handleBuscaChange(v: string) {
    setBusca(v);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    buscaTimer.current = setTimeout(() => buscarClientes(v), 300);
  }

  function selecionarCliente(c: PosClienteBusca) {
    onClienteChange(c);
    fecharCombo();
  }

  return (
    <>
      {cliente ? (
        <PosInfoCard onLimpar={() => onClienteChange(null)} onEditar={() => setDialogAberto(true)}>
          <div className="text-xs font-semibold">
            {cliente.nome} <span className="font-normal text-muted-foreground">- {cliente.telefone}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Cashback nesta compra?</span>
            <Switch checked={cashbackAtivo} onCheckedChange={onCashbackAtivoChange} />
          </div>
        </PosInfoCard>
      ) : (
        <div className="flex items-end gap-2">
          <div ref={comboRef} className="relative min-w-0 flex-1 space-y-1">
            <Label className="text-xs font-normal text-muted-foreground">Busque pelo cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoComplete="off"
                placeholder="Busque por número ou nome"
                value={busca}
                onFocus={abrirCombo}
                onChange={(e) => handleBuscaChange(e.target.value)}
                className="h-10 w-full rounded-full border-0 bg-muted/60 pr-9 pl-9 text-sm outline-none transition-colors placeholder:text-xs placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/60"
              />
              <ChevronDown
                className={cn(
                  "pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform duration-150",
                  comboAberto && "rotate-180"
                )}
              />
            </div>

            {comboAberto && (
              <div className="animate-in fade-in slide-in-from-top-0.5 ease-out absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border bg-popover shadow-lg duration-150">
                <div className="max-h-52 overflow-y-auto">
                  {carregando ? (
                    <div className="px-3 py-3 text-center text-xs text-muted-foreground">Carregando...</div>
                  ) : resultados && resultados.length > 0 ? (
                    resultados.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selecionarCliente(c)}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition-colors duration-150 hover:bg-muted/40"
                      >
                        <span className="max-w-[150px] truncate font-medium">{c.nome || "Sem nome"}</span>
                        <span className="shrink-0 text-muted-foreground">{c.telefone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                      {busca.trim() ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDialogAberto(true)}
            aria-label="Cadastrar novo cliente"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <UserPlus className="size-3.5" />
          </button>
        </div>
      )}

      <PosClienteDialog open={dialogAberto} onOpenChange={setDialogAberto} onSelecionado={(c) => onClienteChange(c)} clienteAtual={cliente} />
    </>
  );
}
