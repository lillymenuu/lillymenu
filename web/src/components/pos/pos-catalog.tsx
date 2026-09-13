"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PosCatalogoResposta, PosCombo, PosProduto } from "@/lib/pos";
import { PosProdutoCard } from "@/components/pos/pos-produto-card";
import { PosComboCard } from "@/components/pos/pos-combo-card";

export function PosCatalog({
  catalogo,
  onAdicionarProduto,
  onAbrirCombo,
}: {
  catalogo: PosCatalogoResposta;
  onAdicionarProduto: (produto: PosProduto) => void;
  onAbrirCombo: (combo: PosCombo) => void;
}) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | "todos">("todos");
  const [busca, setBusca] = useState("");

  const termo = busca.trim().toLowerCase();

  const produtosFiltrados = useMemo(() => {
    return catalogo.produtos.filter((p) => {
      if (categoriaAtiva !== "todos" && p.categoria_id !== categoriaAtiva) return false;
      if (termo && !p.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [catalogo.produtos, categoriaAtiva, termo]);

  const combosFiltrados = useMemo(() => {
    return catalogo.combos.filter((c) => {
      if (categoriaAtiva !== "todos" && c.categoria_id !== categoriaAtiva) return false;
      if (termo && !c.nome.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [catalogo.combos, categoriaAtiva, termo]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="h-11 rounded-xl pl-9 text-sm"
          autoFocus
        />
      </div>

      <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCategoriaAtiva("todos")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            categoriaAtiva === "todos" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Todos
        </button>
        {catalogo.categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoriaAtiva(c.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              categoriaAtiva === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {produtosFiltrados.length === 0 && combosFiltrados.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 pb-2 sm:grid-cols-3 lg:grid-cols-4">
            {combosFiltrados.map((c) => (
              <PosComboCard key={`combo-${c.id}`} combo={c} onAbrir={onAbrirCombo} />
            ))}
            {produtosFiltrados.map((p) => (
              <PosProdutoCard key={`produto-${p.id}`} produto={p} onAdicionar={onAdicionarProduto} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
