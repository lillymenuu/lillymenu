"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { FiadoLancamento } from "@/lib/fiado";

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  voucher: "Voucher",
  outro: "Outros",
};

export function LancamentoDetalheDialog({
  lancamento,
  onOpenChange,
}: {
  lancamento: FiadoLancamento | null;
  onOpenChange: (v: boolean) => void;
}) {
  const ehPago = lancamento?.tipo === "pagamento";

  return (
    <Dialog open={lancamento !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Detalhes do lançamento</DialogTitle>
        </DialogHeader>
        {lancamento && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <span>{ehPago ? "Pagamento" : "Fiado"}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Valor</span>
              <span>{formatBRL(lancamento.valor)}</span>
            </div>
            {ehPago && (
              <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Forma de pagamento</span>
                <span>{FORMA_LABELS[lancamento.forma_pagamento ?? ""] ?? "Outros"}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Data</span>
              <span>{formatDataHoraCurta(lancamento.criado_em)}</span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">Registrado por</span>
              <span>{lancamento.operador_nome ?? "-"}</span>
            </div>
            {lancamento.observacao && (
              <div className="flex flex-col gap-0.5 rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Observação</span>
                <span>{lancamento.observacao}</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
