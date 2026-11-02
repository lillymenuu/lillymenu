"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";

export type ItemVinculo = { id: number; nome: string; grupo: string };

/* Escolha dos itens de complemento que dividem o mesmo estoque. Montado so enquanto aberto. */
export function VincularItensDialog({
  open,
  onOpenChange,
  selecionados,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selecionados: ItemVinculo[];
  onConfirmar: (lista: ItemVinculo[]) => void;
}) {
  const [itens, setItens] = useState<ItemVinculo[] | null>(null);
  const [marcados, setMarcados] = useState<number[]>(selecionados.map((s) => s.id));
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/product-complement/estoque?lista=itens")
      .then((r) => r.json())
      .then((data) => !cancelado && setItens(data?.ok ? data.itens : []))
      .catch(() => !cancelado && setItens([]));
    return () => {
      cancelado = true;
    };
  }, []);

  const termo = busca.trim().toLowerCase();
  const lista = (itens ?? []).filter((i) => !termo || i.nome.toLowerCase().includes(termo) || i.grupo.toLowerCase().includes(termo));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayForceRender className={cn(MODAL_CLASSE, "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Vincular outros itens</DialogTitle>
          <DialogDescription>Os itens marcados vão usar este mesmo estoque.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={15} />
          <input aria-label="Buscar item" className={cn(CAMPO_CLASSE, "pl-10")} placeholder="Buscar item ou grupo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <div className="-mr-2 flex max-h-[50vh] flex-col gap-1 overflow-y-auto pr-2">
          {itens === null && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
          {itens !== null && lista.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum item encontrado.</p>}
          {lista.map((i) => (
            <label key={i.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50">
              <Checkbox
                checked={marcados.includes(i.id)}
                onCheckedChange={(v) => setMarcados((atual) => (v === true ? [...atual, i.id] : atual.filter((id) => id !== i.id)))}
              />
              <span className="min-w-0 truncate">
                {i.nome} <span className="text-muted-foreground">· {i.grupo}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className={BOTAO_PRIMARIO_CLASSE}
            disabled={itens === null}
            onClick={() => onConfirmar((itens ?? []).filter((i) => marcados.includes(i.id)))}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
