"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User, Receipt, Star, Gift } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientePerfilTab } from "./cliente-perfil-tab";
import { ClientePedidosTab } from "./cliente-pedidos-tab";
import { ClienteAvaliacoesTab } from "./cliente-avaliacoes-tab";
import { ClientePontosTab } from "./cliente-pontos-tab";
import { ClienteEditarDialog } from "./cliente-editar-dialog";
import { RegistrarFiadoDialog } from "./registrar-fiado-dialog";
import { formatDataCurta, type ClienteStats } from "./types";
import { cn } from "cn";

const tabTriggerClass =
  "rounded-lg px-3 font-normal data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none";

export function ClientePerfilDialog({
  open,
  onOpenChange,
  clienteId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: number | null;
}) {
  const [aba, setAba] = useState("perfil");
  const [carregando, setCarregando] = useState(false);
  const [stats, setStats] = useState<ClienteStats | null>(null);
  const [editarOpen, setEditarOpen] = useState(false);
  const [fiadoOpen, setFiadoOpen] = useState(false);

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-3 overflow-hidden sm:max-w-lg">
          <div className="scrollbar-hidden max-h-[75vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader className="pr-8">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-base font-medium">
                  {(stats?.nome || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate font-medium">{stats?.nome ?? "Cliente"}</DialogTitle>
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
                <TabsList className="w-full rounded-lg bg-muted p-1">
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
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-lg font-normal"
              onClick={() => setFiadoOpen(true)}
              disabled={!clienteId}
            >
              Registrar fiado
            </Button>
            <Button
              className="rounded-lg font-normal"
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
            onSalvo={carregar}
          />
          <RegistrarFiadoDialog
            open={fiadoOpen}
            onOpenChange={setFiadoOpen}
            clienteId={clienteId}
            onRegistrado={(saldoFiado) => setStats((prev) => (prev ? { ...prev, saldo_fiado: saldoFiado } : prev))}
          />
        </>
      )}
    </>
  );
}
