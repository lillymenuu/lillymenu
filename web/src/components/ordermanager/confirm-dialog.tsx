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
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  descricao: React.ReactNode;
  confirmando?: boolean;
  textoConfirmar?: string;
  onConfirmar: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? "Aguarde..." : textoConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
