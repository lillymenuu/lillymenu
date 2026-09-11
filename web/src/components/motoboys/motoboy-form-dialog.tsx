"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MotoboyGerenciar } from "@/lib/motoboysGerenciar";

const STATUS_ITEMS: Record<string, string> = {
  "1": "Ativo",
  "0": "Inativo",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MotoboyFormDialog({
  open,
  onOpenChange,
  motoboy,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  motoboy: MotoboyGerenciar | null;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [dataCadastro, setDataCadastro] = useState(hojeISO());
  const [ativo, setAtivo] = useState("1");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(motoboy?.nome ?? "");
    setWhatsapp(motoboy?.whatsapp ?? "");
    setDataCadastro(motoboy?.data_cadastro?.slice(0, 10) ?? hojeISO());
    setAtivo(String(motoboy?.ativo ?? 1));
  }, [open, motoboy]);

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome do motoboy.");
      return;
    }
    if (!whatsapp.trim()) {
      toast.error("Informe o WhatsApp do motoboy.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/motoboys/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: motoboy?.id ?? 0,
          nome,
          whatsapp,
          data_cadastro: dataCadastro,
          ativo: Number(ativo),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar motoboy.");
        return;
      }
      toast.success(data.msg ?? "Motoboy salvo com sucesso.");
      onOpenChange(false);
      onSalvo();
    } catch {
      toast.error("Erro ao salvar motoboy.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{motoboy ? "Editar motoboy" : "Novo motoboy"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motoboy-nome">Nome</Label>
            <Input id="motoboy-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motoboy-whatsapp">Contato WhatsApp</Label>
              <Input id="motoboy-whatsapp" inputMode="numeric" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motoboy-data">Data do cadastro</Label>
              <Input id="motoboy-data" type="date" value={dataCadastro} onChange={(e) => setDataCadastro(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select items={STATUS_ITEMS} value={ativo} onValueChange={(v) => v && setAtivo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar motoboy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
