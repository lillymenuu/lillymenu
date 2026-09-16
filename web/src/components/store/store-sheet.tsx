"use client";

import type { ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Chrome de "sheet" usado por todos os modais da loja publica (produto,
 * combo, carrinho, checkout) — painel de altura total, largura maxima de
 * 901px e centralizado no desktop, ocupando a tela inteira no mobile.
 * Replica o padrao `.sheet` de public/assets/css/loja.css.
 */
export function StoreSheet({
  open,
  onOpenChange,
  title,
  onBack,
  rightAction,
  footer,
  children,
  maxWidth = 901,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: ReactNode;
  onBack?: () => void;
  rightAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /**
   * Largura maxima em px. Aplicada via `style` (nao via classe Tailwind
   * arbitraria) porque essa classe precisaria vencer o `sm:max-w-sm` que ja
   * vem por padrao em DialogContent — uma classe `sm:max-w-[Npx]` montada em
   * runtime (template literal) nunca é extraida pelo scanner estatico do
   * Tailwind, entao nunca ganharia CSS gerado. Estilo inline sempre vence
   * por especificidade, sem depender de o Tailwind "ver" a classe.
   */
  maxWidth?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={{ maxWidth }}
        className="top-0 left-1/2 h-dvh w-full translate-y-0 -translate-x-1/2 gap-0 rounded-none bg-white p-0 sm:top-0"
      >
        <div className="flex h-full flex-col">
          {(title || onBack || rightAction) && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
              <div className="flex min-w-8 items-center">
                {onBack && (
                  <button type="button" onClick={onBack} className="text-neutral-500 hover:text-neutral-700">
                    <ChevronLeft size={20} />
                  </button>
                )}
              </div>
              {title && <DialogTitle className="text-[.92rem] font-bold text-neutral-900">{title}</DialogTitle>}
              <div className="flex min-w-8 items-center justify-end">
                {rightAction ?? (
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="shrink-0 border-t border-neutral-100 px-4 py-3">{footer}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
