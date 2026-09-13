"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import type { FinanceiroConta, FinanceiroContasResposta } from "@/lib/financeiroContas";
import { AccountFormDialog } from "@/components/financialaccounts/account-form-dialog";

export function FinancialAccountsManager({ dadosIniciais }: { dadosIniciais: FinanceiroContasResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<FinanceiroConta | null>(null);
  const [excluir, setExcluir] = useState<FinanceiroConta | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/financialaccounts");
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar contas.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar contas.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(c: FinanceiroConta) {
    setEditando(c);
    setFormAberto(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/financialaccounts/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir conta.");
        return;
      }
      toast.success(data.msg ?? "Conta excluída.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir conta.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contas financeiras</h1>
          <p className="text-sm text-muted-foreground">Controle as contas de banco, caixa e carteiras da operação.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNovo}>
          <Plus className="size-4" /> Nova conta
        </Button>
      </div>

      <Card className={`overflow-hidden transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.contas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma conta cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                dados.contas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatBRL(c.initial_balance)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{formatBRL(c.current_balance)}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "outline" : "ghost"} className="text-[11px]">
                        {c.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluir(c)}>
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

      <AccountFormDialog open={formAberto} onOpenChange={setFormAberto} conta={editando} onSalvo={() => carregar()} />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir conta"
        descricao={`Tem certeza que deseja excluir "${excluir?.name}"? Contas com lançamentos vinculados não podem ser excluídas.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
