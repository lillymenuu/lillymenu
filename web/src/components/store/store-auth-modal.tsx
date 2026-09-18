"use client";

import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarTelefone } from "@/lib/store/format";
import type { StorePedidosClienteResposta } from "@/lib/store/types";

const TITULOS: Record<"pedidos" | "pontos", string> = {
  pedidos: "Lista de pedidos",
  pontos: "Clube de Pontos",
};
const DESCRICOES: Record<"pedidos" | "pontos", string> = {
  pedidos: "Para ver seus pedidos ativos e necessario entrar com seu numero de telefone.",
  pontos: "Para consultar seus pontos e resgatar produtos, informe seu numero de telefone.",
};

/**
 * Modal de identificacao por telefone — mesmo texto/fluxo do authModal do
 * loja.js legado, reaproveitado tanto pra "Pedidos" quanto pro "Clube de
 * Pontos" (os dois textos/titulos que o legado ja tinha).
 */
export function StoreAuthModal({
  open,
  onOpenChange,
  lojaId,
  destino = "pedidos",
  onAutenticado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: number;
  destino?: "pedidos" | "pontos";
  onAutenticado: (dados: StorePedidosClienteResposta) => void;
}) {
  const { brown } = useStoreTheme();
  const [telefone, setTelefone] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState("");

  const digits = telefone.replace(/\D/g, "");
  const completo = digits.length >= 10;

  async function entrar() {
    if (!completo || verificando) return;
    setVerificando(true);
    setErro("");
    try {
      const res = await fetch(`/api/store/pedidos-por-cliente?tel=${digits}&loja_id=${lojaId}`);
      const data: StorePedidosClienteResposta = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "Numero nao encontrado.");
        return;
      }
      onAutenticado(data);
      setTelefone("");
    } catch {
      setErro("Erro de conexao.");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTelefone("");
          setErro("");
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-[400px] gap-0 overflow-hidden rounded-[20px] p-0 sm:max-w-[400px]">
        <div className="flex items-center justify-between px-[18px] pt-4 pb-3">
          <DialogTitle className="text-[.95rem] font-bold text-neutral-900">{TITULOS[destino]}</DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
          >
            ×
          </button>
        </div>
        <div className="px-[18px] pb-1.5">
          <p className="mb-4 text-[.83rem] leading-relaxed text-neutral-600">{DESCRICOES[destino]}</p>
          <div className="mb-3.5">
            <label className="mb-1.5 block text-[.72rem] font-semibold tracking-wide text-neutral-500 uppercase">Telefone para contato</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => {
                setTelefone(formatarTelefone(e.target.value));
                setErro("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && completo) entrar();
              }}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={15}
              className="w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-400 focus:bg-white"
            />
          </div>
          {erro && <p className="mb-3 text-[.78rem] text-red-600">{erro}</p>}
          <div className="mb-4 flex items-start gap-1.5 rounded-r-lg border-l-[3px] border-blue-300 bg-blue-50 px-3 py-2.5 text-[.78rem] leading-relaxed text-blue-800">
            <Info size={14} className="mt-0.5 shrink-0" />
            O numero de telefone deve ser o mesmo que foi utilizado para fazer o pedido.
          </div>
        </div>
        <div className="flex items-center justify-between gap-2.5 px-[18px] pt-3.5 pb-[18px]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border-[1.5px] px-4 py-2.5 text-[.82rem] font-semibold transition-colors"
            style={{ borderColor: brown, color: brown }}
          >
            Voltar para o menu
          </button>
          <button
            type="button"
            disabled={!completo || verificando}
            onClick={entrar}
            className="rounded-full px-6 py-2.5 text-[.86rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
            style={{ background: !completo || verificando ? "#c0a88a" : brown }}
          >
            {verificando ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Entrar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
