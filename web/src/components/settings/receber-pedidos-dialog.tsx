"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type Pedidos = ConfiguracoesDetalhe["pedidos"];

export function ReceberPedidosDialog({
  open,
  onOpenChange,
  pedidos,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidos: Pedidos;
  onSalvo: () => void;
}) {
  const [receber, setReceber] = useState(pedidos.receber_pedidos_ativo);
  const [gestor, setGestor] = useState(pedidos.gestor_pedidos_ativo);
  const [notificar, setNotificar] = useState(pedidos.notificar_pedido_whatsapp_ativo);
  const [aceiteAutomatico, setAceiteAutomatico] = useState(pedidos.aceite_automatico_diggy_ativo);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReceber(pedidos.receber_pedidos_ativo);
    setGestor(pedidos.gestor_pedidos_ativo);
    setNotificar(pedidos.notificar_pedido_whatsapp_ativo);
    setAceiteAutomatico(pedidos.aceite_automatico_diggy_ativo);
  }, [open, pedidos]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receber_pedidos_ativo: receber ? "1" : "0",
          gestor_pedidos_ativo: gestor ? "1" : "0",
          notificar_pedido_whatsapp_ativo: notificar ? "1" : "0",
          aceite_automatico_diggy_ativo: aceiteAutomatico ? "1" : "0",
        }),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receber pedidos</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Linha titulo="Receber pedidos" desc="Liga ou desliga o recebimento de novos pedidos na loja." checked={receber} onCheckedChange={setReceber} />
          <Linha titulo="Gestor de pedidos" desc="Ativa a tela de gestão de pedidos em tempo real." checked={gestor} onCheckedChange={setGestor} />
          <Linha titulo="Notificar por WhatsApp" desc="Envia um aviso por WhatsApp a cada novo pedido." checked={notificar} onCheckedChange={setNotificar} />
          <Linha titulo="Aceite automático" desc="Aceita pedidos automaticamente sem confirmação manual." checked={aceiteAutomatico} onCheckedChange={setAceiteAutomatico} />
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

function Linha({
  titulo,
  desc,
  checked,
  onCheckedChange,
}: {
  titulo: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="pr-3">
        <div className="text-sm font-medium">{titulo}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
