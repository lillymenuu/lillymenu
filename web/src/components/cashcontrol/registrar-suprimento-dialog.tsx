"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import type { CaixaSupervisor } from "@/lib/caixa";

export function RegistrarSuprimentoDialog({
  open,
  onOpenChange,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSucesso: () => void;
}) {
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [supervisores, setSupervisores] = useState<CaixaSupervisor[]>([]);
  const [autorizadoPorId, setAutorizadoPorId] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValor("");
    setObservacoes("");
    setAutorizadoPorId("");

    fetch("/api/cashcontrol/supervisores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { ok: boolean; itens?: CaixaSupervisor[] }) => {
        if (data.ok) setSupervisores(data.itens ?? []);
      })
      .catch(() => setSupervisores([]));
  }, [open]);

  async function confirmar() {
    const numero = parseFloat(valor || "0");
    if (!numero || numero <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (!autorizadoPorId) {
      toast.error("Selecione o responsável pela autorização.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/cashcontrol/movimentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "suprimento",
          valor: numero,
          observacoes,
          autorizado_por_id: Number(autorizadoPorId),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível registrar o suprimento.");
        return;
      }
      toast.success("Suprimento registrado com sucesso.");
      onOpenChange(false);
      onSucesso();
    } catch {
      toast.error("Não foi possível registrar o suprimento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar suprimento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suprimento-valor">Valor</Label>
            <MoneyInput id="suprimento-valor" value={valor} onChange={setValor} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suprimento-observacoes">Observações</Label>
            <textarea
              id="suprimento-observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
              rows={3}
              maxLength={255}
              className="w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Responsável pela autorização</Label>
            <Select value={autorizadoPorId} onValueChange={(v) => setAutorizadoPorId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o gerente/supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={confirmar} disabled={enviando}>
            {enviando ? "Registrando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
