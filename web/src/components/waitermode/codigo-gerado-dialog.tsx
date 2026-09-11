"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CodigoGeradoDialog({
  codigo,
  onClose,
}: {
  codigo: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={codigo !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Código de acesso gerado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Anote ou envie agora — por segurança, esse código não fica salvo em texto e não será mostrado de novo.
        </p>
        <div className="rounded-xl bg-muted/50 py-6 text-center text-3xl font-bold tracking-[0.3em]">{codigo}</div>
        <DialogFooter>
          <Button className="rounded-lg font-normal" onClick={onClose}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
