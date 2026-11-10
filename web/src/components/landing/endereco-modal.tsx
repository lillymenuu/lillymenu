"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCep, buscarEnderecoPorCep } from "@/lib/cep";

export type Endereco = { cep: string; rua: string; numero: string; bairro: string; cidade: string; estado: string };

const VAZIO: Endereco = { cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "" };

export function EnderecoModal({
  open,
  onOpenChange,
  valorInicial,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  valorInicial: Endereco | null;
  onSalvar: (endereco: Endereco) => void;
}) {
  const [form, setForm] = useState<Endereco>(VAZIO);
  const [buscandoCep, setBuscandoCep] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setForm(valorInicial ?? VAZIO), 0);
    return () => clearTimeout(t);
  }, [open, valorInicial]);

  async function aoMudarCep(e: React.ChangeEvent<HTMLInputElement>) {
    const formatado = formatarCep(e.target.value);
    setForm((f) => ({ ...f, cep: formatado }));
    if (formatado.replace(/\D/g, "").length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCep(formatado);
      if (!endereco) {
        toast.error("CEP não encontrado.");
        return;
      }
      setForm((f) => ({ ...f, rua: endereco.rua, bairro: endereco.bairro, cidade: endereco.cidade, estado: endereco.estado }));
    } catch {
      toast.error("Erro ao buscar o CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  function salvar() {
    if (form.cep.replace(/\D/g, "").length !== 8 || !form.rua.trim() || !form.numero.trim()) {
      toast.error("Preencha o CEP e o número do endereço.");
      return;
    }
    onSalvar(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md gap-3 overflow-hidden rounded-3xl p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Endereço da loja</DialogTitle>
        </DialogHeader>
        <div className="scrollbar-hidden flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end-cep">CEP</Label>
            <Input className="h-10 rounded-xl" id="end-cep" placeholder="Ex.: 00000-000" value={form.cep} onChange={aoMudarCep} disabled={buscandoCep} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-rua">Rua</Label>
              <Input className="h-10 rounded-xl" id="end-rua" placeholder="Rua" value={form.rua} onChange={(e) => setForm((f) => ({ ...f, rua: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-numero">Número</Label>
              <Input
                id="end-numero"
                className="h-10 w-24 rounded-xl"
                placeholder="Ex.: 123"
                value={form.numero}
                onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-bairro">Bairro</Label>
              <Input className="h-10 rounded-xl" id="end-bairro" placeholder="Bairro" value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-cidade">Cidade</Label>
              <Input className="h-10 rounded-xl" id="end-cidade" placeholder="Cidade" value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="end-estado">Estado</Label>
            <Input className="h-10 rounded-xl" id="end-estado" placeholder="Estado" value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} />
          </div>
        </div>
        <DialogFooter className="-mx-5 -mb-5 rounded-b-3xl border-t-0 bg-transparent px-5 pt-1 pb-5">
          <Button variant="outline" className="rounded-full font-normal" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-full font-normal" onClick={salvar}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
