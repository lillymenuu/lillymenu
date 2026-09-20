"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, ChevronDown, ImageIcon, Loader2, ShoppingBag, Ticket } from "lucide-react";
import { StoreSheet } from "@/components/store/store-sheet";
import { PontosBadge } from "@/components/store/pontos-badge";
import { QtyStepper } from "@/components/store/qty-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { avisarEstoqueIndisponivel } from "@/components/store/toast-estoque";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCrossSellProduto, StoreCupomResultado, StorePerfil } from "@/lib/store/types";

export function StoreCartSheet({
  open,
  onOpenChange,
  perfil,
  nomeLoja,
  logoLoja,
  itens,
  subtotal,
  onAtualizarQtd,
  onRemover,
  onAdicionar,
  onFinalizar,
  cupomAplicado,
  onCupomAplicadoChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
  nomeLoja: string;
  logoLoja: string;
  itens: StoreCartItem[];
  subtotal: number;
  onAtualizarQtd: (key: string, qtd: number) => void;
  onRemover: (key: string) => void;
  onAdicionar: (item: Omit<StoreCartItem, "key">) => void;
  onFinalizar: () => void;
  cupomAplicado: StoreCupomResultado | null;
  onCupomAplicadoChange: (c: StoreCupomResultado | null) => void;
}) {
  const { brown } = useStoreTheme();
  const lojaId = perfil.loja_id;
  const [sugestoes, setSugestoes] = useState<StoreCrossSellProduto[]>([]);
  const [cupomAberto, setCupomAberto] = useState(false);
  const [cupomCodigo, setCupomCodigo] = useState(cupomAplicado?.codigo ?? perfil.cupomPreenchido ?? "");
  const [cupomErro, setCupomErro] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);

  const desconto = cupomAplicado && cupomAplicado.tipo !== "frete" ? cupomAplicado.valor : 0;
  const total = Math.max(0, subtotal - desconto);
  const cashbackEstimado = useMemo(
    () => (perfil.cashbackAtivo && perfil.cashbackPct > 0 ? (total * perfil.cashbackPct) / 100 : 0),
    [perfil.cashbackAtivo, perfil.cashbackPct, total]
  );

  async function validarCupom() {
    if (!cupomCodigo.trim()) return;
    setValidandoCupom(true);
    setCupomErro("");
    try {
      const res = await fetch("/api/store/cupom-validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loja_id: lojaId, codigo: cupomCodigo.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.ok) onCupomAplicadoChange(data as StoreCupomResultado);
      else {
        onCupomAplicadoChange(null);
        setCupomErro(data.msg ?? "Cupom invalido.");
      }
    } catch {
      setCupomErro("Erro ao validar cupom.");
    } finally {
      setValidandoCupom(false);
    }
  }

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
      crossSell: true,
      pontosGanho: p.pontos_ganho,
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
          <button
            type="button"
            onClick={() => {
              itens.forEach((i) => onRemover(i.key));
              onCupomAplicadoChange(null);
            }}
            className="text-[.8rem] text-neutral-400"
          >
            Limpar
          </button>
        ) : undefined
      }
      footer={
        itens.length > 0 ? (
          <div>
            {perfil.cuponsAtivo && (
              <div className="mb-3 rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setCupomAberto((v) => !v)}
                  className="flex w-full items-center justify-between px-3.5 py-2.5"
                >
                  <span className="flex items-center gap-2 text-[.82rem] font-semibold text-neutral-900">
                    <Ticket size={15} style={{ color: brown }} />
                    Cupons
                    {cupomAplicado && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[.65rem] font-bold text-emerald-700">
                        {cupomAplicado.codigo}
                      </span>
                    )}
                  </span>
                  <ChevronDown size={15} className={`text-neutral-400 transition-transform ${cupomAberto ? "rotate-180" : ""}`} />
                </button>
                {cupomAberto && (
                  <div className="border-t border-neutral-100 p-3">
                    <div className="flex gap-2">
                      <input
                        value={cupomCodigo}
                        onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                        placeholder="Ex.: 10OFFHOJE"
                        disabled={!!cupomAplicado}
                        className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-base outline-none focus:bg-white"
                      />
                      {cupomAplicado ? (
                        <button
                          type="button"
                          onClick={() => {
                            onCupomAplicadoChange(null);
                            setCupomCodigo("");
                          }}
                          className="shrink-0 rounded-lg border border-neutral-200 px-3 text-[.78rem] font-semibold text-neutral-600"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={validarCupom}
                          disabled={validandoCupom}
                          className="shrink-0 rounded-lg border border-neutral-200 px-3 text-[.78rem] font-semibold text-neutral-600"
                        >
                          {validandoCupom ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
                        </button>
                      )}
                    </div>
                    {cupomErro && <p className="mt-1.5 text-[.74rem] text-red-600">{cupomErro}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="mb-2.5 space-y-1 text-[.78rem]">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>{formatarPreco(subtotal)}</span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between" style={{ color: "#7c3aed" }}>
                  <span>Desconto</span>
                  <span>-{formatarPreco(desconto)}</span>
                </div>
              )}
              {cashbackEstimado > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Cashback a receber (apos 12 horas da compra)</span>
                  <span>{formatarPreco(cashbackEstimado)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[.72rem] text-neutral-500">Total da compra</p>
                <p className="text-[.98rem] font-bold text-neutral-900">
                  {formatarPreco(total)} <span className="text-[.72rem] font-normal text-neutral-500">/ {itens.length} itens</span>
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

        {!perfil.lojaAberta &&
          (perfil.agendamentoDeliveryAtivo || perfil.agendamentoRetiradaAtivo ? (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3">
              <CalendarCheck size={18} className="mt-0.5 shrink-0 text-orange-500" />
              <div>
                <p className="text-[.84rem] font-bold text-orange-800">Loja fechada — pedido agendado disponível</p>
                <p className="mt-0.5 text-[.76rem] leading-relaxed text-orange-800">
                  A loja está fechada agora, mas você pode fazer um pedido agendado. Escolha <strong className="font-bold">Entrega agendada</strong> ou{" "}
                  <strong className="font-bold">Retirada agendada</strong> no checkout.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-orange-500" />
              <div>
                <p className="text-[.84rem] font-bold text-orange-800">Loja fechada no momento</p>
                <p className="mt-0.5 text-[.76rem] leading-relaxed text-orange-800">Este estabelecimento está fechado no momento.</p>
              </div>
            </div>
          ))}

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
                        {perfil.clubePontosAtivo && item.pontosCusto == null && (
                          <div className="mt-1">
                            <PontosBadge pontos={(item.pontosGanho ?? 0) * item.qtd} />
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <QtyStepper
                          size="sm"
                          value={item.qtd}
                          min={0}
                          max={item.pontosCusto != null ? 1 : item.estoqueMax}
                          onChange={(v) => (v <= 0 ? onRemover(item.key) : onAtualizarQtd(item.key, v))}
                          onMaxAtingido={item.pontosCusto == null ? avisarEstoqueIndisponivel : undefined}
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
                      {perfil.clubePontosAtivo && (
                        <div className="mt-1">
                          <PontosBadge pontos={p.pontos_ganho ?? 0} />
                        </div>
                      )}
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
