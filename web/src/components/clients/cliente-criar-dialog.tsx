"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormState = {
  nome: string;
  telefone: string;
  aniversario: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
};

const VAZIO: FormState = {
  nome: "",
  telefone: "",
  aniversario: "",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  complemento: "",
};

export function ClienteCriarDialog({
  open,
  onOpenChange,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCriado: () => void;
}) {
  const [form, setForm] = useState<FormState>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setForm(VAZIO);
  }, [open]);

  function campo<K extends keyof FormState>(chave: K) {
    return {
      value: form[chave],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [chave]: e.target.value })),
    };
  }

  async function salvar() {
    if (!form.nome.trim() || !form.telefone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/clients/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao criar cliente.");
        return;
      }
      toast.success("Cliente cadastrado com sucesso.");
      onOpenChange(false);
      onCriado();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-3 overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar cliente</DialogTitle>
        </DialogHeader>
        <div className="scrollbar-hidden flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-novo-nome">Nome do cliente *</Label>
            <Input id="cli-novo-nome" placeholder="Ex.: Felipe" {...campo("nome")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-novo-tel">Número de contato *</Label>
            <Input id="cli-novo-tel" placeholder="Ex.: (11) 9 3232-5454" {...campo("telefone")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-novo-aniv">Aniversário do cliente</Label>
            <Input id="cli-novo-aniv" type="date" {...campo("aniversario")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cli-novo-cep">CEP</Label>
            <Input id="cli-novo-cep" placeholder="Ex.: 00000-000" {...campo("cep")} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-rua">Rua</Label>
              <Input id="cli-novo-rua" placeholder="Ex.: Santa Efigênia" {...campo("rua")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-num">Número</Label>
              <Input id="cli-novo-num" className="w-24" placeholder="Ex.: 123" {...campo("numero")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-bairro">Bairro</Label>
              <Input id="cli-novo-bairro" placeholder="Bairro" {...campo("bairro")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-cidade">Cidade</Label>
              <Input id="cli-novo-cidade" placeholder="Cidade" {...campo("cidade")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-estado">Estado</Label>
              <Input id="cli-novo-estado" placeholder="Estado" {...campo("estado")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-novo-compl">Complemento</Label>
              <Input id="cli-novo-compl" placeholder="Complemento" {...campo("complemento")} />
            </div>
          </div>
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
