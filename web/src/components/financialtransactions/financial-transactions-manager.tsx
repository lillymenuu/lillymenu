"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataCurta } from "@/components/cliente/types";
import { MESES_LABEL } from "@/lib/financeiroLancamentos";
import type { FinanceiroLancamento, FinanceiroLancamentosResposta } from "@/lib/financeiroLancamentos";
import { TransactionFormDialog } from "@/components/financialtransactions/transaction-form-dialog";

export function FinancialTransactionsManager({ dadosIniciais }: { dadosIniciais: FinanceiroLancamentosResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<FinanceiroLancamento | null>(null);
  const [excluir, setExcluir] = useState<FinanceiroLancamento | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  async function carregar(overrides: Partial<Record<"mes" | "ano" | "tipo" | "categoria_id" | "conta_id" | "page", string | number>> = {}) {
    setCarregando(true);
    try {
      const params = {
        mes: dados.mes,
        ano: dados.ano,
        tipo: dados.tipo,
        categoria_id: dados.categoria_id,
        conta_id: dados.conta_id,
        page: dados.page,
        ...overrides,
      };
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== "" && v !== undefined && v !== null) qs.set(k, String(v));
      });
      const res = await fetch(`/api/financialtransactions?${qs.toString()}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar lançamentos.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar lançamentos.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(l: FinanceiroLancamento) {
    setEditando(l);
    setFormAberto(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/financialtransactions/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir lançamento.");
        return;
      }
      toast.success("Lançamento excluído.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir lançamento.");
    } finally {
      setExcluindo(false);
    }
  }

  async function sincronizarPedidos() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/financialtransactions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "todos" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao sincronizar pedidos.");
        return;
      }
      toast.success(data.msg ?? "Pedidos sincronizados.");
      carregar();
    } catch {
      toast.error("Erro ao sincronizar pedidos.");
    } finally {
      setSincronizando(false);
    }
  }

  const inicio = dados.total === 0 ? 0 : (dados.page - 1) * dados.per_page + 1;
  const fim = Math.min(dados.page * dados.per_page, dados.total);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lançamentos financeiros</h1>
          <p className="text-sm text-muted-foreground">Receitas e despesas da sua loja, mês a mês.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={sincronizarPedidos} disabled={sincronizando}>
            <RefreshCw className={`size-4 ${sincronizando ? "animate-spin" : ""}`} />
            Sincronizar pedidos
          </Button>
          <Button className="gap-1.5" onClick={abrirNovo}>
            <Plus className="size-4" /> Novo lançamento
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Select value={String(dados.mes)} onValueChange={(v) => v && carregar({ mes: v, page: 1 })} disabled={carregando}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => MESES_LABEL[dados.mes] ?? dados.mes}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MESES_LABEL).map(([id, nome]) => (
                <SelectItem key={id} value={id}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(dados.ano)} onValueChange={(v) => v && carregar({ ano: v, page: 1 })} disabled={carregando}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => dados.ano}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {dados.anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dados.tipo || "all"} onValueChange={(v) => carregar({ tipo: v === "all" ? "" : (v as string), page: 1 })} disabled={carregando}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={dados.categoria_id ? String(dados.categoria_id) : "all"}
            onValueChange={(v) => carregar({ categoria_id: v === "all" ? 0 : Number(v), page: 1 })}
            disabled={carregando}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {dados.categorias.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={dados.conta_id ? String(dados.conta_id) : "all"}
            onValueChange={(v) => carregar({ conta_id: v === "all" ? 0 : Number(v), page: 1 })}
            disabled={carregando}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas contas</SelectItem>
              {dados.contas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className={`overflow-hidden transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.lancamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                dados.lancamentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDataCurta(l.transaction_date)}</TableCell>
                    <TableCell>
                      <Badge variant={l.type === "income" ? "secondary" : "destructive"} className="text-[11px]">
                        {l.type === "income" ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-sm">{l.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.category_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.account_name ?? "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.payment_method_name ?? "Não informado"}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${l.type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                      {formatBRL(l.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(l)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluir(l)}>
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
        {dados.total > 0 ? (
          <div className="flex flex-col items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground sm:flex-row">
            <span>
              Mostrando {inicio}-{fim} de {dados.total} lançamentos
            </span>
            {dados.total_paginas > 1 ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={dados.page <= 1 || carregando} onClick={() => carregar({ page: dados.page - 1 })}>
                  Anterior
                </Button>
                <span>
                  Página {dados.page} de {dados.total_paginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={dados.page >= dados.total_paginas || carregando}
                  onClick={() => carregar({ page: dados.page + 1 })}
                >
                  Próxima
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>

      <TransactionFormDialog
        open={formAberto}
        onOpenChange={setFormAberto}
        lancamento={editando}
        categorias={dados.categorias}
        contas={dados.contas}
        formasPagamento={dados.formas_pagamento}
        anos={dados.anos}
        mesAtual={dados.mes}
        anoAtual={dados.ano}
        onSalvo={() => carregar({ page: 1 })}
      />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir lançamento"
        descricao={`Tem certeza que deseja excluir "${excluir?.description}"? Isso também reverte o impacto no saldo da conta.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
