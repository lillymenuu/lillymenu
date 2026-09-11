"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ConfiguracoesDetalhe } from "@/lib/settings";
import { DIAS_SEMANA_LONGO } from "@/lib/settings";

type Agendamento = ConfiguracoesDetalhe["agendamento"];
type Horario = { inicio: string; fim: string };

function toRows(horarios: Record<string, Horario>): { dia: number; inicio: string; fim: string }[] {
  return Object.entries(horarios)
    .map(([dia, h]) => ({ dia: Number(dia), inicio: h.inicio, fim: h.fim }))
    .sort((a, b) => a.dia - b.dia);
}

function AntecedenciaCampo({
  label,
  tipo,
  valor,
  onTipoChange,
  onValorChange,
}: {
  label: string;
  tipo: string;
  valor: string;
  onTipoChange: (v: string) => void;
  onValorChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex overflow-hidden rounded-full border">
          {(["dias", "horas"] as const).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onTipoChange(op)}
              className={`px-2.5 py-0.5 text-[11px] capitalize ${tipo === op ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {op}
            </button>
          ))}
        </div>
      </div>
      <Input type="number" min="0" value={valor} onChange={(e) => onValorChange(e.target.value)} />
    </div>
  );
}

function SecaoAgendamento({
  titulo,
  ativo,
  onAtivoChange,
  minTipo,
  onMinTipoChange,
  minValor,
  onMinValorChange,
  maxTipo,
  onMaxTipoChange,
  maxValor,
  onMaxValorChange,
  horarios,
  onHorariosChange,
}: {
  titulo: string;
  ativo: boolean;
  onAtivoChange: (v: boolean) => void;
  minTipo: string;
  onMinTipoChange: (v: string) => void;
  minValor: string;
  onMinValorChange: (v: string) => void;
  maxTipo: string;
  onMaxTipoChange: (v: string) => void;
  maxValor: string;
  onMaxValorChange: (v: string) => void;
  horarios: { dia: number; inicio: string; fim: string }[];
  onHorariosChange: (rows: { dia: number; inicio: string; fim: string }[]) => void;
}) {
  function adicionarDia() {
    const usados = new Set(horarios.map((h) => h.dia));
    const proximo = [1, 2, 3, 4, 5, 6, 7].find((d) => !usados.has(d));
    if (!proximo) return;
    onHorariosChange([...horarios, { dia: proximo, inicio: "09:00", fim: "18:00" }]);
  }

  function removerDia(dia: number) {
    onHorariosChange(horarios.filter((h) => h.dia !== dia));
  }

  function atualizarDia(dia: number, campo: "inicio" | "fim", valor: string) {
    onHorariosChange(horarios.map((h) => (h.dia === dia ? { ...h, [campo]: valor } : h)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">Ativar {titulo.toLowerCase()} agendado(a)</div>
          <div className="text-xs text-muted-foreground">Sua loja poderá receber pedidos agendados de {titulo.toLowerCase()}.</div>
        </div>
        <Switch checked={ativo} onCheckedChange={onAtivoChange} />
      </div>
      {ativo ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <AntecedenciaCampo label="Antecedência mínima" tipo={minTipo} valor={minValor} onTipoChange={onMinTipoChange} onValorChange={onMinValorChange} />
            <AntecedenciaCampo label="Antecedência máxima" tipo={maxTipo} valor={maxValor} onTipoChange={onMaxTipoChange} onValorChange={onMaxValorChange} />
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-xs font-medium">Horário customizado para {titulo.toLowerCase()}</div>
            {horarios.map((h) => (
              <div key={h.dia} className="flex items-center gap-2">
                <Select value={String(h.dia)} onValueChange={(v) => onHorariosChange(horarios.map((x) => (x.dia === h.dia ? { ...x, dia: Number(v) } : x)))}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIAS_SEMANA_LONGO).map(([id, nome]) => (
                      <SelectItem key={id} value={id}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="time" value={h.inicio} onChange={(e) => atualizarDia(h.dia, "inicio", e.target.value)} />
                <span className="text-xs text-muted-foreground">até</span>
                <Input type="time" value={h.fim} onChange={(e) => atualizarDia(h.dia, "fim", e.target.value)} />
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removerDia(h.dia)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={adicionarDia} disabled={horarios.length >= 7}>
              <Plus className="size-3.5" /> Criar horário customizado
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function PedidosAgendadosDialog({
  open,
  onOpenChange,
  agendamento,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agendamento: Agendamento;
  onSalvo: () => void;
}) {
  const [aba, setAba] = useState("delivery");
  const [dAtivo, setDAtivo] = useState(agendamento.delivery.ativo);
  const [dMinTipo, setDMinTipo] = useState(agendamento.delivery.min_tipo);
  const [dMinValor, setDMinValor] = useState(String(agendamento.delivery.min_valor));
  const [dMaxTipo, setDMaxTipo] = useState(agendamento.delivery.max_tipo);
  const [dMaxValor, setDMaxValor] = useState(String(agendamento.delivery.max_valor));
  const [dHorarios, setDHorarios] = useState(toRows(agendamento.delivery.horarios));

  const [rAtivo, setRAtivo] = useState(agendamento.retirada.ativo);
  const [rMinTipo, setRMinTipo] = useState(agendamento.retirada.min_tipo);
  const [rMinValor, setRMinValor] = useState(String(agendamento.retirada.min_valor));
  const [rMaxTipo, setRMaxTipo] = useState(agendamento.retirada.max_tipo);
  const [rMaxValor, setRMaxValor] = useState(String(agendamento.retirada.max_valor));
  const [rHorarios, setRHorarios] = useState(toRows(agendamento.retirada.horarios));

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAba("delivery");
    setDAtivo(agendamento.delivery.ativo);
    setDMinTipo(agendamento.delivery.min_tipo);
    setDMinValor(String(agendamento.delivery.min_valor));
    setDMaxTipo(agendamento.delivery.max_tipo);
    setDMaxValor(String(agendamento.delivery.max_valor));
    setDHorarios(toRows(agendamento.delivery.horarios));
    setRAtivo(agendamento.retirada.ativo);
    setRMinTipo(agendamento.retirada.min_tipo);
    setRMinValor(String(agendamento.retirada.min_valor));
    setRMaxTipo(agendamento.retirada.max_tipo);
    setRMaxValor(String(agendamento.retirada.max_valor));
    setRHorarios(toRows(agendamento.retirada.horarios));
  }, [open, agendamento]);

  function horariosParaJson(rows: { dia: number; inicio: string; fim: string }[]) {
    const obj: Record<string, Horario> = {};
    rows.forEach((r) => {
      obj[r.dia] = { inicio: r.inicio, fim: r.fim };
    });
    return JSON.stringify(obj);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agendamento_delivery_ativo: dAtivo ? "1" : "0",
          agendamento_delivery_min_tipo: dMinTipo,
          agendamento_delivery_min_valor: dMinValor || "1",
          agendamento_delivery_max_tipo: dMaxTipo,
          agendamento_delivery_max_valor: dMaxValor || "1",
          agendamento_delivery_horarios: horariosParaJson(dHorarios),
          agendamento_retirada_ativo: rAtivo ? "1" : "0",
          agendamento_retirada_min_tipo: rMinTipo,
          agendamento_retirada_min_valor: rMinValor || "1",
          agendamento_retirada_max_tipo: rMaxTipo,
          agendamento_retirada_max_valor: rMaxValor || "1",
          agendamento_retirada_horarios: horariosParaJson(rHorarios),
        }),
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedidos agendados</DialogTitle>
        </DialogHeader>
        <Tabs value={aba} onValueChange={(v) => v && setAba(v as string)}>
          <TabsList variant="line">
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="retirada">Retirada</TabsTrigger>
          </TabsList>
          <TabsContent value="delivery" className="max-h-[55vh] overflow-y-auto pt-3">
            <SecaoAgendamento
              titulo="Delivery"
              ativo={dAtivo}
              onAtivoChange={setDAtivo}
              minTipo={dMinTipo}
              onMinTipoChange={setDMinTipo}
              minValor={dMinValor}
              onMinValorChange={setDMinValor}
              maxTipo={dMaxTipo}
              onMaxTipoChange={setDMaxTipo}
              maxValor={dMaxValor}
              onMaxValorChange={setDMaxValor}
              horarios={dHorarios}
              onHorariosChange={setDHorarios}
            />
          </TabsContent>
          <TabsContent value="retirada" className="max-h-[55vh] overflow-y-auto pt-3">
            <SecaoAgendamento
              titulo="Retirada"
              ativo={rAtivo}
              onAtivoChange={setRAtivo}
              minTipo={rMinTipo}
              onMinTipoChange={setRMinTipo}
              minValor={rMinValor}
              onMinValorChange={setRMinValor}
              maxTipo={rMaxTipo}
              onMaxTipoChange={setRMaxTipo}
              maxValor={rMaxValor}
              onMaxValorChange={setRMaxValor}
              horarios={rHorarios}
              onHorariosChange={setRHorarios}
            />
          </TabsContent>
        </Tabs>
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
