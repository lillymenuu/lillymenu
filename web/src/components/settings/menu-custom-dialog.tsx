"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CORES_MENU_OPCOES } from "@/lib/settings";

export function MenuCustomDialog({
  open,
  onOpenChange,
  temaCorMenu,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  temaCorMenu: string;
  onSalvo: () => void;
}) {
  const [selecionada, setSelecionada] = useState(temaCorMenu);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setSelecionada(temaCorMenu);
  }, [open, temaCorMenu]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema_cor_menu: selecionada }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Cor do cardápio atualizada.");
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
          <DialogTitle>Customize o menu</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Escolha a cor principal do seu cardápio online.</p>
        <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto">
          {CORES_MENU_OPCOES.map((cor) => (
            <button
              key={cor.valor}
              type="button"
              onClick={() => setSelecionada(cor.valor)}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-left ${
                selecionada === cor.valor ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: cor.valor }}>
                {selecionada === cor.valor ? <Check className="size-4 text-white" /> : null}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{cor.nome}</div>
                <div className="text-xs text-muted-foreground">{cor.desc}</div>
              </div>
            </button>
          ))}
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
