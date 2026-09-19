"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Layers, Plus, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCategoria, StoreCombo, StoreProduto } from "@/lib/store/types";

type CategoriaComItens = { cat: StoreCategoria; produtos: StoreProduto[]; combos: StoreCombo[] };

/** Minusculas e sem acento, pra "pave" achar "Pavê". */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Busca do cardapio: modal em tela cheia listando os itens por categoria, filtrados enquanto digita. */
export function StoreBuscaModal({
  open,
  onOpenChange,
  nomeLoja,
  categorias,
  mostrarPontos,
  onSelecionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nomeLoja: string;
  categorias: CategoriaComItens[];
  mostrarPontos: boolean;
  onSelecionar: (item: StoreProduto | StoreCombo) => void;
}) {
  const { brown } = useStoreTheme();
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca.trim());
  const resultado = useMemo(() => {
    if (!termo) return categorias;
    const casa = (i: { nome: string; descricao: string | null }) =>
      normalizar(`${i.nome} ${i.descricao ?? ""}`).includes(termo);
    return categorias
      .map((c) => ({ ...c, produtos: c.produtos.filter(casa), combos: c.combos.filter(casa) }))
      .filter((c) => c.produtos.length > 0 || c.combos.length > 0);
  }, [categorias, termo]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      /* Limpa a busca so depois da animacao de saida, senao a lista "pula" enquanto o modal some. */
      onOpenChangeComplete={(aberto) => {
        if (!aberto) setBusca("");
      }}
    >
      <DialogContent
        showCloseButton={false}
        style={{ maxWidth: 901 }}
        className="top-0 left-1/2 flex h-dvh w-full -translate-x-1/2 translate-y-0 flex-col gap-0 rounded-none bg-white p-0 duration-300 ease-out data-open:slide-in-from-bottom-10 data-closed:slide-out-to-bottom-10 data-closed:duration-250 sm:top-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3">
          <DialogTitle className="truncate text-[1.05rem] font-semibold text-neutral-900">Buscar em {nomeLoja}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar busca"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="shrink-0 px-5 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-neutral-100 px-3.5 py-3 focus-within:ring-2 focus-within:ring-neutral-300">
            <Search size={18} className="shrink-0 text-neutral-500" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="O que você procura?"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-neutral-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          {resultado.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-16 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                <Search size={22} />
              </div>
              <p className="text-[.9rem] font-semibold text-neutral-700">Nenhum item encontrado</p>
              <p className="mt-1 text-[.78rem] text-neutral-400">Tente buscar por outro nome.</p>
            </div>
          ) : (
            resultado.map(({ cat, produtos, combos }) => (
              <section key={cat.id} className="mt-4">
                <h2 className="border-b border-neutral-100 pb-2 text-[1.15rem] font-semibold text-neutral-800">{cat.nome}</h2>
                <div className="divide-y divide-neutral-100">
                  {combos.map((combo) => (
                    <LinhaItem
                      key={`combo-${combo.id}`}
                      nome={combo.nome}
                      descricao={combo.descricao}
                      imagem={combo.imagem}
                      preco={formatarPreco(combo.preco_final)}
                      precoRiscado={combo.em_promo ? formatarPreco(combo.preco_base) : null}
                      combo
                      cor={brown}
                      onClick={() => onSelecionar(combo)}
                    />
                  ))}
                  {produtos.map((p) => (
                    <LinhaItem
                      key={`produto-${p.id}`}
                      nome={p.nome}
                      descricao={p.descricao}
                      imagem={p.imagem}
                      preco={`${p.tem_variacoes === 1 && !p.em_promo ? "a partir de " : ""}${formatarPreco(p.preco_final)}`}
                      precoRiscado={p.em_promo ? formatarPreco(p.preco_base) : null}
                      pontos={mostrarPontos && (p.pontos_ganho ?? 0) > 0 ? (p.pontos_ganho ?? 0) : 0}
                      esgotado={p.esgotado}
                      cor={brown}
                      onClick={() => onSelecionar(p)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinhaItem({
  nome,
  descricao,
  imagem,
  preco,
  precoRiscado,
  pontos = 0,
  esgotado = false,
  combo = false,
  cor,
  onClick,
}: {
  nome: string;
  descricao: string | null;
  imagem: string;
  preco: string;
  precoRiscado: string | null;
  pontos?: number;
  esgotado?: boolean;
  combo?: boolean;
  cor: string;
  onClick: () => void;
}) {
  return (
    <div className="py-2.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-xl border border-neutral-200/70 p-3 text-left transition-shadow hover:shadow-sm ${esgotado ? "opacity-70" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <span className="text-[.9rem] font-semibold text-neutral-900">{nome}</span>
            {combo && (
              <span className="rounded bg-amber-500 px-1.5 py-px text-[.6rem] font-bold tracking-wide text-white uppercase">
                Combo
              </span>
            )}
          </div>
          {descricao && <p className="mb-1.5 line-clamp-2 text-[.76rem] leading-snug text-neutral-500">{descricao}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            {precoRiscado && <span className="text-[.74rem] text-neutral-400 line-through">{precoRiscado}</span>}
            <span className="text-[.88rem] font-medium text-neutral-800">{preco}</span>
            {pontos > 0 && (
              <span className="rounded-full bg-purple-700 px-1.5 py-px text-[.66rem] font-bold text-white">+{pontos} pts</span>
            )}
            {esgotado && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[.66rem] font-bold text-white">Esgotado</span>
            )}
          </div>
        </div>
        <div className="relative size-[100px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          {imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagem} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              {combo ? <Layers size={26} /> : <ImageIcon size={26} />}
            </div>
          )}
          {!esgotado && (
            <span
              className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-white shadow-md"
              style={{ color: cor }}
            >
              <Plus size={16} />
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
