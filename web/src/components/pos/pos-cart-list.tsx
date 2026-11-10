"use client";

import { Pencil, ShoppingBag, Trash2 } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartDetalheGrupo, PosCartItem } from "@/lib/pos";

type GrupoCombo = { titulo: string | null; itens: { qtd: number; nome: string }[] };

/**
 * Composicao do combo agrupada por etapa ("ESCOLHA SEU COPO" / "1x Copo..."). Itens reabertos de um
 * pedido salvo nao tem o titulo da etapa: aparecem so as linhas. A observacao livre (o que sobra em
 * `observacoes` depois das linhas da composicao) vem no fim.
 */
function ComposicaoCombo({ item }: { item: PosCartItem }) {
  const linhas = item.observacoes.split("\n").slice(1);
  const sels = item.combosels ?? [];
  const grupos: GrupoCombo[] = [];
  let obs: string[];
  if (sels.length) {
    for (const s of sels) {
      const titulo = s.passoTitulo ?? null;
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.titulo === titulo) ultimo.itens.push({ qtd: s.qtd, nome: s.nome });
      else grupos.push({ titulo, itens: [{ qtd: s.qtd, nome: s.nome }] });
    }
    obs = linhas.slice(sels.length);
  } else {
    const itens = linhas.filter((l) => /^\d+x\s/.test(l)).map((l) => ({ qtd: Number(l.match(/^\d+/)![0]), nome: l.replace(/^\d+x\s*/, "") }));
    if (itens.length) grupos.push({ titulo: null, itens });
    obs = linhas.filter((l) => !/^\d+x\s/.test(l));
  }
  const obsTexto = obs.join(" ").trim();
  return (
    <div className="mt-1.5 space-y-1.5">
      {grupos.map((g, i) => (
        <div key={i}>
          {g.titulo ? <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{g.titulo}</div> : null}
          {g.itens.map((it, j) => (
            <div key={j} className="text-[11px] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground">{it.qtd}x</span> {it.nome}
            </div>
          ))}
        </div>
      ))}
      {obsTexto ? <div className="text-[11px] text-muted-foreground italic">Obs.: {obsTexto}</div> : null}
    </div>
  );
}

/* Opcoes de um produto (variacoes/complementos) no mesmo formato da composicao do combo. */
function DetalhesItem({ grupos }: { grupos: PosCartDetalheGrupo[] }) {
  return (
    <div className="mt-1.5 space-y-1.5">
      {grupos.map((g, i) => (
        <div key={i}>
          <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{g.titulo}</div>
          {g.itens.map((it, j) => (
            <div key={j} className="flex items-baseline justify-between gap-2 text-[11px] leading-snug text-muted-foreground">
              <span className="min-w-0">
                <span className="font-semibold text-foreground">{it.qtd}x</span> {it.nome}
              </span>
              {it.preco ? <span className="shrink-0 tabular-nums">+ {formatBRL(it.preco)}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PosCartList({
  itens,
  onEditar,
  onRemover,
}: {
  itens: PosCartItem[];
  onEditar: (item: PosCartItem) => void;
  onRemover: (rowKey: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="text-xs font-semibold">Resumo do pedido</div>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          <ShoppingBag className="size-6 text-muted-foreground/40" />
          Nenhum item adicionado
        </div>
      ) : (
        <div className="space-y-2.5">
          {itens.map((item) => (
            <div
              key={item.rowKey}
              role="button"
              tabIndex={0}
              onClick={() => onEditar(item)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onEditar(item);
                }
              }}
              className="cursor-pointer rounded-2xl border bg-card p-3 transition-colors outline-none hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:border-primary/60"
            >
              <div className="flex items-start gap-2.5">
                <span className="shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{item.qtd}x</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="line-clamp-2 text-xs leading-snug font-semibold text-foreground">{item.nomeExibicao ?? item.nome}</div>
                  {item.observacoes.startsWith("[combo]") ? (
                    <ComposicaoCombo item={item} />
                  ) : (
                    <>
                      {item.detalhes?.length ? <DetalhesItem grupos={item.detalhes} /> : null}
                      {item.observacoes ? <div className="mt-1.5 text-[11px] text-muted-foreground italic">Obs.: {item.observacoes}</div> : null}
                    </>
                  )}
                </div>
                <span className="shrink-0 pt-0.5 text-xs font-semibold tabular-nums">{formatBRL(item.preco * item.qtd)}</span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditar(item);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-full border bg-muted/50 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemover(item.rowKey);
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-full bg-red-500/10 px-3 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
