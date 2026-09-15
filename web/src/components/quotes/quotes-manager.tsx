"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, Download, Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { ORCAMENTO_STATUS_LABEL } from "@/lib/orcamentos";
import type { OrcamentoResumo, OrcamentosListarResposta, OrcamentoStatus } from "@/lib/orcamentos";
import { QuoteFormDialog } from "@/components/quotes/quote-form-dialog";

const STATUS_BADGE: Record<OrcamentoStatus, string> = {
  pendente: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  aprovado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  recusado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function formatarData(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatarMoeda(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotesManager({ dadosIniciais }: { dadosIniciais: OrcamentosListarResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<OrcamentoResumo | null>(null);
  const [excluir, setExcluir] = useState<OrcamentoResumo | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [alternando, setAlternando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/quotes");
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar orçamentos.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(o: OrcamentoResumo) {
    setEditando(o);
    setFormAberto(true);
  }

  async function trocarStatus(o: OrcamentoResumo, status: OrcamentoStatus) {
    setAlternando(o.id);
    const anterior = o.status;
    setDados((prev) => ({ ...prev, orcamentos: prev.orcamentos.map((x) => (x.id === o.id ? { ...x, status } : x)) }));
    try {
      const res = await fetch("/api/quotes/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: o.id, status }),
      });
      const data = await res.json();
      if (!data.ok) {
        setDados((prev) => ({ ...prev, orcamentos: prev.orcamentos.map((x) => (x.id === o.id ? { ...x, status: anterior } : x)) }));
        toast.error(data.msg ?? "Erro ao atualizar status.");
      }
    } catch {
      setDados((prev) => ({ ...prev, orcamentos: prev.orcamentos.map((x) => (x.id === o.id ? { ...x, status: anterior } : x)) }));
      toast.error("Erro ao atualizar status.");
    } finally {
      setAlternando(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/quotes/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao apagar orçamento.");
        return;
      }
      toast.success("Orçamento apagado.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao apagar orçamento.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Quotes</h1>
          <p className="text-sm text-muted-foreground">Monte, salve e acompanhe orçamentos e recibos para seus clientes.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNovo}>
          <Plus className="size-4" /> Novo orçamento
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${carregando ? "opacity-60" : ""}`}>
        {dados.orcamentos.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">Nenhum orçamento salvo ainda.</Card>
        ) : (
          dados.orcamentos.map((o) => (
            <Card key={o.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <FileText className="size-4.5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{o.cliente_nome}</div>
                    <div className="text-xs text-muted-foreground">{formatarData(o.criado_em)}</div>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_BADGE[o.status]}`}>
                  {ORCAMENTO_STATUS_LABEL[o.status]}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{o.itens_count} {o.itens_count === 1 ? "item" : "itens"}</span>
                <span className="font-semibold">{formatarMoeda(o.total)}</span>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Select value={o.status} onValueChange={(v) => v && trocarStatus(o, v as OrcamentoStatus)} disabled={alternando === o.id}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue>{() => ORCAMENTO_STATUS_LABEL[o.status]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">{ORCAMENTO_STATUS_LABEL.pendente}</SelectItem>
                    <SelectItem value="aprovado">{ORCAMENTO_STATUS_LABEL.aprovado}</SelectItem>
                    <SelectItem value="recusado">{ORCAMENTO_STATUS_LABEL.recusado}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => abrirEdicao(o)}>
                    Editar
                  </Button>
                  <a
                    href={`/api/quotes/pdf?id=${o.id}&tipo=orcamento`}
                    target="_blank"
                    rel="noreferrer"
                    title="Gerar PDF"
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8")}
                  >
                    <Download className="size-3.5" />
                  </a>
                  <a
                    href={`/api/quotes/pdf?id=${o.id}&tipo=recibo`}
                    target="_blank"
                    rel="noreferrer"
                    title="Gerar recibo"
                    className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8")}
                  >
                    <Receipt className="size-3.5" />
                  </a>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs text-destructive hover:text-destructive" onClick={() => setExcluir(o)}>
                  Apagar
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <QuoteFormDialog
        open={formAberto}
        onOpenChange={setFormAberto}
        orcamentoId={editando?.id ?? null}
        onSalvo={carregar}
      />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Apagar orçamento"
        descricao="Deseja apagar este orçamento? Essa ação não poderá ser desfeita."
        confirmando={excluindo}
        textoConfirmar="Apagar"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
