"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { FinanceiroCategoria, FinanceiroCategoriasResposta } from "@/lib/financeiroCategorias";
import { CategoryFormDialog } from "@/components/financialcategories/category-form-dialog";

export function FinancialCategoriesManager({ dadosIniciais }: { dadosIniciais: FinanceiroCategoriasResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<FinanceiroCategoria | null>(null);
  const [excluir, setExcluir] = useState<FinanceiroCategoria | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregar(tipo: string = dados.tipo) {
    setCarregando(true);
    try {
      const qs = tipo ? `?tipo=${tipo}` : "";
      const res = await fetch(`/api/financialcategories${qs}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar categorias.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar categorias.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(c: FinanceiroCategoria) {
    setEditando(c);
    setFormAberto(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/financialcategories/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir categoria.");
        return;
      }
      toast.success(data.msg ?? "Categoria excluída.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir categoria.");
    } finally {
      setExcluindo(false);
    }
  }

  const categoriasRaiz = dados.categorias.filter((c) => c.parent_id === null);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias financeiras</h1>
          <p className="text-sm text-muted-foreground">Organize receitas e despesas por categoria.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNovo}>
          <Plus className="size-4" /> Nova categoria
        </Button>
      </div>

      <Card className="p-4">
        <div className="max-w-xs">
          <Select value={dados.tipo || "all"} onValueChange={(v) => v && carregar(v === "all" ? "" : (v as string))} disabled={carregando}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {() => (dados.tipo === "income" ? "Receita" : dados.tipo === "expense" ? "Despesa" : "Todos os tipos")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className={`overflow-hidden transition-opacity duration-200 ${carregando ? "opacity-60" : ""}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria pai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma categoria encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                dados.categorias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.type === "income" ? "secondary" : "destructive"} className="text-[11px]">
                        {c.type === "income" ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.parent_name ?? "-"}</TableCell>
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

      <CategoryFormDialog
        open={formAberto}
        onOpenChange={setFormAberto}
        categoria={editando}
        categoriasRaiz={categoriasRaiz}
        onSalvo={() => carregar()}
      />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir categoria"
        descricao={`Tem certeza que deseja excluir "${excluir?.name}"? Categorias com lançamentos vinculados não podem ser excluídas.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
