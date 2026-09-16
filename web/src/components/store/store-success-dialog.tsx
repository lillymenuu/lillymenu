"use client";

import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStoreTheme } from "@/components/store/store-theme";

export function StoreSuccessDialog({
  open,
  onOpenChange,
  codigo,
  tempoEstimado,
  numeroWhatsapp,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  codigo: number | string;
  tempoEstimado: string;
  numeroWhatsapp: string;
}) {
  const { brown } = useStoreTheme();

  function enviarWhatsapp() {
    const numero = numeroWhatsapp.replace(/\D/g, "");
    const texto = encodeURIComponent(`Ola! Acabei de fazer o pedido #${codigo}.`);
    if (numero) window.open(`https://wa.me/55${numero}?text=${texto}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-1/2 h-dvh w-full max-w-[680px] translate-y-0 -translate-x-1/2 gap-0 rounded-none bg-white p-0"
      >
        <div className="flex h-full flex-col items-center justify-center overflow-hidden px-6 py-8 text-center">
          <div className="relative mb-7">
            <div
              className="absolute inset-0 animate-ping rounded-full border-2 border-emerald-500 opacity-30"
              style={{ animationDuration: "2.5s" }}
            />
            <div className="relative flex size-[90px] items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-300">
              <Check size={40} className="text-emerald-700" strokeWidth={3} />
            </div>
          </div>
          <p className="mb-1 text-[.78rem] font-bold tracking-wide text-emerald-600 uppercase">
            Pedido #{codigo} confirmado
          </p>
          <DialogTitle className="mb-2.5 text-[1.3rem] font-extrabold text-neutral-900">
            Seu pedido foi criado com sucesso!
          </DialogTitle>
          <p className="mb-7 text-[.86rem] text-neutral-500">Entrega em {tempoEstimado}</p>

          <button
            type="button"
            onClick={enviarWhatsapp}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-[15px] text-[.9rem] font-extrabold tracking-wide text-white uppercase"
            style={{ background: brown, boxShadow: `0 6px 20px ${brown}4d` }}
          >
            <MessageCircle size={17} />
            Enviar para o WhatsApp da loja
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-neutral-200 py-[13px] text-[.86rem] font-semibold text-neutral-600"
          >
            <ShoppingBag size={15} />
            Acompanhar pedido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
