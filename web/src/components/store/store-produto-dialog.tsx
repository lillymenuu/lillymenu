"use client";

import { useEffect, useState } from "react";
import { Expand, ImageIcon, Shrink, X } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreProduto, StoreProdutoVariacoes } from "@/lib/store/types";

export function StoreProdutoDialog({
  produto,
  lojaId,
  open,
  onOpenChange,
  onAdicionar,
}: {
  produto: StoreProduto | null;
  lojaId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
}) {
  const { brown } = useStoreTheme();
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [detalhe, setDetalhe] = useState<StoreProdutoVariacoes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [extrasIds, setExtrasIds] = useState<number[]>([]);
  const [complementoId, setComplementoId] = useState<number | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState(false);

  const temVariacoes = produto?.tem_variacoes === 1;

  useEffect(() => {
    if (!open || !produto) return;
    const qtdMin = Math.max(0, produto.quantidade_minima ?? 0);
    setQtd(qtdMin > 0 ? qtdMin : 1);
    setObs("");
    setImagemAmpliada(false);
    setVariacaoId(null);
    setExtrasIds([]);
    setComplementoId(null);
    setDetalhe(null);

    if (produto.tem_variacoes === 1) {
      setCarregando(true);
      fetch(`/api/store/produto-variacoes?produto_id=${produto.id}&loja_id=${lojaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setDetalhe(data as StoreProdutoVariacoes);
        })
        .finally(() => setCarregando(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produto?.id, lojaId]);

  if (!produto) return null;

  const variacaoSelecionada = detalhe?.variacoes.find((v) => v.id === variacaoId) ?? null;
  const extrasSelecionados = detalhe?.extras.filter((e) => extrasIds.includes(e.id)) ?? [];
  const complementoSelecionado = detalhe?.complementos_itens.find((c) => c.id === complementoId) ?? null;

  const precoBase = temVariacoes
    ? variacaoSelecionada
      ? variacaoSelecionada.preco > 0
        ? variacaoSelecionada.preco
        : produto.preco_produto
      : 0
    : produto.preco_final;
  const precoExtras = extrasSelecionados.reduce((s, e) => s + e.preco, 0);
  const precoComplemento = complementoSelecionado?.preco ?? 0;
  const precoUnitario = precoBase + precoExtras + precoComplemento;
  const total = precoUnitario * qtd;

  const faltaVariacao = temVariacoes && !variacaoSelecionada;
  const faltaExtraObrigatorio = temVariacoes && detalhe?.extras_obrigatorio === 1 && extrasIds.length === 0;
  const faltaComplementoObrigatorio =
    temVariacoes && detalhe?.complementos_itens_obrigatorio === 1 && !complementoId;
  const podeAdicionar =
    !produto.esgotado && !carregando && !faltaVariacao && !faltaExtraObrigatorio && !faltaComplementoObrigatorio;

  function alternarExtra(id: number) {
    setExtrasIds((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  function adicionar() {
    if (!produto || !podeAdicionar) return;

    if (!temVariacoes) {
      onAdicionar({ id: produto.id, tipo: "produto", nome: produto.nome, precoUnit: produto.preco_final, qtd, obs: obs.trim() });
    } else if (variacaoSelecionada) {
      const nomeVariacao = [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ");
      const extraLabel = extrasSelecionados.map((e) => ` + ${e.nome}`).join("");
      const complementoLabel = complementoSelecionado ? ` + ${complementoSelecionado.nome}` : "";
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome: `${produto.nome} - ${nomeVariacao}${extraLabel}${complementoLabel}`,
        precoUnit: precoUnitario,
        qtd,
        obs: obs.trim(),
      });
    }

    onOpenChange(false);
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <QtyStepper value={qtd} min={Math.max(1, produto.quantidade_minima ?? 0)} onChange={setQtd} />
      <button
        type="button"
        disabled={!podeAdicionar}
        onClick={adicionar}
        className="flex-1 rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-opacity disabled:opacity-40"
        style={{ background: brown }}
      >
        {produto.esgotado ? "Esgotado" : `Adicionar ${formatarPreco(total)}`}
      </button>
    </div>
  );

  const opcoesConteudo = carregando ? (
    <p className="text-[.86rem] text-neutral-500">Carregando opcoes...</p>
  ) : (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[.86rem] font-bold text-neutral-900">Escolha uma das opcoes</h3>
          <span className="text-[.7rem] font-bold text-red-600">Obrigatorio</span>
        </div>
        <div className="space-y-0">
          {(detalhe?.variacoes ?? []).map((v) => {
            const nome = [v.tamanho, v.cor].filter(Boolean).join(" - ") || "Opcao";
            return (
              <label key={v.id} className="flex cursor-pointer items-center justify-between border-b border-neutral-100 py-3 text-[.86rem]">
                <div>
                  <div className="text-neutral-900">{nome}</div>
                  <div className="text-[.78rem] text-neutral-400">{formatarPreco(v.preco)}</div>
                </div>
                <input
                  type="radio"
                  name="variacao"
                  checked={variacaoId === v.id}
                  onChange={() => setVariacaoId(v.id)}
                  className="size-[18px] accent-current"
                  style={{ color: brown }}
                />
              </label>
            );
          })}
          {detalhe?.variacoes.length === 0 && <p className="py-2 text-[.8rem] text-neutral-400">Sem variacoes cadastradas.</p>}
        </div>
      </div>

      {(detalhe?.extras.length ?? 0) > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[.86rem] font-bold text-neutral-900">Escolha seu extra</h3>
            {detalhe?.extras_obrigatorio === 1 && <span className="text-[.7rem] font-bold text-red-600">Obrigatorio</span>}
          </div>
          <div>
            {detalhe?.extras.map((e) => (
              <label key={e.id} className="flex cursor-pointer items-center justify-between border-b border-neutral-100 py-3 text-[.86rem]">
                <div>
                  <div className="text-neutral-900">{e.nome}</div>
                  <div className="text-[.78rem] text-neutral-400">{formatarPreco(e.preco)}</div>
                </div>
                <input type="checkbox" checked={extrasIds.includes(e.id)} onChange={() => alternarExtra(e.id)} className="size-[18px]" />
              </label>
            ))}
          </div>
        </div>
      )}

      {(detalhe?.complementos_itens.length ?? 0) > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[.86rem] font-bold text-neutral-900">Escolha o tipo</h3>
            {detalhe?.complementos_itens_obrigatorio === 1 && <span className="text-[.7rem] font-bold text-red-600">Obrigatorio</span>}
          </div>
          <div>
            {detalhe?.complementos_itens.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center justify-between border-b border-neutral-100 py-3 text-[.86rem]">
                <div>
                  <div className="text-neutral-900">{c.nome}</div>
                  <div className="text-[.78rem] text-neutral-400">{formatarPreco(c.preco)}</div>
                </div>
                <input
                  type="radio"
                  name="complemento"
                  checked={complementoId === c.id}
                  onChange={() => setComplementoId(c.id)}
                  className="size-[18px]"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const obsField = (
    <div className="mt-5">
      <label className="mb-1.5 block text-[.86rem] font-bold text-neutral-900">Alguma observacao?</label>
      <textarea
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observacoes do cliente"
        rows={2}
        className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-[.84rem] outline-none"
      />
    </div>
  );

  if (temVariacoes) {
    return (
      <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={615}>
        <div className="flex h-full flex-col sm:flex-row">
          <div className="relative h-[220px] shrink-0 bg-neutral-100 sm:h-full sm:w-[300px]">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-neutral-300">
                <ImageIcon size={32} />
              </div>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-600"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="mb-1 text-[1rem] font-bold text-neutral-900">{produto.nome}</h2>
            <p className="mb-4 text-[.86rem] font-semibold text-neutral-900">
              a partir de {formatarPreco(produto.preco_produto)}
            </p>
            {opcoesConteudo}
            {obsField}
          </div>
        </div>
      </StoreSheet>
    );
  }

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={615}>
      <div className="p-4">
        <div
          className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 transition-[height] duration-300 ease-out ${
            imagemAmpliada ? "h-[420px]" : "h-[190px]"
          }`}
        >
          {produto.imagem ? (
            <>
              <button
                type="button"
                onClick={() => setImagemAmpliada((v) => !v)}
                className={`block size-full ${imagemAmpliada ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={produto.imagem}
                  alt=""
                  className={`size-full transition-[object-fit] ${imagemAmpliada ? "object-contain" : "object-cover"}`}
                />
              </button>
              <button
                type="button"
                onClick={() => setImagemAmpliada((v) => !v)}
                className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-[.72rem] font-semibold text-white"
              >
                {imagemAmpliada ? <Shrink size={12} /> : <Expand size={12} />}
                {imagemAmpliada ? "Recolher" : "Ver maior"}
              </button>
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-neutral-300">
              <ImageIcon size={32} />
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 text-neutral-600"
          >
            <X size={14} />
          </button>
        </div>
        <h2 className="mb-1.5 text-[1rem] font-bold text-neutral-900">{produto.nome}</h2>
        {produto.descricao && <p className="mb-2.5 text-[.8rem] leading-relaxed text-neutral-500">{produto.descricao}</p>}
        <div className="mb-3.5">
          {produto.em_promo ? (
            <div className="flex items-center gap-2">
              <span className="text-[.85rem] text-neutral-400 line-through">{formatarPreco(produto.preco_base)}</span>
              <span className="text-[1.05rem] font-bold text-neutral-900">{formatarPreco(produto.preco_final)}</span>
            </div>
          ) : (
            <span className="text-[1.05rem] font-bold text-neutral-900">{formatarPreco(produto.preco_final)}</span>
          )}
        </div>
        {produto.esgotado && <p className="mb-3 text-[.86rem] font-medium text-red-600">Produto esgotado no momento.</p>}
        {obsField}
      </div>
    </StoreSheet>
  );
}
