"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Garcom } from "@/lib/modoGarcom";

export function GarcomFormDialog({
  open,
  onOpenChange,
  garcom,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garcom: Garcom | null;
  onSalvo: (codigoAcesso: string | null) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(garcom?.nome ?? "");
    setEmail(garcom?.email ?? "");
    setMsg("");
  }, [open, garcom]);

  async function salvar() {
    const nomeTrim = nome.trim();
    const emailTrim = email.trim();
    if (!nomeTrim || !emailTrim) {
      setMsg("Preencha nome e e-mail.");
      return;
    }
    setMsg("");
    setSalvando(true);
    try {
      const res = await fetch("/api/waitermode/garcons-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: garcom?.id ?? 0, nome: nomeTrim, email: emailTrim }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg(data.msg ?? "Erro ao salvar garçom.");
        return;
      }
      onOpenChange(false);
      onSalvo(data.codigo_acesso ?? null);
    } catch {
      setMsg("Erro ao salvar garçom.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{garcom ? "Editar garçom" : "Novo garçom"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garcom-nome">Nome</Label>
            <Input id="garcom-nome" placeholder="Nome do garçom" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="garcom-email">E-mail</Label>
            <Input
              id="garcom-email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {msg && <p className="text-sm text-destructive">{msg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : garcom ? "Salvar alterações" : "Salvar e gerar código"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
