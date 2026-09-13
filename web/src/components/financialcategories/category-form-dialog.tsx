"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FinanceiroCategoria } from "@/lib/financeiroCategorias";

const SEM_PAI = "none";

export function CategoryFormDialog({
  open,
  onOpenChange,
  categoria,
  categoriasRaiz,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoria: FinanceiroCategoria | null;
  categoriasRaiz: FinanceiroCategoria[];
  onSalvo: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [parentId, setParentId] = useState(SEM_PAI);
  const [active, setActive] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (categoria) {
      setName(categoria.name);
      setType(categoria.type);
      setParentId(categoria.parent_id ? String(categoria.parent_id) : SEM_PAI);
      setActive(categoria.active);
    } else {
      setName("");
      setType("income");
      setParentId(SEM_PAI);
      setActive(true);
    }
  }, [open, categoria]);

  const opcoesPai = categoriasRaiz.filter((c) => c.type === type && c.id !== categoria?.id);

  useEffect(() => {
    if (!open) return;
    if (parentId !== SEM_PAI && !opcoesPai.some((c) => String(c.id) === parentId)) {
      setParentId(SEM_PAI);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open]);

  async function salvar() {
    if (!name.trim()) {
      toast.error("Preencha o nome da categoria.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/financialcategories/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoria?.id ?? 0,
          name,
          type,
          parent_id: parentId !== SEM_PAI ? Number(parentId) : null,
          active,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar categoria.");
        return;
      }
      toast.success(data.msg ?? "Categoria salva.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar categoria.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[440px] max-w-[calc(100%-2rem)] sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vendas" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as "income" | "expense")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => (type === "income" ? "Receita" : "Despesa")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria pai</Label>
              <Select value={parentId} onValueChange={(v) => v && setParentId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => opcoesPai.find((c) => String(c.id) === parentId)?.name ?? "Nenhuma (categoria raiz)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_PAI}>Nenhuma (categoria raiz)</SelectItem>
                  {opcoesPai.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label className="text-sm">Categoria ativa</Label>
            <Switch checked={active} onCheckedChange={setActive} />
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
