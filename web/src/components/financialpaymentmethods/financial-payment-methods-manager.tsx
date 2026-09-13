"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { FinanceiroFormaPagamento, FinanceiroFormasPagamentoResposta } from "@/lib/financeiroFormasPagamento";
import { PaymentMethodFormDialog } from "@/components/financialpaymentmethods/payment-method-form-dialog";

export function FinancialPaymentMethodsManager({ dadosIniciais }: { dadosIniciais: FinanceiroFormasPagamentoResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<FinanceiroFormaPagamento | null>(null);
  const [excluir, setExcluir] = useState<FinanceiroFormaPagamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/financialpaymentmethods");
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar formas de pagamento.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar formas de pagamento.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(f: FinanceiroFormaPagamento) {
    setEditando(f);
    setFormAberto(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/financialpaymentmethods/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir forma de pagamento.");
        return;
      }
      toast.success(data.msg ?? "Forma de pagamento excluída.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir forma de pagamento.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Formas de pagamento</h1>
          <p className="text-sm text-muted-foreground">Gerencie as formas de pagamento usadas nos lançamentos financeiros.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNovo}>
          <Plus className="size-4" /> Nova forma de pagamento
        </Button>
      </div>

      <Card className={`overflow-hidden transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.formas_pagamento.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma forma de pagamento cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                dados.formas_pagamento.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm font-medium">{f.name}</TableCell>
                    <TableCell>
                      <Badge variant={f.active ? "outline" : "ghost"} className="text-[11px]">
                        {f.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(f)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluir(f)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PaymentMethodFormDialog open={formAberto} onOpenChange={setFormAberto} forma={editando} onSalvo={() => carregar()} />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir forma de pagamento"
        descricao={`Tem certeza que deseja excluir "${excluir?.name}"? Essa ação pode afetar lançamentos vinculados a esta forma de pagamento.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
