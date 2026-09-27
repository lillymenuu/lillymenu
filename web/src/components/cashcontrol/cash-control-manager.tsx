"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wallet, Clock, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import { OpenCloseDialog } from "@/components/cashcontrol/open-close-dialog";
import { EditAberturaDialog } from "@/components/cashcontrol/edit-abertura-dialog";
import { CaixaDetalheDialog } from "@/components/cashcontrol/caixa-detalhe-dialog";
import { LancarSaidaDialog } from "@/components/cashcontrol/lancar-saida-dialog";
import { RegistrarSuprimentoDialog } from "@/components/cashcontrol/registrar-suprimento-dialog";
import { SaidasCard } from "@/components/cashcontrol/saidas-card";
import type { CaixaHistoricoResposta, CaixaMovimento, CaixaResumoResposta } from "@/lib/caixa";
import { cn } from "cn";

const PILLS = [
  { forma: "todos", label: "Todos" },
  { forma: "pix", label: "Pix" },
  { forma: "dinheiro", label: "Dinheiro" },
  { forma: "credito", label: "Crédito" },
  { forma: "debito", label: "Débito" },
  { forma: "voucher", label: "Voucher" },
  { forma: "outro", label: "Outros" },
] as const;

const FORMA_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  voucher: "Voucher",
  outro: "Outros",
};

function PageButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md border text-xs font-semibold text-foreground transition-colors",
        disabled ? "cursor-not-allowed opacity-40" : "hover:border-primary hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

