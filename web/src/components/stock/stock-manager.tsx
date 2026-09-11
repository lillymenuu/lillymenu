"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstoqueDialog } from "@/components/produtos/estoque-dialog";
import { AdicionarEstoqueDialog } from "./adicionar-estoque-dialog";
import type { EstoqueItem } from "@/lib/estoque";
import { cn } from "cn";

const ORDENAR_ITEMS: Record<string, string> = {
  quantidade_desc: "Quantidade de itens",
  quantidade_asc: "Menor quantidade",
  nome_asc: "Nome A-Z",
  nome_desc: "Nome Z-A",
};

function ordenar(lista: EstoqueItem[], criterio: string): EstoqueItem[] {
  const copia = [...lista];
  switch (criterio) {
    case "quantidade_asc":
      return copia.sort((a, b) => a.quantidade - b.quantidade);
    case "nome_desc":
      return copia.sort((a, b) => b.nome.localeCompare(a.nome));
    case "nome_asc":
      return copia.sort((a, b) => a.nome.localeCompare(b.nome));
    case "quantidade_desc":
    default:
      return copia.sort((a, b) => b.quantidade - a.quantidade);
  }
}

export function StockManager({
  itensIniciais,
  phpAdminUrl,
}: {
  itensIniciais: EstoqueItem[];
  phpAdminUrl: string;
}) {
  const [itens, setItens] = useState(itensIniciais);
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState("quantidade_desc");
  const [produtoEditando, setProdutoEditando] = useState<number | null>(null);
  const [adicionarOpen, setAdicionarOpen] = useState(false);

  const pausadoRef = useRef(false);

  async function atualizar() {
    if (pausadoRef.current) return;
    try {
      const res = await fetch("/api/stock/listar", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setItens(data.itens);
    } catch {
      // silencioso — proxima tentativa do polling corrige sozinha
    }
  }

  useEffect(() => {
    const id = setInterval(atualizar, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    pausadoRef.current = produtoEditando !== null || adicionarOpen;
  }, [produtoEditando, adicionarOpen]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrada = termo ? itens.filter((i) => i.nome.toLowerCase().includes(termo)) : itens;
    return ordenar(filtrada, ordenarPor);
  }, [itens, busca, ordenarPor]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Estoque</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Você poderá cadastrar os produtos no seu estoque e a quantidade do(s) item(s) será
            decrementada a cada pedido feito se o produto(s) do pedido estiver no estoque.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdicionarOpen(true)}>
          <Plus size={14} /> Adicionar
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <div className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">
            Buscar item de estoque
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              className="pl-8"
              placeholder="Pesquise pelo nome do item"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase">Ordenar por</span>
          <Select items={ORDENAR_ITEMS} value={ordenarPor} onValueChange={(v) => setOrdenarPor(v ?? "quantidade_desc")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORDENAR_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {listaFiltrada.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {listaFiltrada.map((item) => {
            const emEstoque = item.quantidade > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setProdutoEditando(item.id)}
                className="flex min-h-[120px] flex-col gap-2.5 rounded-2xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  className={cn(
                    "w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    emEstoque ? "bg-emerald-600 text-white" : "bg-destructive/10 text-destructive"
                  )}
                >
                  {emEstoque ? "Em estoque" : "Sem estoque"}
                </span>
                <span className="font-semibold">{item.nome}</span>
                <div className="flex items-baseline gap-1.5">
                  <strong className="text-2xl">{item.quantidade}</strong>
                  <span className="text-sm text-muted-foreground">
                    {item.quantidade === 1 ? "unidade" : "unidades"}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Boxes size={11} /> em estoque
                </span>
              </button>
            );
          })}
        </div>
      )}

      <EstoqueDialog
        open={produtoEditando !== null}
        onOpenChange={(v) => !v && setProdutoEditando(null)}
        produtoId={produtoEditando}
        phpAdminUrl={phpAdminUrl}
        onSaved={(novaQuantidade) => {
          if (produtoEditando === null) return;
          setItens((atual) =>
            atual.map((i) => (i.id === produtoEditando ? { ...i, quantidade: novaQuantidade } : i))
          );
        }}
        onDeleted={() => {
          if (produtoEditando === null) return;
          setItens((atual) =>
            atual.map((i) => (i.id === produtoEditando ? { ...i, quantidade: 0 } : i))
          );
        }}
      />

      <AdicionarEstoqueDialog
        open={adicionarOpen}
        onOpenChange={setAdicionarOpen}
        itens={itens}
        onConfirmar={(produtoId) => setProdutoEditando(produtoId)}
      />
    </div>
  );
}
