"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type WhatsappCfg = ConfiguracoesDetalhe["whatsapp"];

export function WhatsappDialog({
  open,
  onOpenChange,
  whatsapp,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  whatsapp: WhatsappCfg;
  onSalvo: () => void;
}) {
  const [numero, setNumero] = useState(whatsapp.numero);
  const [msg, setMsg] = useState(whatsapp.msg);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumero(whatsapp.numero);
    setMsg(whatsapp.msg);
  }, [open, whatsapp]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_numero: numero, whatsapp_msg: msg }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Configuração salva.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Número do WhatsApp</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="85999999999" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mensagem automática</Label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={4}
              placeholder="Mensagem enviada junto com a confirmação do pedido."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
