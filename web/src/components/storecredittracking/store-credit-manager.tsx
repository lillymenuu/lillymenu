"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CircleDollarSign, Users, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { OrderDetailDialog } from "@/components/ordermanager/order-detail-dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import { SelecionarClienteDialog } from "@/components/storecredittracking/selecionar-cliente-dialog";
import { FiadoDetalheDialog } from "@/components/storecredittracking/fiado-detalhe-dialog";
import type { Motoboy } from "@/lib/pedidos";
import type { FiadoClientesResposta } from "@/lib/fiado";

const LIMITE_ITEMS: Record<string, string> = { "10": "10", "25": "25", "50": "50" };

export function StoreCreditManager({
  dadosIniciais,
  motoboys,
  phpAdminUrl,
}: {
  dadosIniciais: FiadoClientesResposta;
  motoboys: Motoboy[];
  phpAdminUrl: string;
}) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState("10");

  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);

  const [selecionarOpen, setSelecionarOpen] = useState(false);
  const [clienteDetalheId, setClienteDetalheId] = useState<number | null>(null);
  const [pedidoDetalheId, setPedidoDetalheId] = useState<number | null>(null);

  const primeiraRenderRef = useRef(true);
  const buscaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function carregar(termo: string, paginaAlvo: number, limiteAlvo: string) {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ pagina: String(paginaAlvo), limite: limiteAlvo });
      if (termo) qs.set("busca", termo);
      const res = await fetch(`/api/storecredittracking/listar?${qs.toString()}`, { cache: "no-store" });
      const data: FiadoClientesResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar os clientes.");
        return;
      }
      setDados(data);
      setPagina(data.pagina);
    } catch {
      toast.error("Erro ao carregar os clientes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    carregar(busca, pagina, limite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, limite]);

  function mudarBusca(valor: string) {
    setBusca(valor);
    if (buscaTimerRef.current) clearTimeout(buscaTimerRef.current);
    buscaTimerRef.current = setTimeout(() => {
      setPagina(1);
      carregar(valor, 1, limite);
    }, 350);
  }

  function recarregarLista() {
    carregar(busca, pagina, limite);
  }

  const inicio = dados.total === 0 ? 0 : (dados.pagina - 1) * Number(limite) + 1;
  const fim = Math.min(dados.total, dados.pagina * Number(limite));

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Controle de fiado</h1>
        <Button className="gap-1.5 rounded-lg font-normal" onClick={() => setSelecionarOpen(true)}>
          <Plus className="size-4" /> Registrar fiado
        </Button>
      </div>

      <div className={carregando ? "grid gap-3 sm:grid-cols-2 opacity-60 transition-opacity" : "grid gap-3 sm:grid-cols-2"}>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CircleDollarSign className="size-5" />
            </div>
            <div>
              <div className="text-lg font-bold">{formatBRL(dados.total_debitos)}</div>
              <div className="text-xs text-muted-foreground">total de débitos</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="size-5" />
            </div>
            <div>
              <div className="text-lg font-bold">{dados.total_clientes}</div>
              <div className="text-xs text-muted-foreground">clientes com dívida ativa</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Lista de clientes com dívida ativa</h2>
        <Card className="mb-3">
          <CardContent>
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">
              Buscar pelo nome ou telefone do cliente
            </Label>
            <Input
              placeholder="Digite o nome ou telefone do cliente"
              className="max-w-md"
              value={busca}
              onChange={(e) => mudarBusca(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-normal text-muted-foreground">Nome</TableHead>
                <TableHead className="font-normal text-muted-foreground">Telefone</TableHead>
                <TableHead className="font-normal text-muted-foreground">Valor do débito</TableHead>
                <TableHead className="text-right font-normal text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.clientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum cliente com dívida ativa.
                  </TableCell>
                </TableRow>
              )}
              {dados.clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.telefone || "-"}</TableCell>
                  <TableCell className="font-semibold text-primary">-{formatBRL(c.saldo_fiado)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="rounded-lg font-normal" onClick={() => setClienteDetalheId(c.id)}>
                      Ver detalhes do cliente
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              Itens por página:
              <Select
                items={LIMITE_ITEMS}
                value={limite}
                onValueChange={(v) => {
                  if (!v) return;
                  setLimite(v);
                  setPagina(1);
                }}
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIMITE_ITEMS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dados.total > 0 && (
              <span>
                Mostrando {inicio} a {fim} de {dados.total} clientes
              </span>
            )}
            {dados.paginas > 1 && (
              <div className="flex items-center gap-1">
                <PageButton disabled={pagina <= 1} onClick={() => setPagina(1)}>
                  «
                </PageButton>
                <PageButton disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                  ‹
                </PageButton>
                <span className="px-1.5">
                  Página {dados.pagina} de {dados.paginas}
                </span>
                <PageButton disabled={pagina >= dados.paginas} onClick={() => setPagina((p) => Math.min(dados.paginas, p + 1))}>
                  ›
                </PageButton>
                <PageButton disabled={pagina >= dados.paginas} onClick={() => setPagina(dados.paginas)}>
                  »
                </PageButton>
              </div>
            )}
          </div>
        </Card>
      </div>

      <SelecionarClienteDialog
        open={selecionarOpen}
        onOpenChange={setSelecionarOpen}
        onSelecionado={(id) => setClienteDetalheId(id)}
      />

      <FiadoDetalheDialog
        clienteId={clienteDetalheId}
        onOpenChange={(v) => !v && setClienteDetalheId(null)}
        onAtualizado={recarregarLista}
        onVerPedido={setPedidoDetalheId}
      />

      <OrderDetailDialog
        open={pedidoDetalheId !== null}
        onOpenChange={(v) => !v && setPedidoDetalheId(null)}
        pedidoId={pedidoDetalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={recarregarLista}
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
      className={
        "flex size-7 items-center justify-center rounded-md border text-xs font-semibold text-foreground transition-colors " +
        (disabled ? "cursor-not-allowed opacity-40" : "hover:border-primary hover:text-primary")
      }
    >
      {children}
    </button>
  );
}
