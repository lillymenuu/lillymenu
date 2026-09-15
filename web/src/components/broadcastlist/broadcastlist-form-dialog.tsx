"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BlCliente, BlDetalheResposta, BlLista } from "@/lib/broadcastlist";

export function BroadcastlistFormDialog({
  open,
  onOpenChange,
  lista,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lista: BlLista | null;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [clientes, setClientes] = useState<BlCliente[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setNome(lista?.nome ?? "");

    setCarregandoClientes(true);
    fetch("/api/broadcastlist/clientes")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setClientes(data.clientes);
      })
      .catch(() => toast.error("Erro ao carregar clientes."))
      .finally(() => setCarregandoClientes(false));

    if (lista) {
      fetch(`/api/broadcastlist/detalhe/${lista.id}`)
        .then((r) => r.json())
        .then((data: BlDetalheResposta | { ok: false; msg?: string }) => {
          if (data.ok) setSelecionados(new Set(data.membros));
        })
        .catch(() => toast.error("Erro ao carregar a lista."));
    } else {
      setSelecionados(new Set());
    }
  }, [open, lista]);

  function toggleCliente(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const termo = busca.trim().toLowerCase();
  const clientesFiltrados = termo
    ? clientes.filter((c) => c.nome.toLowerCase().includes(termo) || c.telefone.toLowerCase().includes(termo))
    : clientes;

  async function salvar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome da lista.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/broadcastlist/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lista?.id ?? 0, nome: nomeLimpo, clientes: [...selecionados] }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar a lista.");
        return;
      }
      toast.success(lista ? "Lista atualizada." : "Lista criada.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar a lista.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[480px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{lista ? "Editar lista" : "Nova lista"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label className="text-xs">Nome da lista</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Clientes VIP" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Clientes</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-9" />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {carregandoClientes ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente com WhatsApp cadastrado.</div>
              ) : (
                clientesFiltrados.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50">
                    <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggleCliente(c.id)} className="size-4 accent-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{c.nome}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.telefone}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {selecionados.size} cliente{selecionados.size !== 1 ? "s" : ""} selecionado{selecionados.size !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : lista ? "Salvar alterações" : "Salvar lista"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
