"use client";

import { useEffect, useState } from "react";
import { ImageIcon, ShoppingBag } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCrossSellProduto } from "@/lib/store/types";

export function StoreCartSheet({
  open,
  onOpenChange,
  lojaId,
  nomeLoja,
  logoLoja,
  itens,
  subtotal,
  onAtualizarQtd,
  onRemover,
  onAdicionar,
  onFinalizar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: number;
  nomeLoja: string;
  logoLoja: string;
  itens: StoreCartItem[];
  subtotal: number;
  onAtualizarQtd: (key: string, qtd: number) => void;
  onRemover: (key: string) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
  onFinalizar: () => void;
}) {
  const { brown } = useStoreTheme();
  const [sugestoes, setSugestoes] = useState<StoreCrossSellProduto[]>([]);

  useEffect(() => {
    if (!open || itens.length === 0) {
      setSugestoes([]);
      return;
    }
    const idsProdutos = itens.filter((i) => i.tipo === "produto").map((i) => i.id);
    const nomes = itens.map((i) => i.nome);
    const qs = new URLSearchParams({
      loja_id: String(lojaId),
      produtos_ids: idsProdutos.join(","),
      produtos_nomes: JSON.stringify(nomes),
    });
    fetch(`/api/store/cross-sell?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.ativo) setSugestoes(data.produtos as StoreCrossSellProduto[]);
        else setSugestoes([]);
      })
      .catch(() => setSugestoes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lojaId, itens.map((i) => `${i.id}:${i.qtd}`).join(",")]);

  function adicionarSugestao(p: StoreCrossSellProduto) {
    onAdicionar({
      id: p.id,
      tipo: "produto",
      nome: p.nome,
      precoUnit: p.preco,
      qtd: 1,
      obs: "",
      imagem: p.imagem,
      estoqueMax: p.estoque,
    });
  }

  return (
    <StoreSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Meu carrinho"
      onBack={() => onOpenChange(false)}
      rightAction={
        itens.length > 0 ? (
          <button type="button" onClick={() => itens.forEach((i) => onRemover(i.key))} className="text-[.8rem] text-neutral-400">
            Limpar
          </button>
        ) : undefined
      }
      footer={
        itens.length > 0 ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[.72rem] text-neutral-500">Total da compra</p>
              <p className="text-[.98rem] font-bold text-neutral-900">
                {formatarPreco(subtotal)} <span className="text-[.72rem] font-normal text-neutral-500">/ {itens.length} itens</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onFinalizar}
              className="shrink-0 rounded-[10px] px-6 py-3 text-[.86rem] font-bold text-white"
              style={{ background: brown }}
            >
              Continuar
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
            {logoLoja ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoLoja} alt="" className="size-full object-cover" />
            ) : (
              nomeLoja.charAt(0)
            )}
          </div>
          <div>
            <p className="text-[.86rem] font-bold text-neutral-900">{nomeLoja}</p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[.74rem] font-semibold"
              style={{ color: brown }}
            >
              Adicionar mais itens
            </button>
          </div>
        </div>

        {itens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-neutral-300">
            <ShoppingBag size={30} />
            <p className="text-[.86rem] text-neutral-400">Nenhum item adicionado</p>
          </div>
        ) : (
          <>
            <div>
              {itens.map((item) => {
                const grupos = item.combosels
                  ? item.combosels.reduce<Record<string, typeof item.combosels>>((acc, s) => {
                      const chave = s.passoNome ?? "";
                      (acc[chave] ??= []).push(s);
                      return acc;
                    }, {})
                  : null;
                const obsLivre = grupos ? (item.obsUsuario ?? "") : item.obs;

                return (
                  <div key={item.key} className="border-b border-neutral-100 py-3 last:border-0">
                    <div className="flex gap-2.5">
                      <div className="size-[50px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {item.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[.82rem] font-semibold text-neutral-900">{item.nome}</p>
                          <button
                            type="button"
                            onClick={() => onRemover(item.key)}
                            className="shrink-0 text-[.72rem] text-neutral-400 hover:text-red-600"
                          >
                            Remover
                          </button>
                        </div>
                        <p className="mt-0.5 text-[.82rem] font-bold" style={{ color: brown }}>
                          {formatarPreco(item.precoUnit)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <QtyStepper
                          size="sm"
                          value={item.qtd}
                          min={0}
                          max={item.estoqueMax}
                          onChange={(v) => (v <= 0 ? onRemover(item.key) : onAtualizarQtd(item.key, v))}
                        />
                      </div>
                    </div>

                    {grupos &&
                      Object.entries(grupos).map(([passoNome, sels]) => (
                        <div key={passoNome} className="mt-2 pl-[60px]">
                          {passoNome && <p className="text-[.7rem] font-semibold text-neutral-500">{passoNome}</p>}
                          {sels?.map((s) => (
                            <p key={s.id} className="text-[.76rem] text-neutral-600">
                              <span className="mr-1 text-neutral-400">{s.qtd}</span>
                              {s.nome}
                            </p>
                          ))}
                        </div>
                      ))}
                    {obsLivre && <p className="mt-1.5 pl-[60px] text-[.74rem] whitespace-pre-line text-neutral-400">{obsLivre}</p>}
                  </div>
                );
              })}
            </div>

            {sugestoes.length > 0 && (
              <div className="mt-4">
                <p className="mb-2.5 text-[.82rem] font-bold text-neutral-900">Peça também</p>
                <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {sugestoes.map((p) => (
                    <div key={p.id} className="w-[110px] shrink-0 rounded-xl border border-neutral-100 p-2">
                      <div className="relative mb-1.5 h-[68px] w-full overflow-hidden rounded-lg bg-neutral-100">
                        {p.imagem ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagem} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-neutral-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => adicionarSugestao(p)}
                          className="absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-white text-white shadow-sm"
                          style={{ background: brown }}
                        >
                          +
                        </button>
                      </div>
                      <p className="line-clamp-2 text-[.72rem] leading-tight text-neutral-800">{p.nome}</p>
                      <p className="mt-1 text-[.74rem] font-bold text-neutral-900">{formatarPreco(p.preco)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StoreSheet>
  );
}
