"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FUSOS_BRASIL, deslocamentoFuso, horaAgoraNoFuso } from "@/lib/fusos";

/*
 * Fuso horario da loja (configuracoes.fuso_horario): relogio usado no horario de funcionamento,
 * nos horarios gravados nos pedidos, no "hoje" do gestor/relatorios, caixa etc. (ver db/queries/tempo.ts).
 */

function rotuloFuso(valor: string, agora: Date) {
  const f = FUSOS_BRASIL.find((x) => x.valor === valor);
  return f ? `${f.rotulo} (${deslocamentoFuso(valor, agora)})` : valor;
}

export function FusoHorarioDialog({
  open,
  onOpenChange,
  fuso,
  definido,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fuso: string;
  /** false = nunca salvo: o valor veio do estado da loja. */
  definido: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(fuso);
  const [agora, setAgora] = useState(() => new Date());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia o formulario ao abrir
    setValor(fuso);
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 15_000);
    return () => clearInterval(t);
  }, [open, fuso]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fuso_horario: valor }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Fuso horário salvo.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const mudou = valor !== fuso;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fuso horário da loja</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O horário de funcionamento é comparado com o relógio deste fuso. Se ele estiver errado, sua loja aparece fechada para os
          clientes mesmo estando aberta.
        </p>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Fuso horário</Label>
          <Select value={valor} onValueChange={(v) => v && setValor(v as string)}>
            <SelectTrigger className="h-11 w-full rounded-full bg-muted/60 px-4">
              <SelectValue>{(v: string | null) => (v ? rotuloFuso(v, agora) : "Selecione")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FUSOS_BRASIL.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>
                  <span>{rotuloFuso(f.valor, agora)}</span>
                  {f.estados.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{f.estados.join(", ")}</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">
          Com esse fuso, agora são <strong className="font-semibold text-foreground">{horaAgoraNoFuso(valor, agora)}</strong> na sua loja. Se não
          bater com o relógio do seu estabelecimento, escolha outro.
        </p>
        {!definido && !mudou && <p className="text-xs text-muted-foreground">Sugerido pelo estado cadastrado da loja.</p>}
        {mudou && (
          <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            Vale a partir de agora. Pedidos e lançamentos já registrados continuam com o horário em que foram gravados.
          </p>
        )}

        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-full" onClick={salvar} disabled={salvando || (definido && !mudou)}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
