"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descricao,
  confirmando,
  textoConfirmar = "Confirmar",
  ocultarVoltar = false,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: React.ReactNode;
  confirmando?: boolean;
  textoConfirmar?: string;
  /** Esconde o botao "Voltar", deixando so a confirmacao no rodape. */
  ocultarVoltar?: boolean;
  onConfirmar: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <DialogFooter className="border-t-0 bg-transparent">
          {!ocultarVoltar && (
            <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={confirmando}>
              Voltar
            </Button>
          )}
          <Button variant="destructive" className="rounded-full" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? "Aguarde..." : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
