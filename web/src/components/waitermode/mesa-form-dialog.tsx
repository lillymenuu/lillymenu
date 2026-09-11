"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Mesa } from "@/lib/modoGarcom";

export function MesaFormDialog({
  open,
  onOpenChange,
  mesa,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mesa: Mesa | null;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(mesa?.nome ?? "");
    setMsg("");
  }, [open, mesa]);

  async function salvar() {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setMsg("Informe o nome da mesa.");
      return;
    }
    setMsg("");
    setSalvando(true);
    try {
      const res = await fetch("/api/waitermode/mesas-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mesa?.id ?? 0, nome: nomeTrim }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(data.msg ?? "Erro ao salvar mesa.");
        return;
      }
      onOpenChange(false);
      onSalvo();
    } catch {
      setMsg("Erro ao salvar mesa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mesa ? "Editar mesa" : "Nova mesa"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mesa-nome">Nome da mesa</Label>
          <Input
            id="mesa-nome"
            placeholder="Ex.: Mesa 1, Varanda 2..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {msg && <p className="text-sm text-destructive">{msg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
