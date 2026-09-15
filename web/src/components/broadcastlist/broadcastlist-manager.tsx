"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Radio, Users, Pencil, Trash2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { BroadcastlistFormDialog } from "@/components/broadcastlist/broadcastlist-form-dialog";
import { BroadcastlistEnviarDialog } from "@/components/broadcastlist/broadcastlist-enviar-dialog";
import type { BlLista, BlListarResposta } from "@/lib/broadcastlist";

export function BroadcastlistManager({ dadosIniciais }: { dadosIniciais: BlListarResposta }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<BlLista | null>(null);
  const [enviarPara, setEnviarPara] = useState<BlLista | null>(null);
  const [excluir, setExcluir] = useState<BlLista | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/broadcastlist/listar");
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar listas.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar listas.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNova() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(l: BlLista) {
    setEditando(l);
    setFormAberto(true);
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/broadcastlist/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao apagar lista.");
        return;
      }
      toast.success("Lista apagada.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao apagar lista.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">BroadcastList</h1>
          <p className="text-sm text-muted-foreground">Crie grupos de clientes com WhatsApp e envie promoções ou avisos para todos de uma vez.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNova}>
          <Plus className="size-4" /> Nova lista
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${carregando ? "opacity-60" : ""}`}>
        {dados.listas.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
            <Radio className="mx-auto mb-2 size-6" />
            Nenhuma lista de transmissão criada ainda.
          </Card>
        ) : (
          dados.listas.map((l) => (
            <Card key={l.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Radio className="size-4.5" />
                  </div>
                  <div className="text-sm font-semibold">{l.nome}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => abrirEdicao(l)} title="Editar lista" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluir(l)}
                    title="Excluir lista"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
                <Users className="size-3" /> {l.total_membros} cliente{l.total_membros === 1 ? "" : "s"}
              </span>

              <div className="border-t pt-3">
                <Button size="sm" className="w-full gap-1.5 text-xs" onClick={() => setEnviarPara(l)}>
                  <Send className="size-3.5" /> Enviar mensagem
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <BroadcastlistFormDialog open={formAberto} onOpenChange={setFormAberto} lista={editando} onSalvo={carregar} />

      <BroadcastlistEnviarDialog open={enviarPara !== null} onOpenChange={(v) => !v && setEnviarPara(null)} lista={enviarPara} />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir lista"
        descricao={`Tem certeza que deseja excluir a lista "${excluir?.nome}"? Os clientes cadastrados nela não serão afetados.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
