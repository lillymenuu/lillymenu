"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConfiguracoesDetalhe, TaxaBairro, TaxaDinamica } from "@/lib/settings";

type TaxaEntregaCfg = ConfiguracoesDetalhe["taxa_entrega"];
type Tab = "sem" | "bairro" | "dinamica" | "fixa" | "area";

const TABS: { id: Tab; label: string }[] = [
  { id: "sem", label: "Sem taxa" },
  { id: "bairro", label: "Por bairro" },
  { id: "dinamica", label: "Dinâmica" },
  { id: "fixa", label: "Fixa" },
  { id: "area", label: "Por área/distância" },
];

export function TaxaEntregaDialog({
  open,
  onOpenChange,
  taxaEntrega,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  taxaEntrega: TaxaEntregaCfg;
  onSalvo: () => void;
}) {
  const [tab, setTab] = useState<Tab>((taxaEntrega.tipo as Tab) || "dinamica");
  const [gratis, setGratis] = useState(taxaEntrega.gratis);
  const [fixaValor, setFixaValor] = useState(String(taxaEntrega.fixa.valor || ""));
  const [fixaMin, setFixaMin] = useState(String(taxaEntrega.fixa.tempo_min || ""));
  const [fixaMax, setFixaMax] = useState(String(taxaEntrega.fixa.tempo_max || ""));
  const [salvandoBasico, setSalvandoBasico] = useState(false);

  const [bairros, setBairros] = useState<TaxaBairro[]>([]);
  const [carregandoBairros, setCarregandoBairros] = useState(false);
  const [formBairro, setFormBairro] = useState<{ id: number; bairro: string; taxa: string; min: string; max: string } | null>(null);

  const [dinamicas, setDinamicas] = useState<TaxaDinamica[]>([]);
  const [carregandoDinamicas, setCarregandoDinamicas] = useState(false);
  const [formDinamica, setFormDinamica] = useState<{ id: number; distancia: string; valor: string; tipo: string; min: string; max: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab((taxaEntrega.tipo as Tab) || "dinamica");
    setGratis(taxaEntrega.gratis);
    setFixaValor(String(taxaEntrega.fixa.valor || ""));
    setFixaMin(String(taxaEntrega.fixa.tempo_min || ""));
    setFixaMax(String(taxaEntrega.fixa.tempo_max || ""));
    setFormBairro(null);
    setFormDinamica(null);
  }, [open, taxaEntrega]);

  useEffect(() => {
    if (!open) return;
    if (tab === "bairro") carregarBairros();
    if (tab === "dinamica") carregarDinamicas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  async function carregarBairros() {
    setCarregandoBairros(true);
    try {
      const res = await fetch("/api/settings/taxa-bairro");
      const data = await res.json();
      if (data.ok) setBairros(data.itens);
    } finally {
      setCarregandoBairros(false);
    }
  }

  async function carregarDinamicas() {
    setCarregandoDinamicas(true);
    try {
      const res = await fetch("/api/settings/taxa-dinamica");
      const data = await res.json();
      if (data.ok) setDinamicas(data.itens);
    } finally {
      setCarregandoDinamicas(false);
    }
  }

  async function persistirBasico(tipoOverride?: Tab) {
    setSalvandoBasico(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxa_entrega_gratis: gratis ? "1" : "0",
          taxa_entrega_tipo: tipoOverride ?? tab,
          taxa_entrega: fixaValor || "0",
          taxa_entrega_tempo_min: fixaMin || "",
          taxa_entrega_tempo_max: fixaMax || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      onSalvo();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvandoBasico(false);
    }
  }

  function trocarTab(novo: Tab) {
    setTab(novo);
    persistirBasico(novo);
  }

  async function alternarGratis(v: boolean) {
    setGratis(v);
    setSalvandoBasico(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxa_entrega_gratis: v ? "1" : "0",
          taxa_entrega_tipo: tab,
          taxa_entrega: fixaValor || "0",
          taxa_entrega_tempo_min: fixaMin || "",
          taxa_entrega_tempo_max: fixaMax || "",
        }),
      });
      const data = await res.json();
      if (!data.ok) toast.error(data.msg ?? "Erro ao salvar.");
    } finally {
      setSalvandoBasico(false);
    }
  }

  async function salvarFixa() {
    await persistirBasico("fixa");
    toast.success("Taxa fixa salva.");
  }

  async function salvarBairro() {
    if (!formBairro) return;
    if (!formBairro.bairro.trim()) {
      toast.error("Informe o bairro.");
      return;
    }
    try {
      const res = await fetch("/api/settings/taxa-bairro/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formBairro.id,
          bairro: formBairro.bairro,
          taxa: formBairro.taxa || "0",
          tempo_min: formBairro.min,
          tempo_max: formBairro.max,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Taxa por bairro salva.");
      setFormBairro(null);
      carregarBairros();
      onSalvo();
    } catch {
      toast.error("Erro ao salvar.");
    }
  }

  async function excluirBairro(id: number) {
    try {
      const res = await fetch("/api/settings/taxa-bairro/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir.");
        return;
      }
      toast.success("Taxa removida.");
      carregarBairros();
      onSalvo();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  async function salvarDinamica() {
    if (!formDinamica) return;
    if (!formDinamica.distancia.trim()) {
      toast.error("Informe a distância.");
      return;
    }
    try {
      const res = await fetch("/api/settings/taxa-dinamica/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formDinamica.id,
          distancia_km: formDinamica.distancia,
          valor: formDinamica.valor || "0",
          tipo: formDinamica.tipo,
          tempo_min: formDinamica.min,
          tempo_max: formDinamica.max,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Taxa dinâmica salva.");
      setFormDinamica(null);
      carregarDinamicas();
      onSalvo();
    } catch {
      toast.error("Erro ao salvar.");
    }
  }

  async function excluirDinamica(id: number) {
    try {
      const res = await fetch("/api/settings/taxa-dinamica/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir.");
        return;
      }
      toast.success("Taxa removida.");
      carregarDinamicas();
      onSalvo();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Taxa de entrega</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium">Entrega grátis para pedidos com valor mínimo</div>
            <div className="text-xs text-muted-foreground">Combine com o valor mínimo configurado no card correspondente.</div>
          </div>
          <Switch checked={gratis} onCheckedChange={alternarGratis} disabled={salvandoBasico} />
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => trocarTab(t.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[45vh] overflow-y-auto">
          {tab === "sem" ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Defina sua loja sem taxa de entrega para pedidos de delivery.
            </div>
          ) : null}

          {tab === "area" ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Configure taxas por área/distância conforme o raio da loja. Em breve.
            </div>
          ) : null}

          {tab === "fixa" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input type="number" step="0.01" value={fixaValor} onChange={(e) => setFixaValor(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo mín.</Label>
                  <Input type="number" value={fixaMin} onChange={(e) => setFixaMin(e.target.value)} placeholder="40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo máx.</Label>
                  <Input type="number" value={fixaMax} onChange={(e) => setFixaMax(e.target.value)} placeholder="60" />
                </div>
              </div>
              <Button size="sm" onClick={salvarFixa} disabled={salvandoBasico}>
                Salvar taxa fixa
              </Button>
            </div>
          ) : null}

          {tab === "bairro" ? (
            <div className="space-y-3">
              {formBairro ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input value={formBairro.bairro} onChange={(e) => setFormBairro({ ...formBairro, bairro: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor da taxa</Label>
                      <Input type="number" step="0.01" value={formBairro.taxa} onChange={(e) => setFormBairro({ ...formBairro, taxa: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo mín.</Label>
                      <Input type="number" value={formBairro.min} onChange={(e) => setFormBairro({ ...formBairro, min: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo máx.</Label>
                      <Input type="number" value={formBairro.max} onChange={(e) => setFormBairro({ ...formBairro, max: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormBairro(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarBairro}>
                      Salvar taxa por bairro
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setFormBairro({ id: 0, bairro: "", taxa: "", min: "", max: "" })}
                >
                  <Plus className="size-3.5" /> Adicionar taxa por bairro
                </Button>
              )}
              <div className="space-y-1.5">
                {carregandoBairros ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
                ) : bairros.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Nenhuma taxa por bairro cadastrada.</div>
                ) : (
                  bairros.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{b.bairro}</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {Number(b.taxa).toFixed(2).replace(".", ",")} · {b.tempo_min ?? "-"} a {b.tempo_max ?? "-"} min
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setFormBairro({ id: b.id, bairro: b.bairro, taxa: String(b.taxa), min: String(b.tempo_min ?? ""), max: String(b.tempo_max ?? "") })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => excluirBairro(b.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {tab === "dinamica" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <strong>Atenção!</strong> Com a taxa dinâmica habilitada, você cobra de acordo com a distância. Ex.: até 2km, R$ 4,00.
              </div>
              {formDinamica ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Distância (km)</Label>
                      <Input type="number" step="0.1" value={formDinamica.distancia} onChange={(e) => setFormDinamica({ ...formDinamica, distancia: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor da taxa</Label>
                      <Input type="number" step="0.01" value={formDinamica.valor} onChange={(e) => setFormDinamica({ ...formDinamica, valor: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={formDinamica.tipo} onValueChange={(v) => v && setFormDinamica({ ...formDinamica, tipo: v as string })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixa">Taxa fixa</SelectItem>
                          <SelectItem value="por_km">Por km</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo mín./máx.</Label>
                      <div className="flex gap-1">
                        <Input type="number" value={formDinamica.min} onChange={(e) => setFormDinamica({ ...formDinamica, min: e.target.value })} placeholder="40" />
                        <Input type="number" value={formDinamica.max} onChange={(e) => setFormDinamica({ ...formDinamica, max: e.target.value })} placeholder="60" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setFormDinamica(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarDinamica}>
                      Salvar taxa dinâmica
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setFormDinamica({ id: 0, distancia: "", valor: "", tipo: "fixa", min: "", max: "" })}
                >
                  <Plus className="size-3.5" /> Adicionar taxa dinâmica
                </Button>
              )}
              <div className="space-y-1.5">
                {carregandoDinamicas ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
                ) : dinamicas.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">Nenhuma regra de taxa dinâmica cadastrada.</div>
                ) : (
                  dinamicas.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <div className="font-medium">{d.distancia_km}km · {d.tipo === "por_km" ? "Por km" : "Taxa fixa"}</div>
                        <div className="text-xs text-muted-foreground">
                          R$ {Number(d.valor).toFixed(2).replace(".", ",")} · {d.tempo_min ?? "-"} a {d.tempo_max ?? "-"} min
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setFormDinamica({
                              id: d.id,
                              distancia: String(d.distancia_km),
                              valor: String(d.valor),
                              tipo: d.tipo,
                              min: String(d.tempo_min ?? ""),
                              max: String(d.tempo_max ?? ""),
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => excluirDinamica(d.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
