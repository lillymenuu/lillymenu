"use client";

import { useEffect, useState } from "react";
import { Clock, Gift, ImageIcon, Lock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { StoreSheet } from "@/components/store/store-sheet";
import { useStoreTheme } from "@/components/store/store-theme";
import type { StoreCartItem, StorePontosProduto, StorePontosProdutosResposta, StorePontosResgatarResposta } from "@/lib/store/types";

/**
 * Clube de Pontos — saldo + grade de produtos resgataveis, mesmo fluxo do
 * pontosSheet do loja.js legado (abrirPontosSheet/carregarProdutosPontos/
 * confirmarResgate/executarResgate).
 */
export function StorePontosSheet({
  open,
  onOpenChange,
  lojaId,
  clienteId,
  clienteNome,
  saldoInicial,
  itensCarrinho,
  onVerHistorico,
  onResgatar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: number;
  clienteId: number | null;
  clienteNome: string;
  saldoInicial: number;
  itensCarrinho: StoreCartItem[];
  onVerHistorico: () => void;
  onResgatar: (item: Omit<StoreCartItem, "key">) => void;
}) {
  const { brown } = useStoreTheme();
  const [saldo, setSaldo] = useState(saldoInicial);
  const [produtos, setProdutos] = useState<StorePontosProduto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmProduto, setConfirmProduto] = useState<StorePontosProduto | null>(null);
  const [resgatando, setResgatando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (open) setSaldo(saldoInicial);
  }, [open, saldoInicial]);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    fetch(`/api/store/pontos-produtos?loja_id=${lojaId}`)
      .then((r) => r.json())
      .then((data: StorePontosProdutosResposta) => setProdutos(data.ok ? data.produtos : []))
      .catch(() => setProdutos([]))
      .finally(() => setCarregando(false));
  }, [open, lojaId]);

  const jaTemResgate = itensCarrinho.some((i) => i.obs === "[Resgate de pontos]");

  const produtosOrdenados = [...produtos].sort((a, b) => {
    const aOk = saldo >= a.pontos_custo;
    const bOk = saldo >= b.pontos_custo;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    return a.pontos_custo - b.pontos_custo;
  });

  async function confirmar() {
    if (!confirmProduto || !clienteId || resgatando) return;
    if (jaTemResgate) {
      setErro("Voce ja tem 1 produto resgatado. Finalize o pedido antes de resgatar outro.");
      return;
    }
    setResgatando(true);
    setErro("");
    try {
      const res = await fetch("/api/store/pontos-resgatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, produto_id: confirmProduto.id, loja_id: lojaId }),
      });
      const data: StorePontosResgatarResposta = await res.json();
      if (!data.ok || data.saldo_novo === undefined) {
        setErro(data.msg ?? "Erro ao resgatar.");
        return;
      }
      setSaldo(data.saldo_novo);
      onResgatar({
        id: confirmProduto.id,
        tipo: "produto",
        nome: confirmProduto.nome,
        precoUnit: 0,
        qtd: 1,
        obs: "[Resgate de pontos]",
        imagem: confirmProduto.imagem,
        pontosCusto: data.custo ?? confirmProduto.pontos_custo,
      });
      setConfirmProduto(null);
    } catch {
      setErro("Erro de conexao.");
    } finally {
      setResgatando(false);
    }
  }

  return (
    <>
      <StoreSheet open={open} onOpenChange={onOpenChange} title="Clube de Pontos" onBack={() => onOpenChange(false)}>
        <div className="p-4">
          <div className="mb-5 rounded-2xl border-[1.5px] border-neutral-200 p-4.5" style={{ borderLeft: `4px solid ${brown}` }}>
            <div className="mb-4 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${brown}1a`, color: brown }}>
                <Gift size={18} />
              </div>
              <div>
                <p className="text-[.95rem] font-extrabold text-neutral-900">Clube de Pontos</p>
                <p className="mt-0.5 text-[.8rem] text-neutral-400">
                  {clienteNome ? `Ola, ${clienteNome}! ` : ""}Troque seus pontos por recompensas
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-xl bg-neutral-50 px-5 py-2.5 text-[1.3rem] font-extrabold text-neutral-900">
                {saldo.toLocaleString("pt-BR")} pts
              </div>
              <button type="button" onClick={onVerHistorico} className="flex items-center gap-1.5 text-[.8rem] text-neutral-600 hover:text-neutral-900">
                <Clock size={14} /> Ver historico
              </button>
            </div>
          </div>

          {carregando ? (
            <p className="py-8 text-center text-[.82rem] text-neutral-400">Carregando produtos...</p>
          ) : produtos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-neutral-300">
              <Gift size={34} className="opacity-40" />
              <p className="text-[.84rem] text-neutral-400">Nenhum produto disponivel para resgate no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-4">
              {produtosOrdenados.map((p) => {
                const pode = saldo >= p.pontos_custo;
                const falta = p.pontos_custo - saldo;
                return (
                  <div key={p.id} className={pode ? "" : "opacity-75"}>
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                      {p.imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagem} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-neutral-300">
                          <ImageIcon size={26} />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={!pode}
                        onClick={() => pode && setConfirmProduto(p)}
                        className="absolute right-1.5 bottom-1.5 flex size-[30px] items-center justify-center rounded-full bg-white shadow-md disabled:cursor-not-allowed"
                        style={{ color: pode ? brown : "#ccc" }}
                      >
                        {pode ? <Plus size={17} /> : <Lock size={13} />}
                      </button>
                    </div>
                    <p className="mt-2 text-[.72rem] font-bold text-neutral-500">{p.pontos_custo.toLocaleString("pt-BR")} pts</p>
                    <p className="mt-0.5 line-clamp-2 text-[.78rem] leading-snug text-neutral-900">{p.nome}</p>
                    {!pode && <p className="mt-0.5 text-[.68rem] text-neutral-400">Faltam {falta.toLocaleString("pt-BR")} pts</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </StoreSheet>

      <Dialog
        open={confirmProduto !== null}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmProduto(null);
            setErro("");
          }
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-[420px] gap-0 rounded-t-[20px] p-0 sm:max-w-[420px]">
          <DialogTitle className="sr-only">Confirmar resgate</DialogTitle>
          <div className="flex items-start gap-3.5 px-5 pt-4 pb-2">
            <div className="size-[60px] shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              {confirmProduto?.imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={confirmProduto.imagem} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-neutral-300">
                  <Gift size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[.82rem] text-neutral-400">Deseja resgatar este produto?</p>
              <p className="mb-1.5 text-[.95rem] font-bold text-neutral-900">{confirmProduto?.nome}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-[3px] text-[.78rem] font-bold text-amber-800">
                {confirmProduto?.pontos_custo.toLocaleString("pt-BR")} pontos
              </span>
            </div>
          </div>

          {erro && <p className="px-5 pb-1 text-[.78rem] text-red-600">{erro}</p>}

          <div className="flex gap-2.5 px-5 pt-3 pb-5">
            <button
              type="button"
              onClick={() => setConfirmProduto(null)}
              className="flex-1 rounded-xl border-[1.5px] border-neutral-200 py-3 text-[.86rem] font-semibold text-neutral-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={resgatando}
              onClick={confirmar}
              className="flex-[2] rounded-xl py-3 text-[.86rem] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: "#16a34a" }}
            >
              {resgatando ? "Processando..." : "Confirmar resgate"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
