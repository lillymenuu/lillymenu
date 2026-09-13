"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PosCartItem, PosCatalogoResposta, PosCombo, PosProduto } from "@/lib/pos";
import { PosProdutoCard } from "@/components/pos/pos-produto-card";
import { PosComboCard } from "@/components/pos/pos-combo-card";

const SEM_CATEGORIA = -1;

export function PosCatalog({
  catalogo,
  itensCarrinho,
  onAdicionarProduto,
  onAlterarQtdProduto,
  onAbrirCombo,
  onAbrirAvulso,
}: {
  catalogo: PosCatalogoResposta;
  itensCarrinho: PosCartItem[];
  onAdicionarProduto: (produto: PosProduto) => void;
  onAlterarQtdProduto: (produto: PosProduto, delta: number) => void;
  onAbrirCombo: (combo: PosCombo) => void;
  onAbrirAvulso: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<number>(catalogo.categorias[0]?.id ?? SEM_CATEGORIA);
  const scrollRef = useRef<HTMLDivElement>(null);
  const secaoRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const ignorarScrollSpy = useRef(false);

  const termo = busca.trim().toLowerCase();

  const qtdPorProduto = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itensCarrinho) {
      if (item.produtoId === null) continue;
      map[item.produtoId] = (map[item.produtoId] ?? 0) + item.qtd;
    }
    return map;
  }, [itensCarrinho]);

  const qtdPorCombo = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itensCarrinho) {
      if (!item.comboId) continue;
      map[item.comboId] = (map[item.comboId] ?? 0) + item.qtd;
    }
    return map;
  }, [itensCarrinho]);

  const secoes = useMemo(() => {
    const grupos = catalogo.categorias.map((cat) => ({
      categoria: cat,
      produtos: catalogo.produtos.filter((p) => p.categoria_id === cat.id),
      combos: catalogo.combos.filter((c) => c.categoria_id === cat.id),
    }));
    const semCategoria = {
      categoria: { id: SEM_CATEGORIA, nome: "Sem categoria" },
      produtos: catalogo.produtos.filter((p) => p.categoria_id === null),
      combos: catalogo.combos.filter((c) => c.categoria_id === null),
    };
    const todas = semCategoria.produtos.length + semCategoria.combos.length > 0 ? [...grupos, semCategoria] : grupos;

    if (!termo) return todas.filter((g) => g.produtos.length + g.combos.length > 0);

    return todas
      .map((g) => ({
        ...g,
        produtos: g.produtos.filter((p) => p.nome.toLowerCase().includes(termo)),
        combos: g.combos.filter((c) => c.nome.toLowerCase().includes(termo)),
      }))
      .filter((g) => g.produtos.length + g.combos.length > 0);
  }, [catalogo, termo]);

  function irParaSecao(categoriaId: number) {
    setCategoriaAtiva(categoriaId);
    const el = secaoRefs.current[categoriaId];
    if (el && scrollRef.current) {
      ignorarScrollSpy.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => (ignorarScrollSpy.current = false), 600);
    }
  }

  function onScroll() {
    if (ignorarScrollSpy.current || !scrollRef.current) return;
    const containerTop = scrollRef.current.getBoundingClientRect().top;
    let atual: number | null = null;
    for (const secao of secoes) {
      const el = secaoRefs.current[secao.categoria.id];
      if (!el) continue;
      const top = el.getBoundingClientRect().top - containerTop;
      if (top <= 80) atual = secao.categoria.id;
    }
    if (atual !== null && atual !== categoriaAtiva) setCategoriaAtiva(atual);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto pb-1">
        {secoes.map((s) => (
          <button
            key={s.categoria.id}
            type="button"
            onClick={() => irParaSecao(s.categoria.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              categoriaAtiva === s.categoria.id
                ? "bg-primary text-primary-foreground"
                : "border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {s.categoria.nome}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou código"
            className="h-10 rounded-xl bg-muted/40 pl-9 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onAbrirAvulso}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" /> Item avulso
        </button>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {secoes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
        ) : (
          secoes.map((s) => (
            <div key={s.categoria.id} ref={(el) => void (secaoRefs.current[s.categoria.id] = el)}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{s.categoria.nome}</h3>
              <div className="flex max-w-[758px] flex-wrap gap-2.5">
                {s.combos.map((c) => (
                  <PosComboCard key={`combo-${c.id}`} combo={c} qtd={qtdPorCombo[c.id] ?? 0} onAbrir={onAbrirCombo} />
                ))}
                {s.produtos.map((p) => (
                  <PosProdutoCard
                    key={`produto-${p.id}`}
                    produto={p}
                    qtd={qtdPorProduto[p.id] ?? 0}
                    onAdicionar={onAdicionarProduto}
                    onAlterarQtd={(delta) => onAlterarQtdProduto(p, delta)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
