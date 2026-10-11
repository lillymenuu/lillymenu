"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Plus, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetailDialog } from "@/components/ordermanager/order-detail-dialog";
import { PedidosAgendadosDialog } from "@/components/settings/pedidos-agendados-dialog";
import { usePosOverlay } from "@/components/pos/pos-overlay-provider";
import { formatBRL } from "@/components/ordermanager/constants";
import type { ConfiguracoesDetalhe } from "@/lib/settings";
import type { Motoboy, Pedido } from "@/lib/pedidos";
import { cn } from "cn";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  preparando: "Em preparo",
  entrega: "Em entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const STATUS_CORES: Record<string, { bg: string; fg: string }> = {
  pendente: { bg: "#f1f5f9", fg: "#64748b" },
  aceito: { bg: "#e0f2fe", fg: "#0369a1" },
  preparando: { bg: "#fef3c7", fg: "#92400e" },
  entrega: { bg: "#fee2e2", fg: "#be123c" },
  finalizado: { bg: "#dcfce7", fg: "#166534" },
  cancelado: { bg: "#fee2e2", fg: "#991b1b" },
};

const TIPO_PILL: Record<string, { label: string; bg: string; fg: string }> = {
  entrega: { label: "Entrega", bg: "#fde68a", fg: "#92400e" },
  retirada: { label: "Retirada", bg: "#dbeafe", fg: "#2563eb" },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function diaDoAgendamento(agendamento: string) {
  return agendamento.slice(0, 10);
}

function horaDoAgendamento(agendamento: string) {
  return agendamento.slice(11, 16);
}

function formatDiaExtenso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const data = new Date(y, m - 1, d);
  const semana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][data.getDay()];
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${d} de ${MESES[m - 1].toLowerCase()}`;
}

type Celula = { iso: string; dia: number; mesCelula: number; anoCelula: number; noMes: boolean };

function montarGrade(ano: number, mes: number): Celula[] {
  const primeiroDia = new Date(ano, mes - 1, 1);
  const offset = primeiroDia.getDay();
  const inicio = new Date(ano, mes - 1, 1 - offset);
  const celulas: Celula[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    celulas.push({
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      dia: d.getDate(),
      mesCelula: d.getMonth() + 1,
      anoCelula: d.getFullYear(),
      noMes: d.getMonth() === mes - 1,
    });
  }
  return celulas;
}

export function ScheduledOrdersCalendar({
  anoInicial,
  mesInicial,
  pedidosIniciais,
  motoboys,
  agendamento,
  phpAdminUrl,
}: {
  anoInicial: number;
  mesInicial: number;
  pedidosIniciais: Pedido[];
  motoboys: Motoboy[];
  agendamento: ConfiguracoesDetalhe["agendamento"];
  phpAdminUrl: string;
}) {
  const { abrir: abrirPos, aberto: posAberto } = usePosOverlay();

  const [ano, setAno] = useState(anoInicial);
  const [mes, setMes] = useState(mesInicial);
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [configAtual, setConfigAtual] = useState(agendamento);

  const primeiraRenderRef = useRef(true);
  const posAbertoRef = useRef(posAberto);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch(`/api/scheduled-orders?ano=${ano}&mes=${mes}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar os pedidos agendados.");
        return;
      }
      setPedidos(data.pedidos);
    } catch {
      toast.error("Erro ao carregar os pedidos agendados.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes]);

  // Overlay do balcao fechou (pedido salvo ou cancelado): recarrega o mes pra
  // o calendario refletir na hora, sem precisar de F5 — mesmo padrao usado nos
  // outros lugares do admin que reabrem dados depois de um modal/overlay fechar.
  useEffect(() => {
    if (posAbertoRef.current && !posAberto) carregar();
    posAbertoRef.current = posAberto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posAberto]);

  async function recarregarConfig() {
    try {
      const res = await fetch("/api/settings/detalhe");
      const data = await res.json();
      if (data.ok) setConfigAtual(data.agendamento);
    } catch {
      // silencioso — mantem a config anterior na tela
    }
  }

  const pedidosPorDia = useMemo(() => {
    const mapa = new Map<string, Pedido[]>();
    for (const p of pedidos) {
      if (!p.agendamento) continue;
      const dia = diaDoAgendamento(p.agendamento);
      const lista = mapa.get(dia) ?? [];
      lista.push(p);
      mapa.set(dia, lista);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => (a.agendamento ?? "").localeCompare(b.agendamento ?? ""));
    return mapa;
  }, [pedidos]);

  const celulas = useMemo(() => montarGrade(ano, mes), [ano, mes]);
  const hoje = hojeISO();

  function mudarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) {
      novoMes = 1;
      novoAno++;
    } else if (novoMes < 1) {
      novoMes = 12;
      novoAno--;
    }
    setMes(novoMes);
    setAno(novoAno);
    setDiaSelecionado(null);
  }

  function irParaHoje() {
    const h = new Date();
    setAno(h.getFullYear());
    setMes(h.getMonth() + 1);
    setDiaSelecionado(hojeISO());
  }

  function clicarCelula(cel: Celula) {
    if (!cel.noMes) {
      setMes(cel.mesCelula);
      setAno(cel.anoCelula);
    }
    setDiaSelecionado(cel.iso);
  }

  function lancarPedidoNoDia(diaIso: string) {
    abrirPos(undefined, { agendamentoPrefillData: diaIso });
  }

  const totalMes = pedidos.length;
  const pedidosDoDiaSelecionado = diaSelecionado ? pedidosPorDia.get(diaSelecionado) ?? [] : [];
  const diaSelecionadoEhPassado = diaSelecionado !== null && diaSelecionado < hoje;

  const proximosPedidos = useMemo(
    () => [...pedidos].filter((p) => !!p.agendamento).sort((a, b) => (a.agendamento ?? "").localeCompare(b.agendamento ?? "")),
    [pedidos]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Pedidos agendados</h1>
          <p className="text-sm text-muted-foreground">Acompanhe e lance pedidos agendados direto pelo calendário.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings2 size={14} /> Configurar regras
          </Button>
          <button
            type="button"
            onClick={() => abrirPos(undefined, { agendamentoPrefillData: diaSelecionado ?? undefined })}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
          >
            <Plus size={14} /> Lançar pedido agendado
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-44 text-center text-sm font-semibold">
            {MESES[mes - 1]} de {ano}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => mudarMes(1)} aria-label="Próximo mês">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {totalMes} pedido{totalMes === 1 ? "" : "s"} agendado{totalMes === 1 ? "" : "s"} neste mês
          </span>
          <Button variant="outline" size="sm" onClick={irParaHoje}>
            Hoje
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-[1fr_360px] lg:overflow-visible">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className={cn("grid flex-1 grid-cols-7 auto-rows-[minmax(5.25rem,1fr)]", carregando && "opacity-60")}>
            {celulas.map((cel) => {
              const pedidosDoDia = pedidosPorDia.get(cel.iso) ?? [];
              const temPedidos = pedidosDoDia.length > 0;
              const ehHoje = cel.iso === hoje;
              const ehPassado = cel.iso < hoje;
              const ehSelecionado = cel.iso === diaSelecionado;
              const temPendente = pedidosDoDia.some((p) => p.status === "pendente" || p.status === "aceito");

              return (
                <button
                  key={cel.iso}
                  type="button"
                  onClick={() => clicarCelula(cel)}
                  className={cn(
                    "flex flex-col items-start gap-1.5 border-r border-b border-border p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
                    !cel.noMes && "bg-muted/20",
                    cel.noMes && !ehSelecionado && "hover:bg-muted/40",
                    ehSelecionado && "bg-primary/10"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                      ehHoje
                        ? "bg-primary text-primary-foreground"
                        : !cel.noMes
                          ? "text-muted-foreground/50"
                          : ehPassado
                            ? "text-muted-foreground"
                            : "text-foreground"
                    )}
                  >
                    {cel.dia}
                  </span>
                  {temPedidos ? (
                    <span
                      className={cn(
                        "mt-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        temPendente ? "bg-amber-100 text-amber-800" : "bg-primary/10 text-primary"
                      )}
                    >
                      <CalendarClock className="size-3" />
                      {pedidosDoDia.length}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
          {diaSelecionado ? (
            <DiaPainel
              diaIso={diaSelecionado}
              pedidos={pedidosDoDiaSelecionado}
              ehPassado={diaSelecionadoEhPassado}
              onFechar={() => setDiaSelecionado(null)}
              onAbrirPedido={setDetalheId}
              onLancarPedido={lancarPedidoNoDia}
            />
          ) : (
            <ResumoMesPainel
              mes={mes}
              ano={ano}
              pedidos={proximosPedidos}
              onAbrirPedido={setDetalheId}
              onLancarPedido={() => abrirPos(undefined, { agendamentoPrefillData: hoje })}
            />
          )}
        </div>
      </div>

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={carregar}
      />

      <PedidosAgendadosDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        agendamento={configAtual}
        onSalvo={recarregarConfig}
      />
    </div>
  );
}

function PedidoRow({ pedido, onClick }: { pedido: Pedido; onClick: () => void }) {
  const statusCor = STATUS_CORES[pedido.status] ?? STATUS_CORES.pendente;
  const tipoPill = TIPO_PILL[pedido.tipo] ?? TIPO_PILL.retirada;
  const hora = pedido.agendamento ? horaDoAgendamento(pedido.agendamento) : "--:--";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-xs font-semibold text-foreground">
        {hora}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{pedido.nome}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: tipoPill.bg, color: tipoPill.fg }}>
            {tipoPill.label}
          </span>
          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: statusCor.bg, color: statusCor.fg }}>
            {STATUS_LABELS[pedido.status] ?? pedido.status}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-sm font-semibold">{formatBRL(pedido.total)}</div>
    </button>
  );
}

