"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileDown,
  Hash,
  PackageX,
  Pencil,
  PieChart,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import {
  MESES_CURTOS,
  MESES_NOMES,
  MOTIVOS,
  MOTIVO_LABEL,
  TIPOS,
  TIPO_LABEL,
  type Desperdicio,
  type DesperdicioDashboard,
  type MotivoDesperdicio,
  type TipoDesperdicio,
} from "@/lib/desperdicios";
import { LancarPerdaDialog } from "./lancar-perda-dialog";
import { RelatorioDesperdicioDialog } from "./relatorio-desperdicio-dialog";

const POR_PAGINA = 10;
const COR_TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t.cor])) as Record<TipoDesperdicio, string>;
const COR_MOTIVO = Object.fromEntries(MOTIVOS.map((m) => [m.id, m.cor])) as Record<MotivoDesperdicio, string>;

function fmtQtd(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function dataBr(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function KpiTile({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tone = "neutral",
  delay,
}: {
  titulo: string;
  valor: string;
  detalhe?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "positive" | "negative" | "neutral" | "brand";
  delay: number;
}) {
  const classes = {
    positive: { text: "text-emerald-600", badge: "bg-emerald-500/10 text-emerald-600" },
    negative: { text: "text-destructive", badge: "bg-destructive/10 text-destructive" },
    neutral: { text: "text-foreground", badge: "bg-primary/10 text-primary" },
    brand: { text: "text-primary", badge: "bg-primary/10 text-primary" },
  }[tone];

  return (
    <Card
      className="group animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${delay}ms`, animationDuration: "500ms" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
        <div className={`flex size-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 ${classes.badge}`}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className={`mt-1.5 truncate text-xl font-semibold tabular-nums ${classes.text}`}>{valor}</div>
      {detalhe && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{detalhe}</div>}
    </Card>
  );
}

function SectionCard({
  titulo,
  icon: Icon,
  delay,
  acao,
  children,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  delay: number;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both p-4 transition-shadow duration-300 hover:shadow-md"
      style={{ animationDelay: `${delay}ms`, animationDuration: "500ms" }}
    >
      <CardHeader className="flex-row items-center justify-between p-0 pb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {titulo}
        </div>
        {acao}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

/** Barra horizontal que cresce ao montar (mesmo efeito do dashboard financeiro). */
function BarraAnimada({ label, valor, max, cor, extra }: { label: string; valor: number; max: number; cor: string; extra?: string }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, [valor]);

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">
          {extra && <span className="mr-2 font-normal text-muted-foreground">{extra}</span>}
          {formatBRLMilhar(valor)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-2 rounded-full transition-[width,filter] duration-700 ease-out group-hover:brightness-110"
          style={{ width: `${montado ? Math.max(3, (valor / max) * 100) : 0}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  );
}

/** Colunas dos ultimos 12 meses; o mes selecionado fica em cobre cheio. */
function GraficoEvolucao({ evolucao, mes, ano }: { evolucao: DesperdicioDashboard["evolucao"]; mes: number; ano: number }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMontado(true));
    return () => cancelAnimationFrame(id);
  }, [evolucao]);
  const max = Math.max(1, ...evolucao.map((e) => e.total));
  const media = evolucao.reduce((s, e) => s + e.total, 0) / 12;

  return (
    <div>
      <div className="relative flex h-44 items-end gap-1.5 border-b pb-px sm:gap-2">
        {media > 0 && (
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary/30" style={{ bottom: `${(media / max) * 100}%` }}>
            <span className="absolute -top-4 right-0 rounded bg-background px-1 text-[10px] text-muted-foreground">média {formatBRLMilhar(media)}</span>
          </div>
        )}
        {evolucao.map((e, i) => {
          const atual = e.mes === mes && e.ano === ano;
          return (
            <div key={`${e.ano}-${e.mes}`} className="group relative flex h-full flex-1 flex-col justify-end">
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {MESES_CURTOS[e.mes - 1]}/{String(e.ano).slice(2)} · {formatBRLMilhar(e.total)}
              </div>
              <div
                className={`w-full rounded-t-md transition-[height,background-color] duration-700 ease-out ${
                  atual ? "bg-primary shadow-[0_-6px_16px_-6px_rgba(156,85,35,.55)]" : "bg-primary/25 group-hover:bg-primary/45"
                }`}
                style={{ height: `${montado ? Math.max(e.total > 0 ? 3 : 0, (e.total / max) * 100) : 0}%`, transitionDelay: `${i * 30}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5 sm:gap-2">
        {evolucao.map((e) => (
          <div
            key={`l-${e.ano}-${e.mes}`}
            className={`flex-1 text-center text-[10px] ${e.mes === mes && e.ano === ano ? "font-semibold text-primary" : "text-muted-foreground"}`}
          >
            {MESES_CURTOS[e.mes - 1]}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DesperdicioManager({ dadosIniciais }: { dadosIniciais: DesperdicioDashboard }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoDesperdicio | "todos">("todos");
  const [filtroMotivo, setFiltroMotivo] = useState<MotivoDesperdicio | "todos">("todos");
  const [pagina, setPagina] = useState(1);
  const [lancarAberto, setLancarAberto] = useState(false);
  const [editando, setEditando] = useState<Desperdicio | null>(null);
  const [excluindo, setExcluindo] = useState<Desperdicio | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  /* Muda a cada abertura: recria os modais com o estado inicial certo (sem efeito de reset). */
  const [aberturas, setAberturas] = useState(0);

  function abrirLancamento() {
    setAberturas((n) => n + 1);
    setLancarAberto(true);
  }

  function abrirRelatorio() {
    setAberturas((n) => n + 1);
    setRelatorioAberto(true);
  }

  async function carregar(mes = dados.mes, ano = dados.ano) {
    setCarregando(true);
    try {
      const res = await fetch(`/api/desperdicios?mes=${mes}&ano=${ano}`);
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o controle de desperdício.");
        return;
      }
      setDados(data);
      setPagina(1);
    } catch {
      toast.error("Erro ao carregar o controle de desperdício.");
    } finally {
      setCarregando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    setConfirmandoExclusao(true);
    try {
      const res = await fetch("/api/desperdicios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: excluindo.id }) });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir o lançamento.");
        return;
      }
      toast.success("Lançamento excluído");
      setExcluindo(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir o lançamento.");
    } finally {
      setConfirmandoExclusao(false);
    }
  }

  const { resumo } = dados;
  const variacao = resumo.totalMesAnterior > 0 ? ((resumo.total - resumo.totalMesAnterior) / resumo.totalMesAnterior) * 100 : null;
  const tipoLider = dados.porTipo.length ? [...dados.porTipo].sort((a, b) => b.total - a.total)[0] : null;

  /* Donut por tipo (conic-gradient), igual ao fluxo de caixa do financeiro. */
  let acumulado = 0;
  const conic = dados.porTipo.length
    ? `conic-gradient(${dados.porTipo
        .map((f) => {
          const inicio = acumulado;
          acumulado += resumo.total > 0 ? (f.total / resumo.total) * 100 : 0;
          return `${COR_TIPO[f.id as TipoDesperdicio]} ${inicio}% ${acumulado}%`;
        })
        .join(", ")})`
    : "conic-gradient(var(--muted) 0% 100%)";

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return dados.lancamentos.filter(
      (d) =>
        (filtroTipo === "todos" || d.tipo === filtroTipo) &&
        (filtroMotivo === "todos" || d.motivo === filtroMotivo) &&
        (!termo || d.descricao.toLowerCase().includes(termo))
    );
  }, [dados.lancamentos, busca, filtroTipo, filtroMotivo]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const totalFiltrado = filtrados.reduce((s, d) => s + d.total, 0);

  const maxTop = Math.max(1, ...dados.topItens.map((t) => t.total));
  const maxMotivo = Math.max(1, ...dados.porMotivo.map((m) => m.total));
  const periodo = `${MESES_NOMES[dados.mes - 1]} de ${dados.ano}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Cabecalho */}
      <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-col gap-3 duration-500 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#7A3F10] text-primary-foreground shadow-[0_10px_22px_-8px_rgba(156,85,35,.6)]">
            <PackageX className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Controle de desperdício</h1>
            <p className="text-sm text-muted-foreground">Perdas de produtos, insumos e embalagens — sem mexer no estoque.</p>
          </div>
        </div>
        {/* sm:flex-nowrap + shrink-0: abrir um seletor nao pode empurrar o "Lancar perda" pra outra linha. */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5 rounded-full px-3.5 font-normal" onClick={abrirRelatorio}>
            <FileDown size={14} /> Relatórios
          </Button>
          <Select value={String(dados.mes)} onValueChange={(v) => v && carregar(Number(v), dados.ano)} disabled={carregando}>
            <SelectTrigger className="w-36 shrink-0 rounded-full px-3.5">
              <SelectValue>{() => MESES_NOMES[dados.mes - 1]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MESES_NOMES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(dados.ano)} onValueChange={(v) => v && carregar(dados.mes, Number(v))} disabled={carregando}>
            <SelectTrigger className="w-24 shrink-0 rounded-full px-3.5">
              <SelectValue>{() => dados.ano}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {dados.anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="shrink-0 gap-1.5 rounded-full px-4 shadow-[0_10px_22px_-8px_rgba(156,85,35,.55)]" onClick={abrirLancamento}>
            <Plus size={15} /> Lançar perda
          </Button>
        </div>
      </div>

      {/* Indicadores */}
      <div className={`grid grid-cols-2 gap-3 transition-opacity duration-200 lg:grid-cols-4 ${carregando ? "opacity-60" : ""}`}>
        <KpiTile titulo="Total perdido" valor={formatBRLMilhar(resumo.total)} detalhe={periodo} icon={PackageX} tone={resumo.total > 0 ? "negative" : "neutral"} delay={0} />
        <KpiTile
          titulo="vs. mês anterior"
          valor={variacao === null ? "—" : `${variacao > 0 ? "+" : ""}${variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          detalhe={`Mês anterior: ${formatBRLMilhar(resumo.totalMesAnterior)}`}
          icon={variacao !== null && variacao > 0 ? TrendingUp : TrendingDown}
          tone={variacao === null ? "neutral" : variacao > 0 ? "negative" : "positive"}
          delay={60}
        />
        <KpiTile
          titulo="Quantidade perdida"
          valor={fmtQtd(resumo.quantidade)}
          detalhe={`${resumo.lancamentos} lançamento${resumo.lancamentos === 1 ? "" : "s"}`}
          icon={Hash}
          delay={120}
        />
        <KpiTile
          titulo="Maior perda por tipo"
          valor={tipoLider ? tipoLider.label : "—"}
          detalhe={tipoLider && resumo.total > 0 ? `${((tipoLider.total / resumo.total) * 100).toFixed(0)}% do total · ${formatBRLMilhar(tipoLider.total)}` : "Sem perdas no mês"}
          icon={Trophy}
          tone="brand"
          delay={180}
        />
      </div>

      {/* Graficos */}
      <div className={`grid grid-cols-1 gap-4 transition-opacity duration-200 lg:grid-cols-5 ${carregando ? "opacity-60" : ""}`}>
        <div className="lg:col-span-2">
          <SectionCard titulo="Perdas por tipo" icon={PieChart} delay={220}>
            <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
              <div
                className="relative size-40 shrink-0 animate-in zoom-in-75 rounded-full fade-in transition-transform duration-500 ease-out hover:scale-105"
                style={{ background: conic, animationDuration: "700ms" }}
              >
                <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-popover text-center shadow-inner">
                  <span className="text-[11px] text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold tabular-nums">{formatBRLMilhar(resumo.total)}</span>
                </div>
              </div>
              <div className="w-full min-w-0 flex-1 space-y-1.5">
                {dados.porTipo.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhuma perda lançada no mês.</div>
                ) : (
                  dados.porTipo.map((f, i) => (
                    <div
                      key={f.id}
                      className="flex animate-in fade-in slide-in-from-left-1 fill-mode-both items-center gap-2 rounded-md px-1 py-1 text-xs transition-colors hover:bg-muted/60"
                      style={{ animationDelay: `${300 + i * 50}ms`, animationDuration: "400ms" }}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: COR_TIPO[f.id as TipoDesperdicio] }} />
                      {/* Nome inteiro (sem cortar); percentual e valor empilhados a direita. */}
                      <span className="min-w-0 flex-1 leading-tight">{f.label}</span>
                      <span className="shrink-0 text-right leading-tight">
                        <span className="block font-medium tabular-nums">{formatBRLMilhar(f.total)}</span>
                        <span className="block text-[11px] text-muted-foreground tabular-nums">
                          {resumo.total > 0 ? ((f.total / resumo.total) * 100).toFixed(1).replace(".", ",") : "0"}%
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="lg:col-span-3">
          <SectionCard titulo="Evolução — últimos 12 meses" icon={BarChart3} delay={260}>
            <GraficoEvolucao evolucao={dados.evolucao} mes={dados.mes} ano={dados.ano} />
          </SectionCard>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition-opacity duration-200 lg:grid-cols-2 ${carregando ? "opacity-60" : ""}`}>
        <SectionCard titulo="Itens com mais perda" icon={Trophy} delay={300}>
          <div className="space-y-3">
            {dados.topItens.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma perda lançada no mês.</div>
            ) : (
              dados.topItens.map((t, i) => (
                <BarraAnimada
                  key={`${t.descricao}-${i}`}
                  label={`${i + 1}. ${t.descricao}`}
                  valor={t.total}
                  max={maxTop}
                  cor={i === 0 ? "#7A3F10" : "#9C5523"}
                  extra={`${fmtQtd(t.quantidade)} un.`}
                />
              ))
            )}
          </div>
        </SectionCard>
        <SectionCard titulo="Perdas por motivo" icon={ClipboardList} delay={340}>
          <div className="space-y-3">
            {dados.porMotivo.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma perda lançada no mês.</div>
            ) : (
              dados.porMotivo.map((m) => (
                <BarraAnimada
                  key={m.id}
                  label={m.label}
                  valor={m.total}
                  max={maxMotivo}
                  cor={COR_MOTIVO[m.id as MotivoDesperdicio]}
                  extra={resumo.total > 0 ? `${((m.total / resumo.total) * 100).toFixed(0)}%` : undefined}
                />
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Lancamentos */}
      <SectionCard titulo={`Lançamentos de ${periodo}`} icon={ClipboardList} delay={380}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar item..."
              className="h-9 w-full rounded-full border-0 bg-muted/60 pr-4 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <Select
            value={filtroTipo}
            onValueChange={(v) => {
              setFiltroTipo((v as TipoDesperdicio | "todos") ?? "todos");
              setPagina(1);
            }}
          >
            <SelectTrigger className="h-9 w-full rounded-full sm:w-44">
              <SelectValue>{() => (filtroTipo === "todos" ? "Todos os tipos" : TIPO_LABEL[filtroTipo])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {TIPOS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filtroMotivo}
            onValueChange={(v) => {
              setFiltroMotivo((v as MotivoDesperdicio | "todos") ?? "todos");
              setPagina(1);
            }}
          >
            <SelectTrigger className="h-9 w-full rounded-full sm:w-44">
              <SelectValue>{() => (filtroMotivo === "todos" ? "Todos os motivos" : MOTIVO_LABEL[filtroMotivo])}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os motivos</SelectItem>
              {MOTIVOS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PackageX className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">{dados.lancamentos.length === 0 ? "Nenhuma perda lançada neste mês" : "Nenhum lançamento com esses filtros"}</div>
              <div className="text-xs text-muted-foreground">
                {dados.lancamentos.length === 0 ? "Registre embalagens, insumos e produtos vencidos para acompanhar o desperdício." : "Ajuste a busca ou os filtros."}
              </div>
            </div>
            {dados.lancamentos.length === 0 && (
              <Button size="sm" className="gap-1.5 rounded-full" onClick={abrirLancamento}>
                <Plus size={14} /> Lançar primeira perda
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2.5 pr-3 font-medium">Data</th>
                    <th className="py-2.5 pr-3 font-medium">Item</th>
                    <th className="py-2.5 pr-3 font-medium">Tipo</th>
                    <th className="py-2.5 pr-3 font-medium">Motivo</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Qtd</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Custo un.</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Total</th>
                    <th className="py-2.5 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((d) => (
                    <tr key={d.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{dataBr(d.data)}</td>
                      <td className="max-w-[240px] py-2.5 pr-3">
                        <div className="truncate font-medium">{d.descricao}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {d.origem === "avulsa" ? "Despesa avulsa" : "Produto cadastrado"}
                          {d.observacao ? ` · ${d.observacao}` : ""}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: COR_TIPO[d.tipo] }} />
                          {TIPO_LABEL[d.tipo]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{MOTIVO_LABEL[d.motivo]}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{fmtQtd(d.quantidade)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">{formatBRLMilhar(d.custoUnitario)}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatBRLMilhar(d.total)}</td>
                      <td className="py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setExcluindo(d)}
                            aria-label={`Excluir ${d.descricao}`}
                            className="flex size-8 items-center justify-center rounded-full border bg-background text-foreground/80 transition-colors hover:bg-muted"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditando(d)}
                            aria-label={`Editar ${d.descricao}`}
                            className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-col-reverse items-center justify-between gap-3 border-t pt-3 sm:flex-row">
              <div className="flex items-center gap-1">
                {totalPaginas > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPagina(paginaAtual - 1)}
                      disabled={paginaAtual <= 1}
                      aria-label="Página anterior"
                      className="flex size-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="px-2 text-xs text-muted-foreground tabular-nums">
                      {paginaAtual} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina(paginaAtual + 1)}
                      disabled={paginaAtual >= totalPaginas}
                      aria-label="Próxima página"
                      className="flex size-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {filtrados.length} lançamento{filtrados.length === 1 ? "" : "s"} · Total:{" "}
                </span>
                <span className="font-semibold tabular-nums text-primary">{formatBRLMilhar(totalFiltrado)}</span>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      <LancarPerdaDialog
        key={editando ? `e${editando.id}` : `n${aberturas}`}
        open={lancarAberto || editando !== null}
        editando={editando}
        onOpenChange={(v) => {
          if (!v) {
            setLancarAberto(false);
            setEditando(null);
          }
        }}
        onSalvo={(data) => {
          /* Perda lancada em outro mes: a tela vai pra ele, senao o lancamento "some" da tabela. */
          const [a, m] = data.split("-").map(Number);
          if (a !== dados.ano || m !== dados.mes) toast.info(`Lançamento registrado em ${MESES_NOMES[m - 1]} de ${a} — mostrando esse mês.`);
          carregar(m, a);
        }}
      />
      <RelatorioDesperdicioDialog key={`r${aberturas}`} open={relatorioAberto} onOpenChange={setRelatorioAberto} mes={dados.mes} ano={dados.ano} anos={dados.anos} />
      <ConfirmDialog
        open={excluindo !== null}
        onOpenChange={(v) => !v && setExcluindo(null)}
        titulo="Excluir lançamento?"
        descricao={excluindo ? `A perda de "${excluindo.descricao}" (${formatBRLMilhar(excluindo.total)}) será removida. Essa ação não pode ser desfeita.` : ""}
        confirmando={confirmandoExclusao}
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </div>
  );
}
