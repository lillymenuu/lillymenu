"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck } from "lucide-react";

export function SeloVerificacaoDialog({
  open,
  onOpenChange,
  verificada,
  contato,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  verificada: boolean;
  contato: string;
  onSalvo: () => void;
}) {
  const [etapa, setEtapa] = useState<"inicio" | "codigo">("inicio");
  const [whatsapp, setWhatsapp] = useState(contato);
  const [codigo, setCodigo] = useState("");
  const [codigoManual, setCodigoManual] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEtapa("inicio");
    setWhatsapp(contato);
    setCodigo("");
    setCodigoManual(null);
  }, [open, contato]);

  async function enviarCodigo() {
    setEnviando(true);
    try {
      const res = await fetch("/api/settings/verificacao/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao enviar código.");
        return;
      }
      if (data.instancia_off) {
        setCodigoManual(data.codigo_manual ?? null);
        toast.message(data.msg_aviso ?? "WhatsApp desconectado. Use o código manual.");
      } else {
        toast.success("Código enviado por WhatsApp.");
      }
      setEtapa("codigo");
    } catch {
      toast.error("Erro ao enviar código.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarCodigo() {
    setConfirmando(true);
    try {
      const res = await fetch("/api/settings/verificacao/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao confirmar código.");
        return;
      }
      toast.success("Loja verificada com sucesso.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao confirmar código.");
    } finally {
      setConfirmando(false);
    }
  }

  async function removerSelo() {
    setRemovendo(true);
    try {
      const res = await fetch("/api/settings/verificacao/remover", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao remover selo.");
        return;
      }
      toast.success("Selo de verificação removido.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao remover selo.");
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="size-4.5 text-primary" /> Selo de verificação
          </DialogTitle>
        </DialogHeader>

        {verificada ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sua loja está verificada e exibe o selo de loja verificada no cardápio.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button variant="destructive" onClick={removerSelo} disabled={removendo}>
                {removendo ? "Removendo..." : "Remover selo"}
              </Button>
            </DialogFooter>
          </div>
        ) : etapa === "inicio" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme o número de WhatsApp cadastrado na loja para receber um código de verificação.
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Número de WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="85999999999" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
                Cancelar
              </Button>
              <Button onClick={enviarCodigo} disabled={enviando || !whatsapp.trim()}>
                {enviando ? "Enviando..." : "Enviar código"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Digite o código de 6 dígitos enviado por WhatsApp. Ele expira em 4 minutos.
            </p>
            {codigoManual ? (
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
                WhatsApp desconectado — use o código: <strong className="tracking-widest">{codigoManual}</strong>
              </div>
            ) : null}
            <div className="space-y-1">
              <Label className="text-xs">Código de verificação</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center tracking-widest"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEtapa("inicio")} disabled={confirmando}>
                Voltar
              </Button>
              <Button onClick={confirmarCodigo} disabled={confirmando || codigo.length !== 6}>
                {confirmando ? "Confirmando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
