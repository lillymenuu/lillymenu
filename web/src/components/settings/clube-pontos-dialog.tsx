"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Gift, Sparkles, ListChecks } from "lucide-react";

export function ClubePontosDialog({
  open,
  onOpenChange,
  ativo,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ativo: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(ativo);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) setValor(ativo);
  }, [open, ativo]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clube_pontos_ativo: valor ? "1" : "0" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Configuração salva.");
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
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clube de pontos</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-3 rounded-lg border p-3">
            <Gift className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Como funciona?</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Com o clube de pontos habilitado, seus clientes acumulam pontos a cada compra e podem trocá-los por
                benefícios na sua loja. É uma forma de fidelizar e recompensar quem mais compra com você.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border p-3">
            <Sparkles className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Vantagens</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                O programa de fidelidade aumenta a recorrência de compras e fortalece o relacionamento com seus
                clientes.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border p-3">
            <ListChecks className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Como configurar no produto</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Vá na aba de produtos e edite o que você deseja configurar. Em cada item você define:
              </p>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                <div>
                  <strong className="text-foreground">Ganho</strong> — pontos que o cliente acumula ao comprar.
                </div>
                <div>
                  <strong className="text-foreground">Custo</strong> — pontos que o cliente gasta para trocar pelo produto.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="text-sm font-medium">Clube de pontos habilitado</div>
          <Switch checked={valor} onCheckedChange={setValor} />
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
