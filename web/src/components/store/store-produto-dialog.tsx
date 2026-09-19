"use client";

import { useEffect, useState } from "react";
import { Check, Expand, ImageIcon, Plus, Shrink, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  const [erroCarregar, setErroCarregar] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const temVariacoes = produto?.tem_variacoes === 1;

  useEffect(() => {
    if (!open || !produto) return;
    const qtdMin = Math.max(0, produto.quantidade_minima ?? 0);
    setQtd(qtdMin > 0 ? qtdMin : 1);
    setObs("");
    setImagemAmpliada(false);
    setAspectRatio(null);
    setVariacaoId(null);
    setExtrasIds([]);
    setComplementoId(null);
    setDetalhe(null);
    setErroCarregar(false);

    if (produto.tem_variacoes === 1) {
      setCarregando(true);
      fetch(`/api/store/produto-variacoes?produto_id=${produto.id}&loja_id=${lojaId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) setDetalhe(data as StoreProdutoVariacoes);
          else setErroCarregar(true);
        })
        .catch(() => setErroCarregar(true))
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
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome: produto.nome,
        precoUnit: produto.preco_final,
        qtd,
        obs: obs.trim(),
        imagem: produto.imagem,
        estoqueMax: produto.estoque,
      });
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
        imagem: produto.imagem,
      });
    }

    onOpenChange(false);
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <QtyStepper
        value={qtd}
        min={Math.max(1, produto.quantidade_minima ?? 0)}
        max={!temVariacoes ? produto.estoque : undefined}
        onChange={setQtd}
      />
      <button
        type="button"
        disabled={!podeAdicionar}
        onClick={adicionar}
        className="flex-1 rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
        style={{ background: podeAdicionar ? brown : temVariacoes ? "#a3a3a3" : "#c0a88a" }}
      >
        {produto.esgotado
          ? "Esgotado"
          : faltaVariacao
            ? "Selecionar variação"
            : `Adicionar ${formatarPreco(total)}`}
      </button>
    </div>
  );

  const opcoesConteudo = carregando ? (
    <p className="text-[.86rem] text-neutral-500">Carregando opções...</p>
  ) : erroCarregar ? (
    <p className="text-[.86rem] text-red-600">Não foi possível carregar as opções. Feche e tente novamente.</p>
  ) : (
    <>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[.86rem] font-bold text-neutral-900">Escolha uma das opções</h3>
          {(detalhe?.variacoes.length ?? 0) > 0 && <span className="text-[.72rem] font-bold text-red-500">Obrigatório</span>}
        </div>
        <div>
          {(detalhe?.variacoes ?? []).map((v) => {
            const nome = [v.tamanho, v.cor].filter(Boolean).join(" - ") || "Opção";
            return (
              <label
                key={v.id}
                className="flex cursor-pointer items-center justify-between gap-3 border-t border-neutral-100 py-3 first:border-t-0"
              >
                <div className="text-base text-neutral-900">
                  {nome}
                  <small className="mt-0.5 block text-[.8rem] font-semibold text-neutral-400">{formatarPreco(v.preco)}</small>
                </div>
                <input
                  type="radio"
                  name="variacao"
                  checked={variacaoId === v.id}
                  onChange={() => setVariacaoId(v.id)}
                  className="size-[18px] shrink-0"
                  style={{ accentColor: brown }}
                />
              </label>
            );
          })}
          {detalhe?.variacoes.length === 0 && <p className="py-2 text-[.8rem] text-neutral-400">Sem variações cadastradas.</p>}
        </div>
      </div>

      {(detalhe?.extras.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[.86rem] font-bold text-neutral-900 uppercase">Escolha seu extra</h3>
            {detalhe?.extras_obrigatorio === 1 && <span className="text-[.72rem] font-bold text-red-500">Obrigatório</span>}
          </div>
          <p className="mb-1.5 text-[.74rem] text-neutral-500">Escolha 1 opção.</p>
          {detalhe?.extras.map((e) => (
            <OpcaoExtra
              key={e.id}
              nome={e.nome}
              preco={e.preco}
              ativo={extrasIds.includes(e.id)}
              cor={brown}
              onClick={() => alternarExtra(e.id)}
            />
          ))}
        </div>
      )}

      {(detalhe?.complementos_itens.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[.86rem] font-bold text-neutral-900 uppercase">Escolha o tipo</h3>
            {detalhe?.complementos_itens_obrigatorio === 1 && (
              <span className="text-[.72rem] font-bold text-red-500">Obrigatório</span>
            )}
          </div>
          <p className="mb-1.5 text-[.74rem] text-neutral-500">Escolha 1 opção.</p>
          {detalhe?.complementos_itens.map((c) => (
            <OpcaoExtra
              key={c.id}
              nome={c.nome}
              preco={c.preco}
              ativo={complementoId === c.id}
              cor={brown}
              onClick={() => setComplementoId(c.id)}
            />
          ))}
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
        className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 p-2.5 text-base outline-none"
      />
    </div>
  );

  if (temVariacoes) {
    /* Dialogo centralizado igual ao varModalLoja do sistema legado: imagem a esquerda
       (topo no mobile) e opcoes rolando ao lado; observacao e rodape fixos embaixo. */
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[92vh] w-[calc(100%-24px)] max-w-[460px] flex-col gap-0 overflow-hidden rounded-[20px] bg-white p-0 shadow-[0_24px_60px_rgba(0,0,0,.3)] sm:max-w-[460px] min-[900px]:h-[min(632px,calc(100vh-40px))] min-[900px]:max-h-[632px] min-[900px]:w-[min(897px,calc(100vw-40px))] min-[900px]:max-w-[897px]"
        >
          <DialogTitle className="sr-only">{produto.nome}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/35"
          >
            <X size={15} />
          </button>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto min-[900px]:overflow-hidden">
            <div className="flex flex-col min-[900px]:min-h-0 min-[900px]:flex-1 min-[900px]:flex-row min-[900px]:items-stretch">
              <div className="aspect-[4/3] w-full shrink-0 min-[900px]:aspect-auto min-[900px]:w-[380px] min-[900px]:py-6 min-[900px]:pl-6">
                <div className="size-full overflow-hidden bg-neutral-100 min-[900px]:rounded-2xl">
                  {produto.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={produto.imagem} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-neutral-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 px-[18px] pt-4 pb-1 min-[900px]:flex-1 min-[900px]:overflow-y-auto min-[900px]:px-8 min-[900px]:pt-7">
                <h2 className="mb-1 pr-8 text-[1rem] leading-tight font-bold text-neutral-900 min-[900px]:pr-10">
                  {produto.nome}
                </h2>
                {produto.descricao && <p className="mb-2 text-[.8rem] leading-normal text-neutral-500">{produto.descricao}</p>}
                <p className="mb-3.5 text-[.86rem] font-bold text-neutral-900">a partir de {formatarPreco(produto.preco_produto)}</p>
                {opcoesConteudo}
              </div>
            </div>
            <div className="border-t border-neutral-100 px-4 pt-2 pb-2.5">
              <label className="mb-1.5 block text-[.82rem] font-semibold text-neutral-900">Alguma observação?</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Observações do cliente"
                rows={1}
                className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 px-3 py-2 text-base outline-none"
              />
            </div>
          </div>
          <div className="shrink-0 border-t border-neutral-100 px-4 py-3">{footer}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <StoreSheet open={open} onOpenChange={onOpenChange} footer={footer} maxWidth={615}>
      <div className="p-4">
        <div
          className={`group relative mb-3 w-full overflow-hidden rounded-xl bg-neutral-100 transition-all duration-300 ease-out ${
            imagemAmpliada ? "" : "h-[190px]"
          }`}
          style={imagemAmpliada ? { aspectRatio: aspectRatio ?? 4 / 3 } : undefined}
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
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) setAspectRatio(img.naturalWidth / img.naturalHeight);
                  }}
                  className="size-full object-cover"
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

/** Linha de extra/tipo com botão "+" que vira check preto quando selecionado (igual ao loja.php legado). */
function OpcaoExtra({
  nome,
  preco,
  ativo,
  cor,
  onClick,
}: {
  nome: string;
  preco: number;
  ativo: boolean;
  cor: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-neutral-100 py-3 first:border-t-0">
      <div className="text-base text-neutral-900">
        {nome}
        <small className="mt-0.5 block text-[.8rem] font-semibold text-neutral-400">{formatarPreco(preco)}</small>
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={ativo}
        className="flex size-8 shrink-0 items-center justify-center rounded-[10px] text-white"
        style={{ background: ativo ? "#171717" : cor }}
      >
        {ativo ? <Check size={15} /> : <Plus size={15} />}
      </button>
    </div>
  );
}
