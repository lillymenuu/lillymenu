"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import { RegistrarFiadoDialog } from "@/components/cliente/registrar-fiado-dialog";
import { RegistrarPagamentoDialog } from "@/components/storecredittracking/registrar-pagamento-dialog";
import { LancamentoDetalheDialog } from "@/components/storecredittracking/lancamento-detalhe-dialog";
import type { FiadoDetalheResposta, FiadoLancamento } from "@/lib/fiado";

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  voucher: "Voucher",
  outro: "Outros",
};

export function FiadoDetalheDialog({
  clienteId,
  onOpenChange,
  onAtualizado,
  onVerPedido,
}: {
  clienteId: number | null;
  onOpenChange: (v: boolean) => void;
  onAtualizado: () => void;
  onVerPedido: (pedidoId: number) => void;
}) {
  const [dados, setDados] = useState<FiadoDetalheResposta | null>(null);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [registrarFiadoOpen, setRegistrarFiadoOpen] = useState(false);
  const [registrarPagamentoOpen, setRegistrarPagamentoOpen] = useState(false);
  const [lancamentoDetalhe, setLancamentoDetalhe] = useState<FiadoLancamento | null>(null);

  async function carregar(p: number) {
    if (clienteId === null) return;
    setErro("");
    try {
      const res = await fetch(`/api/storecredittracking/detalhe?cliente_id=${clienteId}&pagina=${p}`);
      const data: FiadoDetalheResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "Erro ao carregar detalhes do cliente.");
        return;
      }
      setDados(data);
      setPagina(data.pagina);
    } catch {
      setErro("Erro ao carregar detalhes do cliente.");
    }
  }

  useEffect(() => {
    if (clienteId === null) return;
    setDados(null);
    setPagina(1);
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  function handleLancamentoClick(l: FiadoLancamento) {
    if (l.pedido_id) {
      onVerPedido(l.pedido_id);
      return;
    }
    setLancamentoDetalhe(l);
  }

  function handleRegistrado() {
    carregar(pagina);
    onAtualizado();
  }

  return (
    <>
      <Dialog open={clienteId !== null} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{dados ? `Dívidas - ${dados.cliente.nome}` : "Dívidas"}</DialogTitle>
          </DialogHeader>
          {!dados && !erro && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
          {erro && <p className="py-6 text-center text-sm text-destructive">{erro}</p>}
          {dados && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total fiado</div>
                <div className="text-2xl font-bold text-primary">{formatBRL(dados.cliente.saldo_fiado)}</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Histórico</div>
                <div className="flex flex-col gap-1.5">
                  {dados.lancamentos.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
                  )}
                  {dados.lancamentos.map((l) => {
                    const ehPago = l.tipo === "pagamento";
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => handleLancamentoClick(l)}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2">
                          {ehPago ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Pago</Badge>
                          ) : (
                            <Badge variant="secondary">Fiado</Badge>
                          )}
                          <span>
                            {ehPago
                              ? `${formatBRL(l.valor)} - ${FORMA_LABELS[l.forma_pagamento ?? ""] ?? "Outros"}`
                              : `-${formatBRL(l.valor)}`}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDataHoraCurta(l.criado_em)}</div>
                      </button>
                    );
                  })}
                </div>
                {dados.paginas > 1 && (
                  <div className="mt-2 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <button
                      type="button"
                      disabled={pagina <= 1}
                      onClick={() => carregar(pagina - 1)}
                      className="flex size-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="flex size-7 items-center justify-center rounded-md border border-primary text-primary">
                      {pagina}
                    </span>
                    <button
                      type="button"
                      disabled={pagina >= dados.paginas}
                      onClick={() => carregar(pagina + 1)}
                      className="flex size-7 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-lg font-normal" onClick={() => setRegistrarPagamentoOpen(true)}>
              Registrar pagamento
            </Button>
            <Button className="rounded-lg font-normal" onClick={() => setRegistrarFiadoOpen(true)}>
              Registrar fiado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {clienteId !== null && (
        <>
          <RegistrarFiadoDialog
            open={registrarFiadoOpen}
            onOpenChange={setRegistrarFiadoOpen}
            clienteId={clienteId}
            onRegistrado={handleRegistrado}
          />
          <RegistrarPagamentoDialog
            open={registrarPagamentoOpen}
            onOpenChange={setRegistrarPagamentoOpen}
            clienteId={clienteId}
            onRegistrado={handleRegistrado}
          />
        </>
      )}

      <LancamentoDetalheDialog lancamento={lancamentoDetalhe} onOpenChange={(v) => !v && setLancamentoDetalhe(null)} />
    </>
  );
}
