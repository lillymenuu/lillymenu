"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ListOrdered,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Categoria, Produto } from "@/lib/produtos";
import { ProdutoFormDialog } from "./produto-form-dialog";
import { CriarCategoriaDialog } from "./criar-categoria-dialog";
import { ReordenarCategoriasDialog } from "./reordenar-categorias-dialog";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

const SEM_CATEGORIA: Categoria = { id: 0, nome: "Sem categoria", ativo: 1, ordem: null };

export function ProdutosManager({
  categorias,
  produtos,
  phpAdminUrl,
}: {
  categorias: Categoria[];
  produtos: Produto[];
  phpAdminUrl: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [somentePromo, setSomentePromo] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [reordenarOpen, setReordenarOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaParaNovoProduto, setCategoriaParaNovoProduto] = useState<number | null>(null);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      if (somentePromo) {
        const emPromo = Boolean(p.preco_promocional) && p.promo_desativado !== 1;
        if (!emPromo) return false;
      }
      if (termo) {
        const alvo = `${p.nome} ${p.codigo ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [produtos, busca, somentePromo]);

  const grupos = useMemo(() => {
    const porCategoria = new Map<number | null, Produto[]>();
    for (const p of produtosFiltrados) {
      const key = p.categoria_id;
      if (!porCategoria.has(key)) porCategoria.set(key, []);
      porCategoria.get(key)!.push(p);
    }
    const ordenados = categorias
      .map((c) => ({ categoria: c, produtos: porCategoria.get(c.id) ?? [] }))
      .filter((g) => g.produtos.length > 0 || (!busca && !somentePromo));
    const semCategoria = porCategoria.get(null) ?? [];
    if (semCategoria.length > 0) {
      ordenados.push({ categoria: SEM_CATEGORIA, produtos: semCategoria });
    }
    return ordenados;
  }, [categorias, produtosFiltrados, busca, somentePromo]);

  function abrirNovoProduto(categoriaId?: number) {
    setProdutoEditando(null);
    setCategoriaParaNovoProduto(categoriaId ?? null);
    setFormOpen(true);
  }

  async function toggleAtivoProduto(produto: Produto) {
    await fetch("/api/produtos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: produto.id, ativo: produto.ativo === 1 ? 0 : 1 }),
    });
    router.refresh();
  }

  async function toggleAtivoCategoria(cat: Categoria) {
    await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, nome: cat.nome, ativo: cat.ativo === 1 ? 0 : 1, modo_exibicao: cat.modo_exibicao }),
    });
    router.refresh();
  }

  async function excluirCategoria(cat: Categoria) {
    if (!confirm(`Excluir a categoria "${cat.nome}"? Os produtos dela ficam sem categoria.`)) return;
    await fetch("/api/categorias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Aqui você cadastra e gerencia seus produtos e categorias</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setReordenarOpen(true)}>
            <ListOrdered size={15} /> Reordenar categorias
          </Button>
          <Button
            onClick={() => {
              setCategoriaEditando(null);
              setCategoriaDialogOpen(true);
            }}
          >
            <Plus size={15} /> Adicionar categoria
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <label htmlFor="busca-produto" className="text-sm font-medium">
            Buscar produto
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input
              id="busca-produto"
              className="bg-background pl-8"
              placeholder="Buscar por nome ou código do produto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={somentePromo} onCheckedChange={(v) => setSomentePromo(v === true)} />
          <span className="text-sm">Somente promo</span>
        </div>
      </div>

      {produtos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Package size={28} />
          <p className="text-sm">Nenhum produto cadastrado ainda.</p>
        </div>
      )}

      {grupos.map(({ categoria, produtos: itens }) => {
        const isSemCategoria = categoria.id === 0;
        return (
          <div key={categoria.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold">{categoria.nome}</h2>
                {!isSemCategoria && (
                  <>
                    <span
                      className={
                        categoria.ativo === 1
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {categoria.ativo === 1 ? "ativa" : "pausada"}
                    </span>
                    <Switch checked={categoria.ativo === 1} onCheckedChange={() => toggleAtivoCategoria(categoria)} />
                  </>
                )}
              </div>
              {!isSemCategoria && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={() => abrirNovoProduto(categoria.id)}>
                    <Plus size={14} /> Adicionar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="sm">
                          <MoreVertical size={14} /> Opções
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setCategoriaEditando(categoria);
                          setCategoriaDialogOpen(true);
                        }}
                      >
                        Editar categoria
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button
                    onClick={() => excluirCategoria(categoria)}
                    className="rounded-md border p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Excluir categoria"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria ainda.</p>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {itens.map((p) => {
                  const imagemUrl = p.imagem
                    ? p.imagem.startsWith("http")
                      ? p.imagem
                      : `${phpAdminUrl}/${p.imagem}`
                    : null;
                  const emPromo = Boolean(p.preco_promocional) && p.promo_desativado !== 1;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setProdutoEditando(p);
                        setCategoriaParaNovoProduto(null);
                        setFormOpen(true);
                      }}
                      className="flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                    >
                      <div className="aspect-[4/3] w-full bg-muted">
                        {imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imagemUrl} alt={p.nome} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Package size={24} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 p-3">
                        <span className="truncate text-sm font-medium">{p.nome}</span>
                        {p.estoque_quantidade > 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 size={12} /> {p.estoque_quantidade} em estoque
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-sm">
                          {emPromo ? (
                            <>
                              <span className="text-muted-foreground line-through">{formatBRL(p.preco_base)}</span>
                              <span className="font-semibold text-primary">{formatBRL(p.preco_promocional!)}</span>
                            </>
                          ) : (
                            <span className="font-semibold">{formatBRL(p.preco_base)}</span>
                          )}
                        </div>
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <Switch checked={p.ativo === 1} onCheckedChange={() => toggleAtivoProduto(p)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <ProdutoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categorias={categorias}
        produto={produtoEditando}
        categoriaPadrao={categoriaParaNovoProduto}
        phpAdminUrl={phpAdminUrl}
      />
      <CriarCategoriaDialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen} categoria={categoriaEditando} />
      <ReordenarCategoriasDialog open={reordenarOpen} onOpenChange={setReordenarOpen} categorias={categorias} />
    </div>
  );
}
