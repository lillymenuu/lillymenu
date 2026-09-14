"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCartItem, PosExtra, PosProduto, PosVariacao, PosVariacoesResposta } from "@/lib/pos";

export function PosVariacaoDialog({
  produto,
  onOpenChange,
  onAdicionar,
}: {
  produto: PosProduto | null;
  onOpenChange: (v: boolean) => void;
  onAdicionar: (item: Omit<PosCartItem, "rowKey">) => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [variacoes, setVariacoes] = useState<PosVariacao[]>([]);
  const [extras, setExtras] = useState<PosExtra[]>([]);
  const [extrasObrigatorio, setExtrasObrigatorio] = useState(false);
  const [complementosItens, setComplementosItens] = useState<PosExtra[]>([]);
  const [complementosObrigatorio, setComplementosObrigatorio] = useState(false);

  const [busca, setBusca] = useState("");
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [extrasIds, setExtrasIds] = useState<number[]>([]);
  const [complementoId, setComplementoId] = useState<number | null>(null);
  const [qtd, setQtd] = useState(1);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!produto) return;
    setCarregando(true);
    setVariacoes([]);
    setExtras([]);
    setExtrasObrigatorio(false);
    setComplementosItens([]);
    setComplementosObrigatorio(false);
    setBusca("");
    setVariacaoId(null);
    setExtrasIds([]);
    setComplementoId(null);
    setQtd(1);
    setObservacoes("");
    fetch(`/api/pos/produto-variacoes?id=${produto.id}`)
      .then((r) => r.json())
      .then((data: PosVariacoesResposta) => {
        if (data.ok) {
          const lista = data.variacoes ?? [];
          setVariacoes(lista);
          setExtras(data.extras ?? []);
          setExtrasObrigatorio(!!data.extras_obrigatorio);
          setComplementosItens(data.complementos_itens ?? []);
          setComplementosObrigatorio(!!data.complementos_itens_obrigatorio);
          if (lista.length > 0) setVariacaoId(lista[0].id);
        }
      })
      .catch(() => setVariacoes([]))
      .finally(() => setCarregando(false));
  }, [produto]);

  if (!produto) return null;

  const termo = busca.trim().toLowerCase();
  const variacoesFiltradas = termo
    ? variacoes.filter((v) => [v.tamanho, v.cor].filter(Boolean).join(" ").toLowerCase().includes(termo))
    : variacoes;

  const variacaoSelecionada = variacoes.find((v) => v.id === variacaoId) ?? null;
  const precoBase = variacaoSelecionada ? (variacaoSelecionada.preco > 0 ? variacaoSelecionada.preco : produto.preco) : produto.preco;
  const extrasSelecionados = extras.filter((e) => extrasIds.includes(e.id));
  const extrasTotal = extrasSelecionados.reduce((s, e) => s + e.preco, 0);
  const complementoSelecionado = complementosItens.find((c) => c.id === complementoId) ?? null;
  const precoUnitario = precoBase + extrasTotal + (complementoSelecionado?.preco ?? 0);

  function toggleExtra(id: number) {
    setExtrasIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const podeAdicionar =
    !carregando &&
    variacaoId !== null &&
    (!extrasObrigatorio || extrasIds.length > 0) &&
    (!complementosObrigatorio || complementoId !== null);

  function confirmar() {
    if (!produto || !variacaoSelecionada || !podeAdicionar) return;
    const nomeVariacao = [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ");
    let nome = nomeVariacao ? `${produto.nome} - ${nomeVariacao}` : produto.nome;
    if (extrasSelecionados.length > 0) nome += ` + ${extrasSelecionados.map((e) => e.nome).join(", ")}`;
    if (complementoSelecionado) nome += ` + ${complementoSelecionado.nome}`;

    onAdicionar({
      produtoId: produto.id,
      nome,
      qtd,
      preco: precoUnitario,
      observacoes: observacoes.trim(),
      usarPontos: false,
      imagem: produto.imagem,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[420px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[420px]" showCloseButton={false}>
        <DialogTitle className="sr-only">{produto.nome}</DialogTitle>

        <div className="flex shrink-0 items-start gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt={produto.nome} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="size-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="line-clamp-2 text-sm leading-tight font-semibold">{produto.nome}</div>
            {produto.descricao ? (
              <div className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted-foreground">{produto.descricao}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {carregando ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Carregando opções...</div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Escolha uma das opções</span>
                <span className="text-xs font-semibold text-destructive">Obrigatório</span>
              </div>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Procure por uma opção"
                  className="h-9 bg-muted/40 pl-8 text-sm"
                />
              </div>
              <div className="mt-2 space-y-1.5">
                {variacoesFiltradas.map((v) => {
                  const label = [v.tamanho, v.cor].filter(Boolean).join(" - ") || `Opção #${v.id}`;
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm transition-colors ${
                        variacaoId === v.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="variacao"
                          checked={variacaoId === v.id}
                          onChange={() => setVariacaoId(v.id)}
                          className="accent-primary"
                        />
                        {label}
                      </span>
                      <span className="font-medium">{formatBRL(v.preco)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {extras.length > 0 ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase">Escolha seu extra</span>
                  {extrasObrigatorio ? <span className="text-xs font-semibold text-destructive">Obrigatório</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">Escolha 1 ou mais opções.</div>
                <div className="mt-2 space-y-1.5">
                  {extras.map((e) => {
                    const ativo = extrasIds.includes(e.id);
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                        <div>
                          <div>{e.nome}</div>
                          <div className="text-xs text-muted-foreground">{formatBRL(e.preco)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleExtra(e.id)}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            ativo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          {ativo ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {complementosItens.length > 0 ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase">Escolha o tipo</span>
                  {complementosObrigatorio ? <span className="text-xs font-semibold text-destructive">Obrigatório</span> : null}
                </div>
                <div className="text-xs text-muted-foreground">Escolha 1 opção.</div>
                <div className="mt-2 space-y-1.5">
                  {complementosItens.map((c) => {
                    const ativo = complementoId === c.id;
                    return (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                        <div>
                          <div>{c.nome}</div>
                          <div className="text-xs text-muted-foreground">{formatBRL(c.preco)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setComplementoId(ativo ? null : c.id)}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                            ativo ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                        >
                          {ativo ? <Check className="size-4" /> : <Plus className="size-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações do cliente"
              rows={2}
              className="w-full resize-none rounded-xl border-0 bg-muted/60 px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        )}

        <div className="flex shrink-0 items-center justify-between pt-1">
          <div className="flex items-center gap-3 rounded-full bg-muted px-1 py-1">
            <button
              type="button"
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-4 text-center text-sm font-semibold tabular-nums">{qtd}</span>
            <button
              type="button"
              onClick={() => setQtd((q) => q + 1)}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={confirmar}
            disabled={!podeAdicionar}
            className="h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {variacaoId === null ? "Selecionar variação" : `Adicionar · ${formatBRL(precoUnitario * qtd)}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
