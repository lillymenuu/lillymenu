"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Receipt, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { STATUS_CORES, STATUS_LABELS, PROXIMA_ETAPA, formatBRL, formatHora } from "@/components/ordermanager/constants";
import { MesaFormDialog } from "@/components/waitermode/mesa-form-dialog";
import { GarcomFormDialog } from "@/components/waitermode/garcom-form-dialog";
import { CodigoGeradoDialog } from "@/components/waitermode/codigo-gerado-dialog";
import type { Garcom, Mesa, ModoGarcomDetalheResposta, ModoGarcomStats, PedidoMesa } from "@/lib/modoGarcom";
import { cn } from "cn";

export function WaiterModeManager({ dadosIniciais }: { dadosIniciais: ModoGarcomDetalheResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [stats, setStats] = useState<ModoGarcomStats>({
    ok: true,
    pedidos_pendentes: dadosIniciais.pedidos_pendentes,
    mesas_ativas: dadosIniciais.mesas_ativas,
    garcons_ativos: dadosIniciais.garcons_ativos,
  });
  const [aba, setAba] = useState("pedidos");
  const [pedidos, setPedidos] = useState<PedidoMesa[] | null>(null);

  const [mesaFormOpen, setMesaFormOpen] = useState(false);
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);
  const [mesaExcluir, setMesaExcluir] = useState<Mesa | null>(null);
  const [excluindoMesa, setExcluindoMesa] = useState(false);

  const [garcomFormOpen, setGarcomFormOpen] = useState(false);
  const [garcomEditando, setGarcomEditando] = useState<Garcom | null>(null);
  const [garcomExcluir, setGarcomExcluir] = useState<Garcom | null>(null);
  const [excluindoGarcom, setExcluindoGarcom] = useState(false);
  const [garcomGerarCodigo, setGarcomGerarCodigo] = useState<Garcom | null>(null);
  const [gerandoCodigo, setGerandoCodigo] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);

  async function recarregarDetalhe() {
    try {
      const res = await fetch("/api/waitermode/detalhe", { cache: "no-store" });
      const data: ModoGarcomDetalheResposta & { ok: boolean; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao atualizar dados.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao atualizar dados.");
    }
  }

  const carregarStats = useCallback(async () => {
    try {
      const res = await fetch("/api/waitermode/stats", { cache: "no-store" });
      const data: ModoGarcomStats & { ok: boolean } = await res.json();
      if (data.ok) setStats(data);
    } catch {
      // silencioso — nao interrompe o polling
    }
  }, []);

  const carregarPedidos = useCallback(async () => {
    try {
      const res = await fetch("/api/waitermode/pedidos", { cache: "no-store" });
      const data: { ok: boolean; pedidos: PedidoMesa[] } = await res.json();
      if (data.ok) setPedidos(data.pedidos);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    carregarPedidos();
    carregarStats();
    const timer = setInterval(() => {
      if (aba === "pedidos") carregarPedidos();
      carregarStats();
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  async function mudarStatusPedido(id: number, status: string) {
    try {
      const res = await fetch("/api/ordermanager/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error("Erro ao atualizar o pedido.");
        return;
      }
      carregarPedidos();
      carregarStats();
    } catch {
      toast.error("Erro ao atualizar o pedido.");
    }
  }

  async function finalizarPedido(id: number) {
    try {
      const res = await fetch("/api/ordermanager/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error("Erro ao finalizar o pedido.");
        return;
      }
      carregarPedidos();
      carregarStats();
    } catch {
      toast.error("Erro ao finalizar o pedido.");
    }
  }

  async function cancelarPedido(id: number) {
    if (!confirm("Cancelar este pedido de mesa?")) return;
    try {
      const res = await fetch("/api/ordermanager/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error("Erro ao cancelar o pedido.");
        return;
      }
      carregarPedidos();
      carregarStats();
    } catch {
      toast.error("Erro ao cancelar o pedido.");
    }
  }

  async function toggleMesa(mesa: Mesa, ativo: boolean) {
    setDados((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === mesa.id ? { ...m, ativo: ativo ? 1 : 0 } : m)) }));
    try {
      const res = await fetch("/api/waitermode/mesas-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mesa.id, ativo: ativo ? 1 : 0 }),
      });
      const data = await res.json();
      if (!data.ok) {
        setDados((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === mesa.id ? { ...m, ativo: mesa.ativo } : m)) }));
        toast.error("Erro ao atualizar a mesa.");
        return;
      }
      carregarStats();
    } catch {
      setDados((d) => ({ ...d, mesas: d.mesas.map((m) => (m.id === mesa.id ? { ...m, ativo: mesa.ativo } : m)) }));
      toast.error("Erro ao atualizar a mesa.");
    }
  }

  async function confirmarExclusaoMesa() {
    if (!mesaExcluir) return;
    setExcluindoMesa(true);
    try {
      const res = await fetch("/api/waitermode/mesas-excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: mesaExcluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir mesa.");
        return;
      }
      toast.success("Mesa excluída com sucesso.");
      setMesaExcluir(null);
      recarregarDetalhe();
    } catch {
      toast.error("Erro ao excluir mesa.");
    } finally {
      setExcluindoMesa(false);
    }
  }

  async function toggleGarcom(garcom: Garcom, ativo: boolean) {
    setDados((d) => ({ ...d, garcons: d.garcons.map((g) => (g.id === garcom.id ? { ...g, ativo: ativo ? 1 : 0 } : g)) }));
    try {
      const res = await fetch("/api/waitermode/garcons-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: garcom.id, ativo: ativo ? 1 : 0 }),
      });
      const data = await res.json();
      if (!data.ok) {
        setDados((d) => ({ ...d, garcons: d.garcons.map((g) => (g.id === garcom.id ? { ...g, ativo: garcom.ativo } : g)) }));
        toast.error("Erro ao atualizar o garçom.");
        return;
      }
      carregarStats();
    } catch {
      setDados((d) => ({ ...d, garcons: d.garcons.map((g) => (g.id === garcom.id ? { ...g, ativo: garcom.ativo } : g)) }));
      toast.error("Erro ao atualizar o garçom.");
    }
  }

  async function confirmarExclusaoGarcom() {
    if (!garcomExcluir) return;
    setExcluindoGarcom(true);
    try {
      const res = await fetch("/api/waitermode/garcons-excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: garcomExcluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir garçom.");
        return;
      }
      toast.success("Garçom excluído com sucesso.");
      setGarcomExcluir(null);
      recarregarDetalhe();
    } catch {
      toast.error("Erro ao excluir garçom.");
    } finally {
      setExcluindoGarcom(false);
    }
  }

  async function confirmarGerarCodigo() {
    if (!garcomGerarCodigo) return;
    setGerandoCodigo(true);
    try {
      const res = await fetch("/api/waitermode/garcons-gerar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: garcomGerarCodigo.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao gerar código.");
        return;
      }
      toast.success("Novo código gerado com sucesso!");
      setGarcomGerarCodigo(null);
      setCodigoGerado(data.codigo_acesso);
    } catch {
      toast.error("Erro ao gerar código.");
    } finally {
      setGerandoCodigo(false);
    }
  }

  function copiarLink() {
    navigator.clipboard.writeText(dados.garcom_login_url).then(() => toast.success("Link copiado!"));
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Modo Garçom</h1>
        <p className="text-sm text-muted-foreground">Mesas, garçons e pedidos do salão em um só lugar.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="text-center">
            <div className="text-2xl font-bold">{stats.pedidos_pendentes}</div>
            <div className="text-xs text-muted-foreground">Pedidos pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div className="text-2xl font-bold">{stats.mesas_ativas}</div>
            <div className="text-xs text-muted-foreground">Mesas ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <div className="text-2xl font-bold">{stats.garcons_ativos}</div>
            <div className="text-xs text-muted-foreground">Garçons ativos</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={aba} onValueChange={(v) => v && setAba(v)}>
        <TabsList>
          <TabsTrigger value="pedidos" className="gap-1.5">
            <Receipt className="size-4" /> Pedidos
            {stats.pedidos_pendentes > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1">
                {stats.pedidos_pendentes}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mesas">Mesas</TabsTrigger>
          <TabsTrigger value="garcons">Garçons</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="mt-4">
          {pedidos === null && <p className="py-8 text-center text-sm text-muted-foreground">Carregando pedidos...</p>}
          {pedidos && pedidos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido de mesa ainda.</p>
          )}
          <div className="flex flex-col gap-2">
            {pedidos?.map((p) => {
              const cor = STATUS_CORES[p.status] ?? STATUS_CORES.pendente;
              const proxima = PROXIMA_ETAPA[p.status];
              const podeCancelar = p.status !== "finalizado" && p.status !== "cancelado";
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <div className="w-24 shrink-0 font-medium">{p.mesa_nome ?? "—"}</div>
                    <div className="min-w-40 flex-1">
                      <div className="text-sm font-medium">
                        Pedido #{p.codigo}
                        {p.garcom_nome ? ` · ${p.garcom_nome}` : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatHora(p.criado_em)}</div>
                    </div>
                    <div className="font-semibold">{formatBRL(p.total)}</div>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: cor.bg, color: cor.fg }}
                    >
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {proxima && (
                        <Button size="sm" className="rounded-lg font-normal" onClick={() => mudarStatusPedido(p.id, proxima.proximo)}>
                          {proxima.label}
                        </Button>
                      )}
                      {p.status === "entrega" && (
                        <Button size="sm" className="rounded-lg font-normal" onClick={() => finalizarPedido(p.id)}>
                          Dar baixa
                        </Button>
                      )}
                      {podeCancelar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg font-normal"
                          onClick={() => cancelarPedido(p.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mesas" className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Toque em uma mesa pra ativar/desativar. Mesas desativadas não aparecem pro garçom.
            </p>
            <Button
              className="shrink-0 gap-1.5 rounded-lg font-normal"
              onClick={() => {
                setMesaEditando(null);
                setMesaFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Nova mesa
            </Button>
          </div>
          {dados.mesas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma mesa cadastrada ainda.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dados.mesas.map((m) => (
              <Card key={m.id} className={cn(m.ativo === 0 && "opacity-60")}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.nome}</span>
                    <Switch checked={m.ativo === 1} onCheckedChange={(v) => toggleMesa(m, v)} />
                  </div>
                  {m.tem_pedido_aberto ? (
                    <Badge variant="secondary" className="w-fit">
                      Pedido em aberto
                    </Badge>
                  ) : (
                    <Badge className="w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Livre
                    </Badge>
                  )}
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setMesaEditando(m);
                        setMesaFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setMesaExcluir(m)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="garcons" className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Compartilhe o link de acesso com a equipe — cada garçom entra com o próprio e-mail e código.
            </p>
            <Button
              className="shrink-0 gap-1.5 rounded-lg font-normal"
              onClick={() => {
                setGarcomEditando(null);
                setGarcomFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Novo garçom
            </Button>
          </div>

          <Card>
            <CardContent className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-xs font-medium text-muted-foreground uppercase">Link de acesso do garçom</div>
                <div className="truncate text-sm">{dados.garcom_login_url}</div>
              </div>
              <Button variant="outline" size="icon" onClick={copiarLink}>
                <Copy className="size-4" />
              </Button>
            </CardContent>
          </Card>

          {dados.garcons.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum garçom cadastrado ainda.</p>
          )}
          <div className="flex flex-col gap-2">
            {dados.garcons.map((g) => (
              <Card key={g.id} className={cn(g.ativo === 0 && "opacity-60")}>
                <CardContent className="flex flex-wrap items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {g.nome.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{g.nome}</div>
                    <div className="text-xs text-muted-foreground">{g.email}</div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-lg font-normal" onClick={() => setGarcomGerarCodigo(g)}>
                    <KeyRound className="size-3.5" /> Gerar novo código
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setGarcomEditando(g);
                      setGarcomFormOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setGarcomExcluir(g)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Switch checked={g.ativo === 1} onCheckedChange={(v) => toggleGarcom(g, v)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <MesaFormDialog open={mesaFormOpen} onOpenChange={setMesaFormOpen} mesa={mesaEditando} onSalvo={recarregarDetalhe} />
      <ConfirmDialog
        open={mesaExcluir !== null}
        onOpenChange={(v) => !v && setMesaExcluir(null)}
        titulo="Excluir mesa"
        descricao={<>Excluir <strong>{mesaExcluir?.nome}</strong>? Essa ação não pode ser desfeita.</>}
        confirmando={excluindoMesa}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusaoMesa}
      />

      <GarcomFormDialog
        open={garcomFormOpen}
        onOpenChange={setGarcomFormOpen}
        garcom={garcomEditando}
        onSalvo={(codigo) => {
          recarregarDetalhe();
          if (codigo) {
            setCodigoGerado(codigo);
          } else {
            toast.success("Garçom atualizado com sucesso!");
          }
        }}
      />
      <ConfirmDialog
        open={garcomExcluir !== null}
        onOpenChange={(v) => !v && setGarcomExcluir(null)}
        titulo="Excluir garçom"
        descricao={<>Excluir <strong>{garcomExcluir?.nome}</strong>? Essa ação não pode ser desfeita.</>}
        confirmando={excluindoGarcom}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusaoGarcom}
      />
      <ConfirmDialog
        open={garcomGerarCodigo !== null}
        onOpenChange={(v) => !v && setGarcomGerarCodigo(null)}
        titulo="Gerar novo código?"
        descricao="Gerar um novo código vai invalidar o código atual desse garçom. Continuar?"
        confirmando={gerandoCodigo}
        textoConfirmar="Gerar novo código"
        onConfirmar={confirmarGerarCodigo}
      />
      <CodigoGeradoDialog
        codigo={codigoGerado}
        onClose={() => {
          setCodigoGerado(null);
          recarregarDetalhe();
        }}
      />
    </div>
  );
}
