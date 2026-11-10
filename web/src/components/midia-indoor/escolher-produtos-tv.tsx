"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ImageOff, Search } from "lucide-react";
import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { CategoriaEscolhaTv } from "@/lib/midiaIndoor";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/* Modo "Escolher produtos" da TV: categorias que abrem a lista de produtos, cada um com seu checkbox. */
export function EscolherProdutosTv({ selecionados, onChange }: { selecionados: string[]; onChange: (ids: string[]) => void }) {
  const [categorias, setCategorias] = useState<CategoriaEscolhaTv[] | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [abertas, setAbertas] = useState<Set<number>>(new Set());

  useEffect(() => {
    let ativo = true;
    fetch("/api/midia-indoor/itens", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!ativo) return;
        if (data.ok) setCategorias(data.categorias);
        else setErro(true);
      })
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, []);

  const marcados = useMemo(() => new Set(selecionados), [selecionados]);

  const visiveis = useMemo(() => {
    if (!categorias) return [];
    const termo = normalizar(busca.trim());
    if (!termo) return categorias;
    return categorias
      .map((c) => (normalizar(c.nome).includes(termo) ? c : { ...c, itens: c.itens.filter((i) => normalizar(i.nome).includes(termo)) }))
      .filter((c) => c.itens.length > 0);
  }, [categorias, busca]);

  function alternarItem(id: string, marcar: boolean) {
    const novo = new Set(marcados);
    if (marcar) novo.add(id);
    else novo.delete(id);
    onChange([...novo]);
  }

  function alternarCategoria(c: CategoriaEscolhaTv, marcar: boolean) {
    const novo = new Set(marcados);
    for (const i of c.itens) {
      if (marcar) novo.add(i.id);
      else novo.delete(i.id);
    }
    onChange([...novo]);
  }

  function alternarAberta(id: number) {
    setAbertas((a) => {
      const novo = new Set(a);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  if (erro) return <div className="rounded-2xl border border-dashed px-3 py-3 text-xs text-destructive">Não foi possível carregar os produtos.</div>;
  if (!categorias) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }
  if (categorias.length === 0) return <div className="rounded-2xl border border-dashed px-3 py-3 text-xs text-muted-foreground">Nenhum produto ativo cadastrado.</div>;

  const buscando = busca.trim() !== "";

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou categoria" className="h-10 rounded-xl pl-9" />
      </div>

      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-muted-foreground">
          {selecionados.length === 0 ? "Nenhum produto escolhido" : `${selecionados.length} produto(s) escolhido(s)`}
        </span>
        {selecionados.length > 0 && (
          <button type="button" className="text-primary hover:underline" onClick={() => onChange([])}>
            Limpar
          </button>
        )}
      </div>

      {visiveis.length === 0 && <div className="px-1 py-2 text-xs text-muted-foreground">Nada encontrado para “{busca}”.</div>}

      {visiveis.map((c) => {
        const qtdMarcados = c.itens.filter((i) => marcados.has(i.id)).length;
        const todos = qtdMarcados === c.itens.length;
        const aberta = buscando || abertas.has(c.id);
        return (
          <div key={c.id} className="overflow-hidden rounded-2xl border">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Checkbox
                checked={todos}
                indeterminate={qtdMarcados > 0 && !todos}
                className="data-indeterminate:border-primary data-indeterminate:bg-primary/15 data-indeterminate:text-primary"
                onCheckedChange={(v) => alternarCategoria(c, v === true)}
                aria-label={`Marcar todos de ${c.nome}`}
              />
              <button type="button" onClick={() => alternarAberta(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="min-w-0 flex-1 text-sm font-medium break-words">{c.nome}</span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", qtdMarcados > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {qtdMarcados}/{c.itens.length}
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", aberta && "rotate-180")} />
              </button>
            </div>
            {aberta && (
              <div className="grid gap-1 border-t bg-muted/30 p-1.5 sm:grid-cols-2">
                {c.itens.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-background">
                    <Checkbox checked={marcados.has(i.id)} onCheckedChange={(v) => alternarItem(i.id, v === true)} />
                    {i.imagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imagem} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <ImageOff className="size-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[13px] leading-tight">
                        {i.nome}
                        {i.combo && <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">combo</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">{brl.format(i.preco)}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
