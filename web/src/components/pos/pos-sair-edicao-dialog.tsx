"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/* Confirmacao ao fechar o PDV no meio da edicao de um pedido — sair sem salvar
   descarta tudo o que foi alterado (itens, pagamento, cashback...). */
export function PosSairEdicaoDialog({
  open,
  onOpenChange,
  codigo,
  onSair,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigo: number | string | null;
  onSair: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-3xl p-5 sm:max-w-md">
        <DialogTitle className="text-lg font-medium">Sair da edição?</DialogTitle>
        <DialogDescription className="mt-1.5">
          As alterações feitas no pedido{codigo ? ` #${codigo}` : ""} serão descartadas.
        </DialogDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-10 rounded-full px-4" onClick={() => onOpenChange(false)}>
            Continuar editando
          </Button>
          <Button variant="destructive" className="h-10 rounded-full px-4" onClick={onSair}>
            Descartar e sair
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
