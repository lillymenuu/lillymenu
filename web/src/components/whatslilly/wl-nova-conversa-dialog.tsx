"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WlNovaConversaResposta } from "@/lib/whatslilly";

export function WlNovaConversaDialog({
  open,
  onOpenChange,
  onCriada,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriada: (conversaId: number, nome: string, numero: string) => void;
}) {
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    const numeroLimpo = numero.trim();
    if (!numeroLimpo) return;

    setSalvando(true);
    try {
      const res = await fetch("/api/whatslilly/nova-conversa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: numeroLimpo, nome: nome.trim() }),
      });
      const data: WlNovaConversaResposta | { ok: false; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao iniciar conversa.");
        return;
      }
      setNumero("");
      setNome("");
      onOpenChange(false);
      onCriada(data.conversa_id, data.nome, numeroLimpo);
    } catch {
      toast.error("Erro ao iniciar conversa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px] max-w-[calc(100%-2rem)] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Número WhatsApp (com DDD)</Label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="85 99999-9999"
              onKeyDown={(e) => e.key === "Enter" && confirmar()}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome (opcional)</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do contato" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={salvando || !numero.trim()}>
            {salvando ? "Iniciando..." : "Iniciar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