function DiaPainel({
  diaIso,
  pedidos,
  ehPassado,
  onFechar,
  onAbrirPedido,
  onLancarPedido,
}: {
  diaIso: string;
  pedidos: Pedido[];
  ehPassado: boolean;
  onFechar: () => void;
  onAbrirPedido: (id: number) => void;
  onLancarPedido: (diaIso: string) => void;
}) {
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b p-4">
        <div>
          <div className="text-sm font-semibold">{formatDiaExtenso(diaIso)}</div>
          <div className="text-xs text-muted-foreground">
            {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"} agendado{pedidos.length === 1 ? "" : "s"}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onFechar} aria-label="Voltar para o resumo do mês">
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {pedidos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarClock className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum pedido agendado neste dia.</p>
          </div>
        ) : (
          pedidos.map((p) => <PedidoRow key={p.id} pedido={p} onClick={() => onAbrirPedido(p.id)} />)
        )}
      </div>

      {!ehPassado ? (
        <div className="shrink-0 border-t p-3">
          <Button className="w-full" onClick={() => onLancarPedido(diaIso)}>
            <Plus className="size-4" /> Lançar pedido agendado para este dia
          </Button>
        </div>
      ) : null}
    </>
  );
}

function ResumoMesPainel({
  mes,
  ano,
  pedidos,
  onAbrirPedido,
  onLancarPedido,
}: {
  mes: number;
  ano: number;
  pedidos: Pedido[];
  onAbrirPedido: (id: number) => void;
  onLancarPedido: () => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b p-4">
        <div className="text-sm font-semibold">Resumo de {MESES[mes - 1]}</div>
        <div className="text-xs text-muted-foreground">Selecione um dia no calendário para ver os detalhes.</div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {pedidos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
            <CalendarClock className="size-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">Nenhum pedido agendado em {MESES[mes - 1].toLowerCase()} de {ano}.</p>
              <p className="mt-1 text-xs text-muted-foreground">Pedidos feitos pela loja ou pelo balcão com agendamento aparecem aqui.</p>
            </div>
            <Button size="sm" onClick={onLancarPedido}>
              <Plus className="size-4" /> Lançar pedido agendado
            </Button>
          </div>
        ) : (
          pedidos.map((p) => <PedidoRow key={p.id} pedido={p} onClick={() => onAbrirPedido(p.id)} />)
        )}
      </div>
    </>
  );
}
