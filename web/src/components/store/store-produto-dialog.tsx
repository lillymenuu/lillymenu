"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [detalhe, setDetalhe] = useState<StoreProdutoVariacoes | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [variacaoId, setVariacaoId] = useState<number | null>(null);
  const [extrasIds, setExtrasIds] = useState<number[]>([]);
  const [complementoId, setComplementoId] = useState<number | null>(null);

  const temVariacoes = produto?.tem_variacoes === 1;

  useEffect(() => {
    if (!open || !produto) return;
    const qtdMin = Math.max(0, produto.quantidade_minima ?? 0);
    setQtd(qtdMin > 0 ? qtdMin : 1);
    setObs("");
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
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome: produto.nome,
        precoUnit: produto.preco_final,
        qtd,
        obs: obs.trim(),
      });
    } else if (variacaoSelecionada) {
      const nomeVariacao = [variacaoSelecionada.tamanho, variacaoSelecionada.cor].filter(Boolean).join(" - ");
      const extraLabel = extrasSelecionados.map((e) => ` + ${e.nome}`).join("");
      const complementoLabel = complementoSelecionado ? ` + ${complementoSelecionado.nome}` : "";
      const nome = `${produto.nome} - ${nomeVariacao}${extraLabel}${complementoLabel}`;
      onAdicionar({
        id: produto.id,
        tipo: "produto",
        nome,
        precoUnit: precoUnitario,
        qtd,
        obs: obs.trim(),
      });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="max-h-[85vh] overflow-y-auto">
          <div className="h-44 w-full shrink-0 bg-muted">
            {produto.imagem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={produto.imagem} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageIcon size={28} />
              </div>
            )}
          </div>

          <div className="p-4">
            <DialogTitle className="text-base">{produto.nome}</DialogTitle>
            {produto.descricao && <p className="mt-1 text-sm text-muted-foreground">{produto.descricao}</p>}

            {!temVariacoes && (
              <div className="mt-2">
                {produto.em_promo ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">
                      {formatarPreco(produto.preco_base)}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {formatarPreco(produto.preco_final)}
                    </span>
                  </div>
                ) : (
                  <span className="text-base font-semibold text-foreground">{formatarPreco(produto.preco_final)}</span>
                )}
              </div>
            )}

            {produto.esgotado && (
              <p className="mt-2 text-sm font-medium text-destructive">Produto esgotado no momento.</p>
            )}

            {temVariacoes && (
              <div className="mt-4 space-y-4">
                {carregando ? (
                  <p className="text-sm text-muted-foreground">Carregando opcoes...</p>
                ) : (
                  <>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-foreground">Escolha o tamanho / cor</h3>
                      <div className="space-y-1.5">
                        {(detalhe?.variacoes ?? []).map((v) => {
                          const nome = [v.tamanho, v.cor].filter(Boolean).join(" - ") || "Opcao";
                          return (
                            <label
                              key={v.id}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm ${
                                variacaoId === v.id ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <span>{nome}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{formatarPreco(v.preco)}</span>
                                <input
                                  type="radio"
                                  name="variacao"
                                  checked={variacaoId === v.id}
                                  onChange={() => setVariacaoId(v.id)}
                                />
                              </span>
                            </label>
                          );
                        })}
                        {detalhe?.variacoes.length === 0 && (
                          <p className="text-xs text-muted-foreground">Sem variacoes cadastradas.</p>
                        )}
                      </div>
                    </div>

                    {(detalhe?.extras.length ?? 0) > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">
                          Escolha seu extra {detalhe?.extras_obrigatorio === 1 && <span className="text-destructive">*</span>}
                        </h3>
                        <div className="space-y-1.5">
                          {detalhe?.extras.map((e) => (
                            <label
                              key={e.id}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm ${
                                extrasIds.includes(e.id) ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <span>{e.nome}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{formatarPreco(e.preco)}</span>
                                <input type="checkbox" checked={extrasIds.includes(e.id)} onChange={() => alternarExtra(e.id)} />
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {(detalhe?.complementos_itens.length ?? 0) > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-foreground">
                          Escolha o tipo{" "}
                          {detalhe?.complementos_itens_obrigatorio === 1 && <span className="text-destructive">*</span>}
                        </h3>
                        <div className="space-y-1.5">
                          {detalhe?.complementos_itens.map((c) => (
                            <label
                              key={c.id}
                              className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm ${
                                complementoId === c.id ? "border-primary bg-primary/5" : "border-border"
                              }`}
                            >
                              <span>{c.nome}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-muted-foreground">{formatarPreco(c.preco)}</span>
                                <input
                                  type="radio"
                                  name="complemento"
                                  checked={complementoId === c.id}
                                  onChange={() => setComplementoId(c.id)}
                                />
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Observacoes</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex: sem cebola, ponto da carne, etc."
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:border-ring"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={qtd <= Math.max(1, produto.quantidade_minima ?? 0)}
                  onClick={() => setQtd((q) => Math.max(1, q - 1))}
                >
                  <Minus size={14} />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{qtd}</span>
                <Button type="button" variant="outline" size="icon" onClick={() => setQtd((q) => q + 1)}>
                  <Plus size={14} />
                </Button>
              </div>
              <Button type="button" disabled={!podeAdicionar} onClick={adicionar}>
                {produto.esgotado ? "Esgotado" : `Adicionar ${formatarPreco(total)}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
