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

export function ClienteEditarDialog({
  open,
  onOpenChange,
  clienteId,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: number;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState<FormState>(VAZIO);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    fetch(`/api/cliente/detalhe?id=${clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) return;
        const c = data.cliente ?? {};
        setForm({
          nome: c.nome ?? "",
          telefone: c.telefone ?? "",
          aniversario: c.aniversario ?? "",
          cep: c.cep ?? "",
          rua: c.rua ?? "",
          numero: c.numero ?? "",
          bairro: c.bairro ?? "",
          cidade: c.cidade ?? "",
          estado: c.estado ?? "",
          complemento: c.complemento ?? "",
        });
      })
      .finally(() => setCarregando(false));
  }, [open, clienteId]);

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
      const res = await fetch("/api/cliente/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId, ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao salvar cliente.");
        return;
      }
      toast.success("Cliente atualizado com sucesso.");
      onOpenChange(false);
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-3 overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        {carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="scrollbar-hidden flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-nome">Nome do cliente *</Label>
              <Input id="cli-nome" {...campo("nome")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-tel">Número de contato *</Label>
              <Input id="cli-tel" {...campo("telefone")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-aniv">Aniversário do cliente</Label>
              <Input id="cli-aniv" type="date" {...campo("aniversario")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cli-cep">CEP</Label>
              <Input id="cli-cep" {...campo("cep")} />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-rua">Rua</Label>
                <Input id="cli-rua" {...campo("rua")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-num">Número</Label>
                <Input id="cli-num" className="w-24" {...campo("numero")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-bairro">Bairro</Label>
                <Input id="cli-bairro" {...campo("bairro")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-cidade">Cidade</Label>
                <Input id="cli-cidade" {...campo("cidade")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-estado">Estado</Label>
                <Input id="cli-estado" {...campo("estado")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cli-compl">Complemento</Label>
                <Input id="cli-compl" {...campo("complemento")} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={salvar} disabled={salvando || carregando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
