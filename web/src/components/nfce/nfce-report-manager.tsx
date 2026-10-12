"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Filter, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import type { listarNotasFiscais } from "@/db/queries/nfce";

type Dados = Awaited<ReturnType<typeof listarNotasFiscais>>;

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "Últimos 7 dias",
  "30dias": "Últimos 30 dias",
  customizado: "Customizado",
};

const PAGAMENTO_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Transferência PIX",
  credito: "Cartão de Crédito",
  debito: "Cartão de Débito",
  fiado: "Fiado",
  cashback: "Cashback",
};

const STATUS_INFO: Record<string, { label: string; bg: string; fg: string }> = {
  processando: { label: "Processando", bg: "#fef3c7", fg: "#92400e" },
  concluido: { label: "Autorizado o uso da NFC-e", bg: "#dcfce7", fg: "#15803d" },
  rejeitado: { label: "Rejeitado", bg: "#fee2e2", fg: "#b91c1c" },
  denegado: { label: "Denegado", bg: "#fee2e2", fg: "#b91c1c" },
  cancelado: { label: "Cancelado", bg: "#f3f4f6", fg: "#6b7280" },
  erro: { label: "Erro no envio", bg: "#fee2e2", fg: "#b91c1c" },
};

function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurto(dataHora: string): string {
  const [data, hora] = dataHora.split(" ");
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ""}`;
}

function descricaoPeriodo(periodo: string): string {
  if (periodo === "hoje") return "Você está vendo as notas emitidas de hoje.";
  if (periodo === "7dias") return "Você está vendo as notas emitidas nos últimos 7 dias.";
  if (periodo === "customizado") return "Você está vendo as notas emitidas no período selecionado.";
  return "Você está vendo as notas emitidas nos últimos 30 dias.";
}

export function NfceReportManager({ dadosIniciais }: { dadosIniciais: Dados }) {
  const [periodo, setPeriodo] = useState("30dias");
  const [dataIni, setDataIni] = useState(dadosIniciais.inicio.slice(0, 10));
  const [dataFim, setDataFim] = useState(dadosIniciais.fim.slice(0, 10));
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const primeiraRenderRef = useRef(true);

  async function carregar() {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ periodo });
      if (periodo === "customizado") {
        qs.set("data_ini", dataIni);
        qs.set("data_fim", dataFim);
      }
      const res = await fetch(`/api/nfce/relatorio?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o relatório.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar o relatório.");
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
  }, [periodo, dataIni, dataFim]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Relatório de notas emitidas</h1>
        <p className="text-sm text-muted-foreground">NFC-e emitidas pela sua loja via PlugNotas.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Filter size={16} />
            </div>
            <div>
              <div className="text-sm font-medium">Filtros para notas emitidas</div>
              <p className="text-xs text-muted-foreground">
                {descricaoPeriodo(periodo)} {dados.notas.length} {dados.notas.length === 1 ? "nota encontrada" : "notas encontradas"}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => setPeriodo(v ?? "30dias")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIODO_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodo === "customizado" ? (
              <DateRangePicker dataIni={dataIni} dataFim={dataFim} onChange={(ini, fim) => { setDataIni(ini); setDataFim(fim); }} />
            ) : (
              <span className="flex h-8 items-center rounded-lg border border-input px-2.5 text-xs text-muted-foreground">
                {formatCurto(dados.inicio)} — {formatCurto(dados.fim)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>N. NFC-e</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Arquivos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : dados.notas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhuma NFC-e encontrada para o período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                dados.notas.map((n) => {
                  const statusInfo = STATUS_INFO[n.status] ?? STATUS_INFO.erro;
                  return (
                    <TableRow key={n.pedidoId}>
                      <TableCell className="font-medium">{n.pedidoCodigo ?? `#${n.pedidoId}`}</TableCell>
                      <TableCell>{n.numero ?? "-"}</TableCell>
                      <TableCell>{n.serie ?? "-"}</TableCell>
                      <TableCell>
                        <span className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: statusInfo.bg, color: statusInfo.fg }}>
                          {statusInfo.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{formatBRL(n.valorTotal)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {n.pagamentos.length > 0 ? n.pagamentos.map((p) => PAGAMENTO_LABELS[p] ?? p).join(" + ") : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{n.protocolo ?? "-"}</TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground" title={n.chave ?? ""}>
                        {n.chave ?? "-"}
                      </TableCell>
                      <TableCell>
                        {n.pdfUrl ? (
                          <a
                            href={n.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                          >
                            <Printer size={12} /> Imprimir NFC-e
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
