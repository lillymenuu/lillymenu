"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Categoria, Produto } from "@/lib/produtos";
import { ProdutoFormDialog } from "./produto-form-dialog";
import { CategoriasDialog } from "./categorias-dialog";

function formatBRL(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

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
  const [formOpen, setFormOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  const grupos = useMemo(() => {
    const porCategoria = new Map<number | null, Produto[]>();
    for (const p of produtos) {
      const key = p.categoria_id;
      if (!porCategoria.has(key)) porCategoria.set(key, []);
      porCategoria.get(key)!.push(p);
    }
    const ordenados = categorias
      .map((c) => ({ categoria: c, produtos: porCategoria.get(c.id) ?? [] }))
      .filter((g) => g.produtos.length > 0);
    const semCategoria = porCategoria.get(null) ?? [];
    if (semCategoria.length > 0) {
      ordenados.push({ categoria: { id: 0, nome: "Sem categoria", ativo: 1, ordem: null }, produtos: semCategoria });
    }
    return ordenados;
  }, [categorias, produtos]);

  async function toggleAtivo(produto: Produto) {
    await fetch("/api/produtos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: produto.id, ativo: produto.ativo === 1 ? 0 : 1 }),
    });
    router.refresh();
  }

  async function excluir(produto: Produto) {
    if (!confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;
    await fetch("/api/produtos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: produto.id }),
    });
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo da sua loja</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCategoriasOpen(true)}>
            <Settings2 size={15} /> Categorias
          </Button>
          <Button
            onClick={() => {
              setProdutoEditando(null);
              setFormOpen(true);
            }}
          >
            <Plus size={15} /> Novo produto
          </Button>
        </div>
      </div>

      {produtos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Package size={28} />
          <p className="text-sm">Nenhum produto cadastrado ainda.</p>
        </div>
      )}

      {grupos.map(({ categoria, produtos: itens }) => (
        <div key={categoria.id} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{categoria.nome}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((p) => {
              const imagemUrl = p.imagem
                ? p.imagem.startsWith("http")
                  ? p.imagem
                  : `${phpAdminUrl}/${p.imagem}`
                : null;
              const emPromo = Boolean(p.preco_promocional) && p.promo_desativado !== 1;
              return (
                <div key={p.id} className="flex gap-3 rounded-xl border p-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagemUrl} alt={p.nome} className="size-full object-cover" />
                    ) : (
                      <Package size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-sm font-medium">{p.nome}</span>
                      {!p.ativo && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
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
                    <div className="mt-auto flex items-center gap-1 pt-1">
                      <button
                        onClick={() => toggleAtivo(p)}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        {p.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => {
                          setProdutoEditando(p);
                          setFormOpen(true);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => excluir(p)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        aria-label="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <ProdutoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categorias={categorias}
        produto={produtoEditando}
        phpAdminUrl={phpAdminUrl}
      />
      <CategoriasDialog open={categoriasOpen} onOpenChange={setCategoriasOpen} categorias={categorias} />
    </div>
  );
}