function HistoricoCard({
  titulo,
  tipo,
  refreshKey,
  onSelecionar,
}: {
  titulo: string;
  tipo: "fechado" | "completo";
  refreshKey: number;
  onSelecionar: (id: number) => void;
}) {
  const [dados, setDados] = useState<CaixaHistoricoResposta | null>(null);
  const [pagina, setPagina] = useState(1);

  async function carregar(p: number) {
    try {
      const res = await fetch(`/api/cashcontrol/historico?tipo=${tipo}&pagina=${p}`, { cache: "no-store" });
      const data: CaixaHistoricoResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o histórico.");
        return;
      }
      setDados(data);
      setPagina(data.pagina);
    } catch {
      toast.error("Erro ao carregar o histórico.");
    }
  }

  useEffect(() => {
    carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, refreshKey]);

  return (
    <Card>
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">{titulo}</h3>
        </div>
        <div className="flex flex-col gap-1.5">
          {dados && dados.itens.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum caixa encontrado.</p>
          )}
          {dados?.itens.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelecionar(item.id)}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    item.status === "aberto" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.status === "aberto" ? "Aberto" : "Fechado"}
                </span>
                <span>{item.operador ?? "-"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDataHoraCurta(item.aberto_em)}
                {item.fechado_em ? ` · ${formatDataHoraCurta(item.fechado_em)}` : ""}
              </div>
            </button>
          ))}
        </div>
        {dados && dados.total > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>
              Mostrando {dados.mostrando_de} a {dados.mostrando_ate} de {dados.total}
            </span>
            <div className="flex items-center gap-1">
              <PageButton disabled={pagina <= 1} onClick={() => carregar(1)}>
                «
              </PageButton>
              <PageButton disabled={pagina <= 1} onClick={() => carregar(Math.max(1, pagina - 1))}>
                ‹
              </PageButton>
              <span className="px-1.5">
                Página {pagina} de {dados.total_paginas}
              </span>
              <PageButton disabled={pagina >= dados.total_paginas} onClick={() => carregar(Math.min(dados.total_paginas, pagina + 1))}>
                ›
              </PageButton>
              <PageButton disabled={pagina >= dados.total_paginas} onClick={() => carregar(dados.total_paginas)}>
                »
              </PageButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CashControlManager({ dadosIniciais }: { dadosIniciais: CaixaResumoResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [historicoRefresh, setHistoricoRefresh] = useState(0);
  const [openCloseAberto, setOpenCloseAberto] = useState(false);
  const [editarAberturaAberto, setEditarAberturaAberto] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [suprimentoAberto, setSuprimentoAberto] = useState(false);
  const [lancarSaidaAberto, setLancarSaidaAberto] = useState(false);
  const [pillAtiva, setPillAtiva] = useState<(typeof PILLS)[number]["forma"]>("todos");

  async function recarregar() {
    try {
      const res = await fetch("/api/cashcontrol/resumo", { cache: "no-store" });
      const data: CaixaResumoResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao atualizar o caixa.");
        return;
      }
      setDados(data);
      setHistoricoRefresh((v) => v + 1);
    } catch {
      toast.error("Erro ao atualizar o caixa.");
    }
  }

  const caixa = dados.caixa;
  const resumo = dados.resumo;
  const movimentos = useMemo<CaixaMovimento[]>(() => dados.movimentos ?? [], [dados.movimentos]);

  const movimentosFiltrados = pillAtiva === "todos" ? movimentos : movimentos.filter((m) => m.forma === pillAtiva);
  const entradaFiltrada = movimentosFiltrados.filter((m) => m.direcao === "entrada").reduce((acc, m) => acc + m.valor, 0);
  const saidaTotal = resumo?.sangrias_total ?? 0;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Controle de caixa</h1>
          {caixa && <p className="text-sm text-muted-foreground">Resumo do período: Hoje</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {caixa && (
            <Button variant="outline" className="rounded-lg font-normal" onClick={() => setEditarAberturaAberto(true)}>
              Editar horário de abertura
            </Button>
          )}
          <Button className="gap-1.5 rounded-lg font-normal" onClick={() => setOpenCloseAberto(true)}>
            <Wallet className="size-4" /> {caixa ? "Fechar caixa" : "Abrir caixa"}
          </Button>
        </div>
      </div>

      {!caixa && (
        <HistoricoCard titulo="Histórico de caixa" tipo="fechado" refreshKey={historicoRefresh} onSelecionar={setDetalheId} />
      )}

      {caixa && resumo && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Resumo</div>
                <span className="text-xs text-muted-foreground">Aberto em {formatDataHoraCurta(caixa.aberto_em)}</span>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
                <div className="mb-1 text-xs font-medium text-muted-foreground uppercase">Saldo inicial</div>
                <div className="flex justify-between">
                  <span>Dinheiro</span>
                  <strong className="text-primary">{formatBRL(resumo.saldo_inicial_dia)}</strong>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
                <div className="mb-1 text-xs font-medium text-muted-foreground uppercase">Entradas</div>
                {(["pix", "debito", "credito", "dinheiro", "voucher", "outro"] as const).map((forma) => (
                  <div key={forma} className="flex justify-between">
                    <span className="text-muted-foreground">{FORMA_LABELS[forma]}</span>
                    <strong className="text-emerald-600">{formatBRL(resumo.pagamentos[forma])}</strong>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
                <div className="mb-1 text-xs font-medium text-muted-foreground uppercase">Saldo final</div>
                <div className="flex justify-between">
                  <span>Dinheiro em caixa</span>
                  <strong className="text-primary">{formatBRL(resumo.saldo_esperado)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total</span>
                  <strong className="text-primary">{formatBRL(resumo.saldo_total)}</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1.5">
                {PILLS.map((p) => (
                  <button
                    key={p.forma}
                    type="button"
                    onClick={() => setPillAtiva(p.forma)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      pillAtiva === p.forma ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Movimentações</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg font-normal" onClick={() => setSuprimentoAberto(true)}>
                    <Plus className="size-3.5" /> Registrar suprimento
                  </Button>
                  <Button size="sm" className="gap-1.5 rounded-lg font-normal" onClick={() => setLancarSaidaAberto(true)}>
                    <Plus className="size-3.5" /> Lançar saída
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Entrada</div>
                  <div className="font-semibold text-emerald-600">{formatBRL(entradaFiltrada)}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Saída</div>
                  <div className="font-semibold text-destructive">{formatBRL(saidaTotal)}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Saldo</div>
                  <div className="font-semibold">{formatBRL(entradaFiltrada - saidaTotal)}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total sem taxa de entrega</div>
                  <div className="font-semibold">{formatBRL(resumo.total_sem_taxa_entrega)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {movimentosFiltrados.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma entrada ou saída registrada</p>
                )}
                {movimentosFiltrados.map((m) => (
                  <div key={m.uid} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div className="flex flex-col">
                      <span>{FORMA_LABELS[m.forma] ?? "Outros"}</span>
                      <span className="text-xs text-muted-foreground">{m.observacoes ?? "-"}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={m.direcao === "saida" ? "text-destructive" : "text-emerald-600"}>
                        {m.direcao === "saida" ? "-" : "+"}
                        {formatBRL(m.valor)}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDataHoraCurta(m.criado_em)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <SaidasCard refreshKey={historicoRefresh} />

          <HistoricoCard titulo="Histórico completo" tipo="completo" refreshKey={historicoRefresh} onSelecionar={setDetalheId} />
        </>
      )}

      <OpenCloseDialog
        open={openCloseAberto}
        onOpenChange={setOpenCloseAberto}
        caixaAtual={caixa}
        totalVendasAtual={resumo?.total_vendas ?? 0}
        onSucesso={recarregar}
      />
      <EditAberturaDialog
        open={editarAberturaAberto}
        onOpenChange={setEditarAberturaAberto}
        caixaAtual={caixa}
        onSucesso={recarregar}
      />
      <CaixaDetalheDialog caixaId={detalheId} onOpenChange={(v) => !v && setDetalheId(null)} />
      <LancarSaidaDialog
        open={lancarSaidaAberto}
        onOpenChange={setLancarSaidaAberto}
        saldoDisponivel={resumo?.saldo_esperado ?? 0}
        onSucesso={recarregar}
      />
      <RegistrarSuprimentoDialog open={suprimentoAberto} onOpenChange={setSuprimentoAberto} onSucesso={recarregar} />
    </div>
  );
}
