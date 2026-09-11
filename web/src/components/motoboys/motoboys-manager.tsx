"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bike, Package, Wallet, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { OrderDetailDialog } from "@/components/ordermanager/order-detail-dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { formatBRL, formatDataHora } from "@/components/ordermanager/constants";
import { formatDataCurta } from "@/components/cliente/types";
import { MotoboyFormDialog } from "@/components/motoboys/motoboy-form-dialog";
import type { Motoboy } from "@/lib/pedidos";
import type {
  MotoboyGerenciar,
  MotoboysEntregasResposta,
  MotoboysGerenciarResposta,
} from "@/lib/motoboysGerenciar";
import { cn } from "cn";

const PERIODO_ITEMS: Record<string, string> = {
  hoje: "Hoje",
  "7dias": "7 dias",
  customizado: "Customizado",
};

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MotoboysManager({
  dadosIniciais,
  motoboysAtivos,
  phpAdminUrl,
}: {
  dadosIniciais: MotoboysGerenciarResposta;
  motoboysAtivos: Motoboy[];
  phpAdminUrl: string;
}) {
  const [periodo, setPeriodo] = useState("hoje");
  const [dataIni, setDataIni] = useState(hojeISO());
  const [dataFim, setDataFim] = useState(hojeISO());

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const [entregas, setEntregas] = useState<MotoboysEntregasResposta | null>(null);
  const [entregasPagina, setEntregasPagina] = useState(1);
  const [entregasPorPagina, setEntregasPorPagina] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [motoboyEditando, setMotoboyEditando] = useState<MotoboyGerenciar | null>(null);
  const [motoboyExcluir, setMotoboyExcluir] = useState<MotoboyGerenciar | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const [detalheId, setDetalheId] = useState<number | null>(null);

  const primeiraRenderRef = useRef(true);

  function periodoParams() {
    const params: Record<string, string> = { periodo };
    if (periodo === "customizado") {
      params.data_inicio = dataIni;
      params.data_fim = dataFim;
    }
    return params;
  }

  async function carregarGerenciar() {
    setCarregando(true);
    try {
      const qs = new URLSearchParams(periodoParams());
      const res = await fetch(`/api/motoboys/gerenciar?${qs.toString()}`, { cache: "no-store" });
      const data: MotoboysGerenciarResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar os motoboys.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar os motoboys.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarEntregas(pagina: number, porPagina: number) {
    try {
      const qs = new URLSearchParams({
        ...periodoParams(),
        page: String(pagina),
        per_page: String(porPagina),
      });
      const res = await fetch(`/api/motoboys/entregas?${qs.toString()}`, { cache: "no-store" });
      const data: MotoboysEntregasResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar as entregas.");
        return;
      }
      setEntregas(data);
      setEntregasPagina(data.page);
    } catch {
      toast.error("Erro ao carregar as entregas.");
    }
  }

  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      carregarEntregas(1, entregasPorPagina);
      return;
    }
    carregarGerenciar();
    carregarEntregas(1, entregasPorPagina);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, dataIni, dataFim]);

  async function confirmarExclusao() {
    if (!motoboyExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/motoboys/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: motoboyExcluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao remover motoboy.");
        return;
      }
      toast.success(data.msg ?? "Motoboy removido com sucesso.");
      setMotoboyExcluir(null);
      carregarGerenciar();
      carregarEntregas(1, entregasPorPagina);
    } catch {
      toast.error("Erro ao remover motoboy.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Motoboys</h1>
          <p className="text-sm text-muted-foreground">Cadastre os entregadores e acompanhe as entregas vinculadas no período.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select items={PERIODO_ITEMS} value={periodo} onValueChange={(v) => setPeriodo(v ?? "hoje")}>
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
          {periodo === "customizado" && (
            <DateRangePicker
              dataIni={dataIni}
              dataFim={dataFim}
              onChange={(ini, fim) => {
                setDataIni(ini);
                setDataFim(fim);
              }}
            />
          )}
          <Button
            className="gap-1.5 rounded-lg font-normal"
            onClick={() => {
              setMotoboyEditando(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo motoboy
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-3 transition-opacity", carregando && "opacity-60")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Motoboys cadastrados</span>
            <Bike className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.stats.total_motoboys}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Entregas no período</span>
            <Package className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{dados.stats.entregas_periodo}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Taxas do período</span>
            <Wallet className="text-primary" size={16} />
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatBRL(dados.stats.taxas_periodo)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Cadastro de motoboys</h3>
            <p className="text-xs text-muted-foreground">Lista dos entregadores disponíveis para vínculo nos pedidos.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Motoboy</TableHead>
                <TableHead className="font-normal text-muted-foreground">Cadastro</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Entregas</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Taxas</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.motoboys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhum motoboy cadastrado ainda.
                  </TableCell>
                </TableRow>
              )}
              {dados.motoboys.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-normal">
                    {m.nome}
                    <div className="text-xs text-muted-foreground">{m.whatsapp}</div>
                  </TableCell>
                  <TableCell className="font-normal text-muted-foreground">{formatDataCurta(m.data_cadastro)}</TableCell>
                  <TableCell className="text-right font-normal tabular-nums text-muted-foreground">{m.entregas_periodo}</TableCell>
                  <TableCell className="text-right font-normal tabular-nums">{formatBRL(m.taxas_periodo)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setMotoboyEditando(m);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setMotoboyExcluir(m)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3">
            <h3 className="text-sm font-semibold">Entregas vinculadas</h3>
            <p className="text-xs text-muted-foreground">Pedidos de entrega do período filtrado com motoboy vinculado.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Pedido</TableHead>
                <TableHead className="font-normal text-muted-foreground">Cliente</TableHead>
                <TableHead className="font-normal text-muted-foreground">Endereço</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Taxa</TableHead>
                <TableHead className="font-normal text-muted-foreground">Motoboy</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!entregas || entregas.entregas.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma entrega finalizada no período selecionado.
                  </TableCell>
                </TableRow>
              )}
              {entregas?.entregas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-normal">
                    #{e.codigo}
                    <div className="text-xs text-muted-foreground">{formatDataHora(e.criado_em)}</div>
                  </TableCell>
                  <TableCell className="font-normal">
                    {e.cliente_nome}
                    <div className="text-xs text-muted-foreground">{e.cliente_telefone}</div>
                  </TableCell>
                  <TableCell className="max-w-56 truncate font-normal text-muted-foreground">{e.endereco_entrega}</TableCell>
                  <TableCell className="text-right font-normal tabular-nums">{formatBRL(e.taxa_entrega)}</TableCell>
                  <TableCell className="font-normal">
                    {e.motoboy_nome}
                    <div className="text-xs text-muted-foreground">{e.motoboy_whatsapp}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => setDetalheId(e.id)}>
                      <Eye className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {entregas && entregas.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>
                Mostrando {entregas.mostrando_de} a {entregas.mostrando_ate} de {entregas.total} entrega(s)
              </span>
              <div className="flex items-center gap-2">
                <Select
                  items={{ "5": "5", "10": "10", "25": "25" }}
                  value={String(entregasPorPagina)}
                  onValueChange={(v) => {
                    if (!v) return;
                    const n = Number(v);
                    setEntregasPorPagina(n);
                    carregarEntregas(1, n);
                  }}
                >
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["5", "10", "25"].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <PageButton disabled={entregasPagina <= 1} onClick={() => carregarEntregas(1, entregasPorPagina)}>
                    «
                  </PageButton>
                  <PageButton
                    disabled={entregasPagina <= 1}
                    onClick={() => carregarEntregas(Math.max(1, entregasPagina - 1), entregasPorPagina)}
                  >
                    ‹
                  </PageButton>
                  <span className="px-1.5">
                    Página {entregasPagina} de {entregas.total_pages}
                  </span>
                  <PageButton
                    disabled={entregasPagina >= entregas.total_pages}
                    onClick={() => carregarEntregas(Math.min(entregas.total_pages, entregasPagina + 1), entregasPorPagina)}
                  >
                    ›
                  </PageButton>
                  <PageButton
                    disabled={entregasPagina >= entregas.total_pages}
                    onClick={() => carregarEntregas(entregas.total_pages, entregasPorPagina)}
                  >
                    »
                  </PageButton>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MotoboyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        motoboy={motoboyEditando}
        onSalvo={() => {
          carregarGerenciar();
        }}
      />

      <ConfirmDialog
        open={motoboyExcluir !== null}
        onOpenChange={(v) => !v && setMotoboyExcluir(null)}
        titulo="Excluir motoboy"
        descricao={
          <>
            Confirma remover <strong>{motoboyExcluir?.nome}</strong>? O motoboy será desvinculado dos pedidos de entrega já registrados.
          </>
        }
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboysAtivos}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={() => carregarEntregas(entregasPagina, entregasPorPagina)}
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
