"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ConfiguracoesDetalhe, TaxaBairro, TaxaDinamica, TaxaArea } from "@/lib/settings";
import type { PontoMapa } from "@/components/settings/taxa-area-mapa";
import { TaxaAreaEditorDialog, type TaxaAreaForm } from "@/components/settings/taxa-area-editor-dialog";

const CENTRO_PADRAO = { lat: -14.235, lng: -51.9253, zoom: 4 };

type TaxaEntregaCfg = ConfiguracoesDetalhe["taxa_entrega"];
type Tab = "sem" | "bairro" | "dinamica" | "fixa" | "area";

const TABS: { id: Tab; label: string }[] = [
  { id: "sem", label: "Sem taxa" },
  { id: "bairro", label: "Por bairro" },
  { id: "dinamica", label: "Dinâmica" },
  { id: "fixa", label: "Fixa" },
  { id: "area", label: "Por área/distância" },
];

/** Linhas por pagina nas tabelas de bairro e area. */
const POR_PAGINA = 6;

/** Fatia da pagina atual (a pagina e limitada ao total, pra nao ficar vazia depois de excluir). */
function paginar<T>(lista: T[], pagina: number): { itens: T[]; pagina: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  return { itens: lista.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA), pagina: atual, totalPaginas };
}

function Paginacao({ pagina, totalPaginas, onMudar }: { pagina: number; totalPaginas: number; onMudar: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-1 pt-1 text-sm">
      <button
        type="button"
        onClick={() => onMudar(pagina - 1)}
        disabled={pagina <= 1}
        aria-label="Página anterior"
        className="flex size-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onMudar(n)}
          aria-current={n === pagina ? "page" : undefined}
          className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
            n === pagina ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onMudar(pagina + 1)}
        disabled={pagina >= totalPaginas}
        aria-label="Próxima página"
        className="flex size-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

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

  const [areas, setAreas] = useState<TaxaArea[]>([]);
  const [carregandoAreas, setCarregandoAreas] = useState(false);
  const [centroMapa, setCentroMapa] = useState<(PontoMapa & { zoom: number }) | null>(null);
  const [formArea, setFormArea] = useState<TaxaAreaForm | null>(null);
  const [salvandoArea, setSalvandoArea] = useState(false);
  const [paginaArea, setPaginaArea] = useState(1);
  const [paginaBairro, setPaginaBairro] = useState(1);

  useEffect(() => {
    if (!open) return;
    setTab((taxaEntrega.tipo as Tab) || "dinamica");
    setGratis(taxaEntrega.gratis);
    setFixaValor(String(taxaEntrega.fixa.valor || ""));
    setFixaMin(String(taxaEntrega.fixa.tempo_min || ""));
    setFixaMax(String(taxaEntrega.fixa.tempo_max || ""));
    setFormBairro(null);
    setFormDinamica(null);
    setFormArea(null);
  }, [open, taxaEntrega]);

  useEffect(() => {
    if (!open) return;
    if (tab === "bairro") carregarBairros();
    if (tab === "dinamica") carregarDinamicas();
    if (tab === "area") {
      carregarAreas();
      if (!centroMapa) carregarCentroMapa();
    }
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

  async function carregarAreas() {
    setCarregandoAreas(true);
    try {
      const res = await fetch("/api/settings/taxa-area");
      const data = await res.json();
      if (data.ok) setAreas(data.itens);
    } finally {
      setCarregandoAreas(false);
    }
  }

  async function carregarCentroMapa() {
    try {
      const res = await fetch("/api/settings/taxa-area/centro");
      const data = await res.json();
      if (data.ok && data.lat && data.lng) setCentroMapa({ lat: data.lat, lng: data.lng, zoom: data.zoom ?? 12 });
    } catch {
      // mantem o centro padrao em caso de falha
    }
  }

  async function salvarArea() {
    if (!formArea) return;
    if (!formArea.nome.trim()) {
      toast.error("Informe o nome da área.");
      return;
    }
    if (formArea.poligono.length < 3) {
      toast.error("Desenhe uma área com pelo menos 3 pontos no mapa.");
      return;
    }
    setSalvandoArea(true);
    try {
      const res = await fetch("/api/settings/taxa-area/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formArea.id,
          nome: formArea.nome,
          taxa: formArea.taxa || "0",
          tempo_min: formArea.min,
          tempo_max: formArea.max,
          poligono: formArea.poligono,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Área de entrega salva.");
      setFormArea(null);
      carregarAreas();
      onSalvo();
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvandoArea(false);
    }
  }

  async function excluirArea(id: number) {
    try {
      const res = await fetch("/api/settings/taxa-area/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir.");
        return;
      }
      toast.success("Área removida.");
      carregarAreas();
      onSalvo();
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(712px,calc(100dvh-2rem))] w-[692px] max-w-[calc(100%-2rem)] flex-col rounded-3xl sm:max-w-[692px]">
        <DialogHeader>
          <DialogTitle>Taxa de entrega</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-xl border p-3">
          <div>
            <div className="text-sm font-medium">Entrega grátis para pedidos com valor mínimo</div>
            <div className="text-xs text-muted-foreground">Combine com o valor mínimo configurado no card correspondente.</div>
          </div>
          <Switch checked={gratis} onCheckedChange={alternarGratis} disabled={salvandoBasico} />
        </div>

        <div className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => trocarTab(t.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-1">
          {tab === "sem" ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Defina sua loja sem taxa de entrega para pedidos de delivery.
            </div>
          ) : null}

          {tab === "area" ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 pr-3 font-medium">Área</th>
                      <th className="py-3 pr-3 font-medium">Valor da taxa</th>
                      <th className="py-3 pr-3 font-medium">Tempo mínimo</th>
                      <th className="py-3 pr-3 font-medium">Tempo máximo</th>
                      <th className="py-3 pr-3 font-medium">Pontos</th>
                      <th className="py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregandoAreas ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          Carregando...
                        </td>
                      </tr>
                    ) : areas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          Nenhuma área cadastrada.
                        </td>
                      </tr>
                    ) : (
                      paginar(areas, paginaArea).itens.map((a) => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="py-3.5 pr-3">{a.nome}</td>
                          <td className="py-3.5 pr-3">R$ {Number(a.taxa).toFixed(2).replace(".", ",")}</td>
                          <td className="py-3.5 pr-3">{a.tempo_min != null ? `${a.tempo_min} minutos` : "-"}</td>
                          <td className="py-3.5 pr-3">{a.tempo_max != null ? `${a.tempo_max} minutos` : "-"}</td>
                          <td className="py-3.5 pr-3">{a.poligono.length}</td>
                          <td className="py-3.5">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => excluirArea(a.id)}
                                aria-label={`Excluir ${a.nome}`}
                                className="flex size-8 items-center justify-center rounded-full border bg-background text-foreground/80 transition-colors hover:bg-muted"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormArea({
                                    id: a.id,
                                    nome: a.nome,
                                    taxa: String(a.taxa),
                                    min: String(a.tempo_min ?? ""),
                                    max: String(a.tempo_max ?? ""),
                                    poligono: a.poligono,
                                  })
                                }
                                aria-label={`Editar ${a.nome}`}
                                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao {...paginar(areas, paginaArea)} onMudar={setPaginaArea} />
              <p className="text-sm">
                <strong>Como usar:</strong> desenhe a área num mapa grande, clicando ponto a ponto (mínimo 3). Arraste um ponto pra ajustar e dê duplo clique nele pra remover.
              </p>
            </div>
          ) : null}

          {tab === "fixa" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fixaValor}
                    onChange={(e) => setFixaValor(e.target.value)}
                    placeholder="0,00"
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo mín.</Label>
                  <Input
                    type="number"
                    value={fixaMin}
                    onChange={(e) => setFixaMin(e.target.value)}
                    placeholder="40"
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo máx.</Label>
                  <Input
                    type="number"
                    value={fixaMax}
                    onChange={(e) => setFixaMax(e.target.value)}
                    placeholder="60"
                    className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                  />
                </div>
              </div>
              <Button size="sm" className="rounded-full" onClick={salvarFixa} disabled={salvandoBasico}>
                Salvar taxa fixa
              </Button>
            </div>
          ) : null}

          {tab === "bairro" ? (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 pr-3 font-medium">Bairro</th>
                      <th className="py-3 pr-3 font-medium">Valor da taxa</th>
                      <th className="py-3 pr-3 font-medium">Tempo mínimo</th>
                      <th className="py-3 pr-3 font-medium">Tempo máximo</th>
                      <th className="py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregandoBairros ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Carregando...
                        </td>
                      </tr>
                    ) : bairros.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Nenhuma taxa por bairro cadastrada.
                        </td>
                      </tr>
                    ) : (
                      paginar(bairros, paginaBairro).itens.map((b) => (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="py-3.5 pr-3">{b.bairro}</td>
                          <td className="py-3.5 pr-3">R$ {Number(b.taxa).toFixed(2).replace(".", ",")}</td>
                          <td className="py-3.5 pr-3">{b.tempo_min != null ? `${b.tempo_min} minutos` : "-"}</td>
                          <td className="py-3.5 pr-3">{b.tempo_max != null ? `${b.tempo_max} minutos` : "-"}</td>
                          <td className="py-3.5">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => excluirBairro(b.id)}
                                aria-label={`Excluir ${b.bairro}`}
                                className="flex size-8 items-center justify-center rounded-full border bg-background text-foreground/80 transition-colors hover:bg-muted"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormBairro({ id: b.id, bairro: b.bairro, taxa: String(b.taxa), min: String(b.tempo_min ?? ""), max: String(b.tempo_max ?? "") })
                                }
                                aria-label={`Editar ${b.bairro}`}
                                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao {...paginar(bairros, paginaBairro)} onMudar={setPaginaBairro} />
            </div>
          ) : null}

          {tab === "dinamica" ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-xs">
                <strong>Atenção!</strong> Com a taxa dinâmica habilitada, você cobra de acordo com a distância. Ex.: até 2km, R$ 4,00.
              </div>
              {formDinamica ? (
                <div className="space-y-2 rounded-xl border p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Distância (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formDinamica.distancia}
                        onChange={(e) => setFormDinamica({ ...formDinamica, distancia: e.target.value })}
                        className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor da taxa</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formDinamica.valor}
                        onChange={(e) => setFormDinamica({ ...formDinamica, valor: e.target.value })}
                        className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={formDinamica.tipo} onValueChange={(v) => v && setFormDinamica({ ...formDinamica, tipo: v as string })}>
                        <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm">
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
                        <Input
                          type="number"
                          value={formDinamica.min}
                          onChange={(e) => setFormDinamica({ ...formDinamica, min: e.target.value })}
                          placeholder="40"
                          className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                        />
                        <Input
                          type="number"
                          value={formDinamica.max}
                          onChange={(e) => setFormDinamica({ ...formDinamica, max: e.target.value })}
                          placeholder="60"
                          className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setFormDinamica(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="rounded-full" onClick={salvarDinamica}>
                      Salvar taxa dinâmica
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-full"
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
                    <div key={d.id} className="flex items-center justify-between rounded-xl border p-2.5 text-sm">
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

        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {tab === "bairro" && (
            <Button className="gap-1.5 rounded-full" onClick={() => setFormBairro({ id: 0, bairro: "", taxa: "", min: "", max: "" })}>
              <Plus className="size-3.5" /> Adicionar taxa por bairro
            </Button>
          )}
          {tab === "area" && (
            <Button className="gap-1.5 rounded-full" onClick={() => setFormArea({ id: 0, nome: "", taxa: "", min: "", max: "", poligono: [] })}>
              <Plus className="size-3.5" /> Adicionar área
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={formBairro !== null} onOpenChange={(v) => !v && setFormBairro(null)}>
      <DialogContent overlayForceRender className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{formBairro?.id ? "Editar taxa por bairro" : "Adicionar taxa por bairro"}</DialogTitle>
        </DialogHeader>
        {formBairro ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Bairro</Label>
              <Input
                autoFocus
                value={formBairro.bairro}
                onChange={(e) => setFormBairro({ ...formBairro, bairro: e.target.value })}
                placeholder="Ex.: Centro"
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Valor da taxa</Label>
              <Input
                type="number"
                step="0.01"
                value={formBairro.taxa}
                onChange={(e) => setFormBairro({ ...formBairro, taxa: e.target.value })}
                placeholder="0,00"
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tempo mínimo (min)</Label>
              <Input
                type="number"
                value={formBairro.min}
                onChange={(e) => setFormBairro({ ...formBairro, min: e.target.value })}
                placeholder="40"
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tempo máximo (min)</Label>
              <Input
                type="number"
                value={formBairro.max}
                onChange={(e) => setFormBairro({ ...formBairro, max: e.target.value })}
                placeholder="60"
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="outline" className="rounded-full" onClick={() => setFormBairro(null)}>
            Cancelar
          </Button>
          <Button className="rounded-full" onClick={salvarBairro}>
            Salvar taxa por bairro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {formArea ? (
      <TaxaAreaEditorDialog
        open={formArea !== null}
        onOpenChange={(v) => {
          if (!v) setFormArea(null);
        }}
        centro={centroMapa ?? CENTRO_PADRAO}
        zoom={(centroMapa ?? CENTRO_PADRAO).zoom}
        outras={areas.filter((a) => a.id !== formArea.id).map((a) => ({ nome: a.nome, poligono: a.poligono }))}
        form={formArea}
        onFormChange={setFormArea}
        onSalvar={salvarArea}
        salvando={salvandoArea}
      />
    ) : null}
    </>
  );
}
