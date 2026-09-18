"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import { formatarPreco } from "@/lib/store/format";

/** Modal "Como foi sua experiência?" — mesmo fluxo do loja.js legado (avalOverlay). */
export function StoreAvaliacaoModal({
  open,
  onOpenChange,
  nomeLoja,
  lojaId,
  pedidoId,
  horario,
  itens,
  onAvaliado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nomeLoja: string;
  lojaId: number;
  pedidoId: number | null;
  horario: string;
  itens: { produto_nome: string; quantidade: number; preco: number | string }[];
  onAvaliado: (pedidoId: number) => void;
}) {
  const { brown } = useStoreTheme();
  const [nota, setNota] = useState(0);
  const [notaHover, setNotaHover] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (open) {
      setNota(0);
      setNotaHover(0);
      setDescricao("");
    }
  }, [open]);

  async function enviar() {
    if (!pedidoId || nota < 1 || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/store/avaliacao-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ pedido_id: String(pedidoId), nota: String(nota), descricao, loja_id: String(lojaId) }),
      });
      const data = await res.json();
      if (data.ok) {
        onAvaliado(pedidoId);
        onOpenChange(false);
      }
    } finally {
      setEnviando(false);
    }
  }

  const notaExibida = notaHover > 0 ? notaHover : nota;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[440px] gap-0 overflow-hidden rounded-[18px] p-0 sm:max-w-[440px]">
        <div className="relative border-b border-neutral-100 px-5 py-4 text-center">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3.5 flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-600"
          >
            <X size={14} />
          </button>
          <DialogTitle className="text-[.95rem] font-bold" style={{ color: brown }}>
            Como foi sua experiência em {nomeLoja}?
          </DialogTitle>
          <p className="mt-1 text-[.76rem] text-neutral-400">{horario ? `Pedido realizado em ${horario}` : ""}</p>
        </div>

        {itens.length > 0 && (
          <div className="border-b border-neutral-100 px-5 py-2.5">
            {itens.map((i, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between gap-2.5 py-2 text-[.82rem] text-neutral-700 ${idx < itens.length - 1 ? "border-b border-neutral-50" : ""}`}
              >
                <span className="min-w-0 shrink-0 font-bold" style={{ color: brown }}>
                  {i.quantidade}x
                </span>
                <span className="min-w-0 flex-1 px-1">{i.produto_nome}</span>
                <span className="shrink-0 font-semibold text-neutral-700">{formatarPreco(Number(i.preco) * i.quantidade)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-[18px] py-4">
          <div className="mb-1 text-center">
            <p className="mb-1.5 text-[.8rem] font-semibold" style={{ color: brown }}>
              O que você achou do pedido?
            </p>
            <p className="mb-2.5 text-[.72rem] text-neutral-400">Escolha de uma a cinco estrelas para avaliar o pedido</p>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setNota(v)}
                  onMouseEnter={() => setNotaHover(v)}
                  onMouseLeave={() => setNotaHover(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star size={26} fill={v <= notaExibida ? "#f59e0b" : "none"} color={v <= notaExibida ? "#f59e0b" : "#ddd"} />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3.5">
            <label className="mb-1 block text-[.72rem] font-bold text-neutral-700">Descrição da sua avaliação.</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descrição"
              className="w-full resize-none rounded-[10px] border-[1.5px] border-neutral-200 bg-neutral-50 px-3 py-2.5 text-base text-neutral-900 outline-none transition-colors focus:border-neutral-400 focus:bg-white"
            />
          </div>
        </div>

        <div className="px-[18px] pb-[18px]">
          <button
            type="button"
            disabled={nota < 1 || enviando}
            onClick={enviar}
            className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
            style={{ background: nota < 1 || enviando ? "#c0a88a" : brown }}
          >
            {enviando ? "Enviando..." : "Avaliar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
