"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Loader2, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PontoMapa } from "@/components/settings/taxa-area-mapa";

const TaxaAreaMapa = dynamic(() => import("@/components/settings/taxa-area-mapa").then((m) => m.TaxaAreaMapa), { ssr: false });

export type TaxaAreaForm = { id: number; nome: string; taxa: string; min: string; max: string; poligono: PontoMapa[] };

type ResultadoBairro = { nome: string; descricao: string; poligono: PontoMapa[] };

export function TaxaAreaEditorDialog({
  open,
  onOpenChange,
  centro,
  zoom,
  outras,
  form,
  onFormChange,
  onSalvar,
  salvando,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  centro: PontoMapa;
  zoom?: number;
  outras: { nome: string; poligono: PontoMapa[] }[];
  form: TaxaAreaForm;
  onFormChange: (f: TaxaAreaForm) => void;
  onSalvar: () => void;
  salvando: boolean;
}) {
  const [buscaTermo, setBuscaTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultadosBusca, setResultadosBusca] = useState<ResultadoBairro[] | null>(null);

  async function buscarContorno() {
    const termo = buscaTermo.trim();
    if (termo.length < 2) return;
    setBuscando(true);
    setResultadosBusca(null);
    try {
      const res = await fetch(`/api/settings/taxa-area/buscar-bairro?q=${encodeURIComponent(termo)}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao buscar o bairro.");
        return;
      }
      setResultadosBusca(data.resultados);
      if (data.resultados.length === 0) toast.info("Nenhum contorno encontrado — desenhe manualmente no mapa.");
    } catch {
      toast.error("Erro ao buscar o bairro.");
    } finally {
      setBuscando(false);
    }
  }

  function usarContorno(r: ResultadoBairro) {
    onFormChange({ ...form, poligono: r.poligono, nome: form.nome.trim() ? form.nome : r.nome });
    setResultadosBusca(null);
    setBuscaTermo("");
    toast.success(`Contorno de ${r.nome} carregado — ajuste os pontos se precisar.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex h-[94vh] max-h-[94vh] w-[96vw] max-w-[1440px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1440px]">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <div className="text-sm font-semibold">{form.id ? "Editar área de entrega" : "Nova área de entrega"}</div>
            <div className="text-xs text-muted-foreground">Clique no mapa para desenhar os pontos da área (mínimo 3).</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="relative min-h-[46vh] flex-1 bg-muted sm:min-h-0">
            <TaxaAreaMapa centro={centro} zoom={zoom} poligono={form.poligono} onChange={(p) => onFormChange({ ...form, poligono: p })} outras={outras} />
          </div>

          <div className="flex w-full flex-col border-t sm:w-[340px] sm:border-t-0 sm:border-l">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Buscar contorno real do bairro</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={buscaTermo}
                    onChange={(e) => setBuscaTermo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && buscarContorno()}
                    placeholder="Ex.: Bonsucesso"
                  />
                  <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={buscarContorno} disabled={buscando || buscaTermo.trim().length < 2}>
                    {buscando ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Carrega o contorno oficial (OpenStreetMap) como ponto de partida — você ainda pode ajustar os pontos.</p>
                {resultadosBusca && resultadosBusca.length > 0 ? (
                  <div className="space-y-1 rounded-lg border p-1.5">
                    {resultadosBusca.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => usarContorno(r)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <div className="font-medium">{r.nome}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{r.descricao}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                <span>{form.poligono.length} ponto(s) · mínimo 3</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2"
                  onClick={() => onFormChange({ ...form, poligono: form.poligono.slice(0, -1) })}
                  disabled={form.poligono.length === 0}
                >
                  <Undo2 className="size-3.5" /> Desfazer
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nome da área</Label>
                  <Input value={form.nome} onChange={(e) => onFormChange({ ...form, nome: e.target.value })} placeholder="Ex.: Zona Centro" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Valor da taxa</Label>
                  <Input type="number" step="0.01" value={form.taxa} onChange={(e) => onFormChange({ ...form, taxa: e.target.value })} placeholder="0,00" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo mín.</Label>
                  <Input type="number" value={form.min} onChange={(e) => onFormChange({ ...form, min: e.target.value })} placeholder="40" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo máx.</Label>
                  <Input type="number" value={form.max} onChange={(e) => onFormChange({ ...form, max: e.target.value })} placeholder="60" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={onSalvar} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar área"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
