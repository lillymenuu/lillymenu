"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { BlEnvioFinalizarResposta, BlEnvioIniciarResposta, BlEnvioItemResposta, BlLista } from "@/lib/broadcastlist";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function BroadcastlistEnviarDialog({
  open,
  onOpenChange,
  lista,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lista: BlLista | null;
}) {
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0, nomeAtual: "" });

  useEffect(() => {
    if (!open) return;
    setMensagem("");
    setEnviando(false);
    setProgresso({ atual: 0, total: 0, nomeAtual: "" });
  }, [open, lista]);

  async function enviar() {
    const texto = mensagem.trim();
    if (!texto || !lista) {
      toast.error("Escreva uma mensagem antes de enviar.");
      return;
    }

    setEnviando(true);
    try {
      const resIniciar = await fetch("/api/broadcastlist/envio-iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lista_id: lista.id, mensagem: texto }),
      });
      const dataIniciar: BlEnvioIniciarResposta | { ok: false; msg?: string } = await resIniciar.json();
      if (!dataIniciar.ok) {
        toast.error(dataIniciar.msg ?? "Não foi possível iniciar o envio.");
        setEnviando(false);
        return;
      }

      const { envio_id, destinatarios } = dataIniciar;
      let enviados = 0;
      let falhas = 0;
      setProgresso({ atual: 0, total: destinatarios.length, nomeAtual: "" });

      for (const dest of destinatarios) {
        try {
          const resItem = await fetch("/api/broadcastlist/envio-item", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ envio_id, cliente_id: dest.cliente_id }),
          });
          const dataItem: BlEnvioItemResposta | { ok: false } = await resItem.json();
          if (dataItem.ok && dataItem.enviado) enviados++;
          else falhas++;
        } catch {
          falhas++;
        }
        setProgresso({ atual: enviados + falhas, total: destinatarios.length, nomeAtual: dest.nome });
        await sleep(800);
      }

      await fetch("/api/broadcastlist/envio-finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envio_id }),
      }).then((r) => r.json() as Promise<BlEnvioFinalizarResposta | { ok: false }>);

      if (falhas > 0) {
        toast.error(`Envio concluído: ${enviados} enviada(s), ${falhas} falharam.`);
      } else {
        toast.success(`Mensagem enviada com sucesso para ${enviados} cliente${enviados === 1 ? "" : "s"}!`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Erro de conexão durante o envio.");
    } finally {
      setEnviando(false);
    }
  }

  const pct = progresso.total ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !enviando && onOpenChange(v)}>
      <DialogContent className="w-[480px] max-w-[calc(100%-2rem)] sm:max-w-[480px]" showCloseButton={!enviando}>
        <DialogHeader>
          <DialogTitle>Enviar mensagem — {lista?.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Será enviado para <strong>{lista?.total_membros ?? 0} cliente{(lista?.total_membros ?? 0) !== 1 ? "s" : ""}</strong> desta lista.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Mensagem</Label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Ex: Hoje tem 10% de desconto em todos os produtos! Aproveite 🎉"
              rows={5}
              disabled={enviando}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
            />
          </div>

          {enviando && (
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">
                {progresso.nomeAtual
                  ? `Enviando ${progresso.atual} de ${progresso.total}... (${progresso.nomeAtual})`
                  : `${progresso.atual} de ${progresso.total} processado(s)`}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <TriangleAlert className="size-3.5" /> Não feche esta janela durante o envio.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando || !mensagem.trim()} className="gap-1.5">
            <Send className="size-3.5" /> {enviando ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
