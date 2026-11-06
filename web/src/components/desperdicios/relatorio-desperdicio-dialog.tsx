"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MESES_NOMES, MOTIVOS, MOTIVO_LABEL, ORIGEM_LABEL, TIPOS, TIPO_LABEL, filtrosLabel, type FiltrosDesperdicio } from "@/lib/desperdicios";

const TRIGGER = "h-9 w-full rounded-full border-0 bg-muted/60 px-3.5 text-sm";

function ym(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function deslocar(ano: number, mes: number, meses: number): { ano: number; mes: number } {
  const d = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

function SeletorMes({ rotulo, ano, mes, anos, onMudar }: { rotulo: string; ano: number; mes: number; anos: number[]; onMudar: (ano: number, mes: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">{rotulo}</label>
      <div className="flex gap-2">
        <Select value={String(mes)} onValueChange={(v) => v && onMudar(ano, Number(v))}>
          <SelectTrigger className={TRIGGER}>
            <SelectValue>{() => MESES_NOMES[mes - 1]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MESES_NOMES.map((n, i) => (
              <SelectItem key={n} value={String(i + 1)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(v) => v && onMudar(Number(v), mes)}>
          <SelectTrigger className={`${TRIGGER} w-28 shrink-0`}>
            <SelectValue>{() => ano}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {anos.map((a) => (
              <SelectItem key={a} value={String(a)}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** O periodo nasce das props: quem usa recria o modal (key) a cada abertura. */
export function RelatorioDesperdicioDialog({
  open,
  onOpenChange,
  mes,
  ano,
  anos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Mes aberto no dashboard — vira o periodo inicial do relatorio. */
  mes: number;
  ano: number;
  anos: number[];
}) {
  const [de, setDe] = useState({ ano, mes });
  const [ate, setAte] = useState({ ano, mes });
  const [tipo, setTipo] = useState("todos");
  const [motivo, setMotivo] = useState("todos");
  const [origem, setOrigem] = useState("todas");
  const [busca, setBusca] = useState("");

  /* Anos do seletor: os com lancamento + os 2 anteriores ao mais antigo, pra montar periodos longos. */
  const anosOpcoes = [...new Set([...anos, ...anos.map((a) => a - 1)])].sort((x, y) => y - x);

  let inicio = ym(de.ano, de.mes);
  let fim = ym(ate.ano, ate.mes);
  if (fim < inicio) [inicio, fim] = [fim, inicio];

  const filtros: FiltrosDesperdicio = {
    de: inicio,
    ate: fim,
    tipo: tipo === "todos" ? undefined : (tipo as FiltrosDesperdicio["tipo"]),
    motivo: motivo === "todos" ? undefined : (motivo as FiltrosDesperdicio["motivo"]),
    origem: origem === "todas" ? undefined : (origem as FiltrosDesperdicio["origem"]),
    busca: busca.trim() || undefined,
  };
  const params = new URLSearchParams({ de: filtros.de, ate: filtros.ate });
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.motivo) params.set("motivo", filtros.motivo);
  if (filtros.origem) params.set("origem", filtros.origem);
  if (filtros.busca) params.set("busca", filtros.busca);

  function atalho(meses: number) {
    const inicioAtalho = deslocar(ano, mes, -(meses - 1));
    setDe(inicioAtalho);
    setAte({ ano, mes });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-4 rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Relatório de desperdício</DialogTitle>
          <p className="text-xs text-muted-foreground">Escolha os filtros e gere o relatório em PDF ou Excel. Os filtros aparecem no cabeçalho do arquivo.</p>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              [1, "Mês selecionado"],
              [3, "Últimos 3 meses"],
              [6, "Últimos 6 meses"],
              [12, "Últimos 12 meses"],
            ] as const
          ).map(([n, label]) => (
            <button key={n} type="button" onClick={() => atalho(n)} className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary">
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SeletorMes rotulo="De" ano={de.ano} mes={de.mes} anos={anosOpcoes} onMudar={(a, m) => setDe({ ano: a, mes: m })} />
          <SeletorMes rotulo="Até" ano={ate.ano} mes={ate.mes} anos={anosOpcoes} onMudar={(a, m) => setAte({ ano: a, mes: m })} />
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo</label>
            <Select value={tipo} onValueChange={(v) => v && setTipo(v as string)}>
              <SelectTrigger className={TRIGGER}>
                <SelectValue>{() => (tipo === "todos" ? "Todos" : TIPO_LABEL[tipo as keyof typeof TIPO_LABEL])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPOS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Motivo</label>
            <Select value={motivo} onValueChange={(v) => v && setMotivo(v as string)}>
              <SelectTrigger className={TRIGGER}>
                <SelectValue>{() => (motivo === "todos" ? "Todos" : MOTIVO_LABEL[motivo as keyof typeof MOTIVO_LABEL])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Origem</label>
            <Select value={origem} onValueChange={(v) => v && setOrigem(v as string)}>
              <SelectTrigger className={TRIGGER}>
                <SelectValue>{() => (origem === "todas" ? "Todas" : ORIGEM_LABEL[origem as keyof typeof ORIGEM_LABEL])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="produto">{ORIGEM_LABEL.produto}</SelectItem>
                <SelectItem value="avulsa">{ORIGEM_LABEL.avulsa}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Buscar item</label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              maxLength={80}
              placeholder="Ex.: empadão"
              className="h-9 w-full rounded-full border-0 bg-muted/60 px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-primary/5 px-3.5 py-2.5 text-xs text-primary">{filtrosLabel(filtros).join("  •  ")}</div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button variant="outline" className="gap-1.5 rounded-full" nativeButton={false} render={<a href={`/api/desperdicios/export/excel?${params}`} />}>
            <FileSpreadsheet size={15} /> Excel
          </Button>
          <Button className="gap-1.5 rounded-full" nativeButton={false} render={<a href={`/api/desperdicios/export/pdf?${params}`} />}>
            <FileText size={15} /> PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
