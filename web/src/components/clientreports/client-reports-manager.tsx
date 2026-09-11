"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/order-list/date-range-picker";
import { ClientePerfilDialog } from "@/components/cliente/cliente-perfil-dialog";
import { formatDataCurta } from "@/components/cliente/types";
import { formatBRL } from "@/components/ordermanager/constants";
import type {
  RelatoriosClientesParams,
  RelatoriosClientesResposta,
} from "@/lib/relatoriosClientes";
import { cn } from "cn";

const ORDENAR_ITEMS: Record<string, string> = {
  total_gasto: "Maior valor gasto",
  pedidos: "Mais pedidos",
  ticket_medio: "Maior ticket médio",
  ultimo_pedido: "Último pedido",
  nome: "Nome A-Z",
};

const PERIODO_ITEMS: Record<string, string> = {
  "7": "7 dias",
  "15": "15 dias",
  "30": "30 dias",
  "60": "60 dias",
  "90": "90 dias",
  "365": "1 ano",
  custom: "Personalizado",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ClientReportsManager({
  dadosIniciais,
}: {
  dadosIniciais: RelatoriosClientesResposta;
}) {
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState("total_gasto");
  const [periodo, setPeriodo] = useState("30");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [perfilId, setPerfilId] = useState<number | null>(null);

  const primeiraRenderRef = useRef(true);
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function carregar(overrides: Partial<RelatoriosClientesParams> = {}) {
    setCarregando(true);
    try {
      const params: RelatoriosClientesParams = {
        busca,
        ordenar,
        pagina,
        limite,
        ...overrides,
      };
      if (periodo === "custom") {
        params.data_ini = dataIni;
        params.data_fim = dataFim;
      } else {
        params.periodo = periodo;
      }
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      });
      const res = await fetch(`/api/clientreports/listar?${qs.toString()}`, { cache: "no-store" });
      const data: RelatoriosClientesResposta & { ok: boolean; msg?: string } = await res.json();
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
  }, [ordenar, periodo, dataIni, dataFim, pagina, limite]);

  function mudarBusca(valor: string) {
    setBusca(valor);
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    buscaTimerRef.current = setTimeout(() => {
      setPagina(1);
      carregar({ busca: valor, pagina: 1 });
    }, 400);
  }

  function mudarFiltro(fn: () => void) {
    fn();
    setPagina(1);
  }

  const inicioItem = dados.total === 0 ? 0 : (dados.pagina - 1) * dados.limite + 1;
  const fimItem = Math.min(dados.pagina * dados.limite, dados.total);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Relatório de vendas por cliente</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o desempenho de cada cliente da sua loja.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              Nome ou telefone do cliente
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                className="pl-8"
                placeholder="Digite o nome ou telefone"
                value={busca}
                onChange={(e) => mudarBusca(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Ordenar por</span>
            <Select items={ORDENAR_ITEMS} value={ordenar} onValueChange={(v) => mudarFiltro(() => setOrdenar(v ?? "total_gasto"))}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORDENAR_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Período</span>
            <div className="flex items-center gap-2">
              <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => mudarFiltro(() => setPeriodo(v ?? "30"))}>
                <SelectTrigger className="w-36">
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
              {periodo === "custom" && (
                <DateRangePicker
                  dataIni={dataIni}
                  dataFim={dataFim}
                  onChange={(ini, fim) =>
                    mudarFiltro(() => {
                      setDataIni(ini);
                      setDataFim(fim);
                    })
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-2xl py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Nome</TableHead>
                <TableHead className="font-normal text-muted-foreground">Último pedido</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Taxas</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Ticket</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Total</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Pedidos</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carregando ? (
                Array.from({ length: limite }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-5 w-full animate-pulse rounded-md bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : dados.clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum cliente encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                dados.clientes.map((c) => (
                  <TableRow key={c.cliente_id}>
                    <TableCell className="font-normal">
                      <div>{c.nome}</div>
                      {c.telefone && <div className="text-xs text-muted-foreground">{c.telefone}</div>}
                    </TableCell>
                    <TableCell className="font-normal text-muted-foreground">
                      {formatDataCurta(c.ultimo_pedido)}
                    </TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">
                      {formatBRL(c.total_taxa)}
                    </TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">
                      {formatBRL(c.ticket_medio)}
                    </TableCell>
                    <TableCell className="text-right font-normal tabular-nums">{formatBRL(c.total_gasto)}</TableCell>
                    <TableCell className="text-right font-normal tabular-nums text-muted-foreground">
                      {c.pedidos_feitos}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setPerfilId(c.cliente_id)}>
                        Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Itens por página:</span>
            <Select
              items={{ "10": "10", "25": "25", "50": "50" }}
              value={String(limite)}
              onValueChange={(v) => mudarFiltro(() => setLimite(Number(v ?? 10)))}
            >
              <SelectTrigger size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              Mostrando {inicioItem} a {fimItem} de {dados.total} clientes
            </span>
          </div>

          <div className="flex items-center gap-1">
            <PageButton disabled={pagina <= 1} onClick={() => setPagina(1)}>
              «
            </PageButton>
            <PageButton disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
              ‹
            </PageButton>
            <span className="px-1.5 text-xs text-muted-foreground">
              Página {dados.pagina} de {dados.paginas}
            </span>
            <PageButton
              disabled={pagina >= dados.paginas}
              onClick={() => setPagina((p) => Math.min(dados.paginas, p + 1))}
            >
              ›
            </PageButton>
            <PageButton disabled={pagina >= dados.paginas} onClick={() => setPagina(dados.paginas)}>
              »
            </PageButton>
          </div>
        </div>
      </Card>

      <ClientePerfilDialog
        open={perfilId !== null}
        onOpenChange={(v) => !v && setPerfilId(null)}
        clienteId={perfilId}
      />
    </div>
  );
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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
