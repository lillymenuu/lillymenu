"use client";

import { useMemo, useRef, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import type { PosCartItem, PosCatalogoResposta, PosCombo, PosProduto } from "@/lib/pos";
import { PosProdutoCard } from "@/components/pos/pos-produto-card";
import { PosComboCard } from "@/components/pos/pos-combo-card";
import { consumoDoCarrinho, estoqueRestanteProduto } from "@/components/pos/estoque-carrinho";

const SEM_CATEGORIA = -1;

export function PosCatalog({
  catalogo,
  itensCarrinho,
  onAdicionarProduto,
  onAlterarQtdProduto,
  onDefinirQtdProduto,
  onAbrirCombo,
  onAbrirAvulso,
}: {
  catalogo: PosCatalogoResposta;
  itensCarrinho: PosCartItem[];
  onAdicionarProduto: (produto: PosProduto) => void;
  onAlterarQtdProduto: (produto: PosProduto, delta: number) => void;
  onDefinirQtdProduto: (produto: PosProduto, qtd: number) => void;
  onAbrirCombo: (combo: PosCombo) => void;
  onAbrirAvulso: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<number>(catalogo.categorias[0]?.id ?? SEM_CATEGORIA);
  const scrollRef = useRef<HTMLDivElement>(null);
  const secaoRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const ignorarScrollSpy = useRef(false);
  const categoriasScrollRef = useRef<HTMLDivElement>(null);

  const termo = busca.trim().toLowerCase();

  const qtdPorProduto = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itensCarrinho) {
      if (item.produtoId === null) continue;
      map[item.produtoId] = (map[item.produtoId] ?? 0) + item.qtd;
    }
    return map;
  }, [itensCarrinho]);

  // Saldo restante de cada produto = estoque - o que o carrinho ja consome (linhas de produto/variacao e
  // componentes de combo; produtos do mesmo grupo de estoque dividem o saldo).
  const estoqueRestantePorProduto = useMemo(() => {
    const consumo = consumoDoCarrinho(itensCarrinho);
    const map: Record<number, number> = {};
    for (const p of catalogo.produtos) map[p.id] = estoqueRestanteProduto(p, catalogo.produtos, consumo);
    return map;
  }, [catalogo.produtos, itensCarrinho]);

  const qtdPorCombo = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itensCarrinho) {
      if (!item.comboId) continue;
      map[item.comboId] = (map[item.comboId] ?? 0) + item.qtd;
    }
    return map;
  }, [itensCarrinho]);

  const secoes = useMemo(() => {
    // Produtos sem estoque ficam fora da grade de compra (mesma regra de
    // antes, so que aplicada aqui em vez de no servidor — o catalogo
    // completo, incluindo zerados, precisa continuar disponivel pro resto
    // do POS, ex.: restaurar foto/estoque de um item ao editar um pedido
    // existente que inclua um produto atualmente sem estoque).
    const produtosDisponiveis = catalogo.produtos.filter((p) => p.estoque > 0);
    const grupos = catalogo.categorias.map((cat) => ({
      categoria: cat,
      produtos: produtosDisponiveis.filter((p) => p.categoria_id === cat.id),
      combos: catalogo.combos.filter((c) => c.categoria_id === cat.id),
    }));
    const semCategoria = {
      categoria: { id: SEM_CATEGORIA, nome: "Sem categoria" },
      produtos: produtosDisponiveis.filter((p) => p.categoria_id === null),
      combos: catalogo.combos.filter((c) => c.categoria_id === null),
    };
    const todas = semCategoria.produtos.length + semCategoria.combos.length > 0 ? [...grupos, semCategoria] : grupos;

    if (!termo) return todas.filter((g) => g.produtos.length + g.combos.length > 0);

    return todas
      .map((g) => ({
        ...g,
        produtos: g.produtos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.codigo ?? "").toLowerCase().includes(termo)),
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

  function rolarCategorias(dir: number) {
    categoriasScrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }

  function onScroll() {
    if (!scrollRef.current) return;
    setMostrarTopo(scrollRef.current.scrollTop > 300);
    if (ignorarScrollSpy.current) return;
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

  function irParaTopo() {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative min-w-0 shrink-0">
        <div ref={categoriasScrollRef} className="scrollbar-none flex gap-1.5 overflow-x-auto px-8 pb-1">
          {secoes.map((s) => (
            <button
              key={s.categoria.id}
              type="button"
              onClick={() => irParaSecao(s.categoria.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                categoriaAtiva === s.categoria.id
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background text-primary hover:bg-primary/5"
              }`}
            >
              {s.categoria.nome}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => rolarCategorias(-1)}
          className="absolute top-0 left-0 flex h-[calc(100%-4px)] w-7 items-center justify-center bg-gradient-to-r from-background via-background/90 to-transparent text-muted-foreground"
          aria-label="Categorias anteriores"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => rolarCategorias(1)}
          className="absolute top-0 right-0 flex h-[calc(100%-4px)] w-7 items-center justify-center bg-gradient-to-l from-background via-background/90 to-transparent text-muted-foreground"
          aria-label="Próximas categorias"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou código"
            className="h-8 rounded-full bg-muted/40 pl-8 text-xs"
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

      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full space-y-5 overflow-y-auto pr-1">
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
                      estoqueRestante={estoqueRestantePorProduto[p.id] ?? p.estoque}
                      onAdicionar={onAdicionarProduto}
                      onAlterarQtd={(delta) => onAlterarQtdProduto(p, delta)}
                      onDefinirQtd={(qtd) => onDefinirQtdProduto(p, qtd)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={irParaTopo}
          aria-label="Voltar ao topo dos produtos"
          title="Voltar ao topo"
          tabIndex={mostrarTopo ? 0 : -1}
          className={cn(
            "absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            mostrarTopo ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          )}
        >
          <Rocket className="size-4.5" />
        </button>
      </div>
    </div>
  );
}
