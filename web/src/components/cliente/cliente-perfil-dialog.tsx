"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Receipt, Star, Gift, MapPin, Ban, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientePerfilTab } from "./cliente-perfil-tab";
import { ClientePedidosTab } from "./cliente-pedidos-tab";
import { ClienteAvaliacoesTab } from "./cliente-avaliacoes-tab";
import { ClientePontosTab } from "./cliente-pontos-tab";
import { ClienteMapaTab } from "./cliente-mapa-tab";
import { ClienteEditarDialog } from "./cliente-editar-dialog";
import { RegistrarFiadoDialog } from "./registrar-fiado-dialog";
import { formatDataCurta, type ClienteStats } from "./types";
import { cn } from "cn";

const tabTriggerClass =
  "gap-1 rounded-full px-2 text-xs font-normal data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none";

export function ClientePerfilDialog({
  open,
  onOpenChange,
  clienteId,
  onAlterado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: number | null;
  /** Chamado depois de editar o cadastro pelo perfil, para quem abriu atualizar a lista. */
  onAlterado?: () => void;
}) {
  const [aba, setAba] = useState("perfil");
  const [carregando, setCarregando] = useState(false);
  const [stats, setStats] = useState<ClienteStats | null>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [fiadoOpen, setFiadoOpen] = useState(false);
  const [confirmarBloqueioOpen, setConfirmarBloqueioOpen] = useState(false);
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [confirmarExclusaoOpen, setConfirmarExclusaoOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!open || !clienteId) return;
    setAba("perfil");
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clienteId]);

  function carregar() {
    if (!clienteId) return;
    setCarregando(true);
    setStats(null);
    fetch(`/api/cliente/stats?id=${clienteId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setStats(data);
        } else {
          toast.error(data.msg ?? "Erro ao carregar o cliente.");
        }
      })
      .finally(() => setCarregando(false));
  }

  async function definirBloqueio(bloquear: boolean) {
    if (!clienteId) return;
    setSalvandoBloqueio(true);
    try {
      const res = await fetch("/api/cliente/bloquear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId, bloquear }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível atualizar o cliente.");
        return;
      }
      setStats((prev) => (prev ? { ...prev, bloqueado: data.bloqueado } : prev));
      setConfirmarBloqueioOpen(false);
      toast.success(data.bloqueado ? "Cliente bloqueado" : "Cliente desbloqueado");
      onAlterado?.();
    } catch {
      toast.error("Não foi possível atualizar o cliente.");
    } finally {
      setSalvandoBloqueio(false);
    }
  }

  async function excluir() {
    if (!clienteId) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/cliente/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId }),
      });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível excluir o cliente.");
        setConfirmarExclusaoOpen(false);
        return;
      }
      toast.success("Cliente excluído");
      setConfirmarExclusaoOpen(false);
      onOpenChange(false);
      onAlterado?.();
    } catch {
      toast.error("Não foi possível excluir o cliente.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-3 overflow-hidden rounded-3xl sm:max-w-lg">
          <div className="scrollbar-hidden max-h-[75vh] overflow-y-auto overflow-x-hidden px-1">
            <DialogHeader className="pr-8">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium">
                  {(stats?.nome || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <DialogTitle className="truncate font-medium">{stats?.nome ?? "Cliente"}</DialogTitle>
                    {stats?.bloqueado && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600">
                        <Ban size={11} /> Bloqueado
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-normal text-muted-foreground">
                    Cliente desde: {stats ? formatDataCurta(stats.criado_em) : "-"}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {carregando || !stats ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <Tabs value={aba} onValueChange={(v) => v && setAba(v)} className="pt-3">
                <TabsList className="w-full rounded-full bg-muted p-1">
                  <TabsTrigger value="perfil" className={cn(tabTriggerClass, "flex-1")}>
                    <User size={13} /> Perfil
                  </TabsTrigger>
                  <TabsTrigger value="pedidos" className={cn(tabTriggerClass, "flex-1")}>
                    <Receipt size={13} /> Pedidos
                  </TabsTrigger>
                  <TabsTrigger value="avaliacoes" className={cn(tabTriggerClass, "flex-1")}>
                    <Star size={13} /> Avaliações
                  </TabsTrigger>
                  <TabsTrigger value="pontos" className={cn(tabTriggerClass, "flex-1")}>
                    <Gift size={13} /> Pontos
                  </TabsTrigger>
                  <TabsTrigger value="mapa" className={cn(tabTriggerClass, "flex-1")}>
                    <MapPin size={13} /> Mapa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="perfil" className="pt-3">
                  <ClientePerfilTab stats={stats} />
                </TabsContent>
                <TabsContent value="pedidos" className="pt-3">
                  {clienteId && <ClientePedidosTab clienteId={clienteId} />}
                </TabsContent>
                <TabsContent value="avaliacoes" className="pt-3">
                  {clienteId && <ClienteAvaliacoesTab clienteId={clienteId} />}
                </TabsContent>
                <TabsContent value="pontos" className="pt-3">
                  {clienteId && <ClientePontosTab clienteId={clienteId} />}
                </TabsContent>
                <TabsContent value="mapa" className="pt-3">
                  {clienteId && <ClienteMapaTab clienteId={clienteId} />}
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter className="border-t-0 bg-transparent sm:flex-wrap">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:mr-auto"
              onClick={() => setConfirmarExclusaoOpen(true)}
              disabled={!clienteId || !stats || excluindo}
              aria-label="Excluir cliente"
              title="Excluir cliente"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="rounded-full font-normal"
              onClick={() => setFiadoOpen(true)}
              disabled={!clienteId}
            >
              Registrar fiado
            </Button>
            <Button
              variant="outline"
              className={cn(
                "rounded-full font-normal",
                stats?.bloqueado ? "" : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              )}
              onClick={() => (stats?.bloqueado ? definirBloqueio(false) : setConfirmarBloqueioOpen(true))}
              disabled={!clienteId || !stats || salvandoBloqueio}
            >
              {stats?.bloqueado ? "Desbloquear cliente" : "Bloquear cliente"}
            </Button>
            <Button
              className="rounded-full font-normal"
              onClick={() => setEditarOpen(true)}
              disabled={!clienteId}
            >
              Editar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {clienteId && (
        <>
          <ClienteEditarDialog
            open={editarOpen}
            onOpenChange={setEditarOpen}
            clienteId={clienteId}
            onSalvo={() => {
              carregar();
              onAlterado?.();
            }}
          />
          <RegistrarFiadoDialog
            open={fiadoOpen}
            onOpenChange={setFiadoOpen}
            clienteId={clienteId}
            onRegistrado={(saldoFiado) => setStats((prev) => (prev ? { ...prev, saldo_fiado: saldoFiado } : prev))}
          />
        </>
      )}
      <Dialog open={confirmarExclusaoOpen} onOpenChange={(v) => !excluindo && setConfirmarExclusaoOpen(v)}>
        <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir cliente?</DialogTitle>
            <DialogDescription>
              {stats?.nome ? <strong className="font-medium text-foreground">{stats.nome}</strong> : "Este cliente"} será removido
              da sua lista de clientes. Essa ação não pode ser desfeita. Clientes com pedidos ou fiado não podem ser excluídos;
              para eles, use &quot;Bloquear cliente&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent">
            <Button variant="outline" className="rounded-full font-normal" onClick={() => setConfirmarExclusaoOpen(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-red-600 font-normal text-white hover:bg-red-700" onClick={excluir} disabled={excluindo}>
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmarBloqueioOpen} onOpenChange={(v) => !salvandoBloqueio && setConfirmarBloqueioOpen(v)}>
        <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bloquear cliente?</DialogTitle>
            <DialogDescription>
              {stats?.nome ? <strong className="font-medium text-foreground">{stats.nome}</strong> : "Este cliente"} não conseguirá
              mais fazer pedidos pelo cardápio da loja. Você pode desbloquear a qualquer momento.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent">
            <Button variant="outline" className="rounded-full font-normal" onClick={() => setConfirmarBloqueioOpen(false)} disabled={salvandoBloqueio}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-red-600 font-normal text-white hover:bg-red-700" onClick={() => definirBloqueio(true)} disabled={salvandoBloqueio}>
              {salvandoBloqueio ? "Bloqueando..." : "Bloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
