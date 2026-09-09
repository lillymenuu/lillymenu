"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";
import type { Categoria } from "@/lib/produtos";

const MODOS = [
  { value: "vertical", label: "Lista vertical", desc: "Produtos um abaixo do outro." },
  { value: "horizontal", label: "Lista horizontal", desc: "Produtos ao lado, com scroll lateral." },
  { value: "grid", label: "Grade", desc: "Itens organizados em grade." },
] as const;

export function CriarCategoriaDialog({
  open,
  onOpenChange,
  categoria,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoria: Categoria | null;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [modo, setModo] = useState<string>("vertical");
  const [disponivel, setDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setNome(categoria?.nome ?? "");
    setModo(categoria?.modo_exibicao ?? "vertical");
    setDisponivel(categoria ? categoria.ativo === 1 : true);
  }, [open, categoria]);

  async function salvar() {
    if (!nome.trim()) {
      setErro("Informe o nome da categoria.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoria?.id,
          nome: nome.trim(),
          ativo: disponivel,
          modo_exibicao: modo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.msg ?? "Erro ao salvar categoria.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Criar categoria"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cat-nome">
              Nome da categoria<span className="text-destructive">*</span>
            </Label>
            <Input id="cat-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Modo de exibição</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {MODOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModo(m.value)}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                    modo === m.value ? "border-primary ring-1 ring-primary" : "hover:bg-muted"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="h-2 w-3/4 rounded-full bg-muted-foreground/20" />
                    <div className="h-2 w-1/2 rounded-full bg-muted-foreground/20" />
                  </div>
                  <span className="mt-1 text-sm font-medium">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Categoria disponível</div>
              <div className="text-xs text-muted-foreground">
                Ao pausar a categoria ela não estará disponível no catálogo e PDV.
              </div>
            </div>
            <Switch checked={disponivel} onCheckedChange={(v) => setDisponivel(v === true)} />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : categoria ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
