"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRODUTO_IMAGEM_PADRAO } from "@/lib/produtoImagem";
import type { ComplementoGrupo, ComplementoItem } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, MODAL_CLASSE } from "./estilos";

export function ReordenarItensDialog({
  open,
  onOpenChange,
  grupo,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupo: ComplementoGrupo | null;
  onSalvo: () => void;
}) {
  const [itens, setItens] = useState<ComplementoItem[]>(grupo?.itens ?? []);
  const [salvando, setSalvando] = useState(false);

  function mover(indice: number, delta: number) {
    setItens((atual) => {
      const destino = indice + delta;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  async function salvar() {
    if (!grupo) return;
    setSalvando(true);
    try {
      const resp = await fetch("/api/product-complement/grupos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: grupo.id, item_ids: itens.map((i) => i.id) }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível salvar a ordem.");
        return;
      }
      toast.success("Ordem dos itens atualizada");
      onOpenChange(false);
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CLASSE}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Reordenar itens</DialogTitle>
          <DialogDescription>Defina a ordem em que os itens de &quot;{grupo?.nome}&quot; aparecem para o cliente.</DialogDescription>
        </DialogHeader>

        <ol className="-mr-2 flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-2">
          {itens.map((item, i) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl border p-2 pr-3">
              {
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagem || PRODUTO_IMAGEM_PADRAO} alt="" className="size-10 rounded-lg object-cover" />
              }
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.nome}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Mover para cima" disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ChevronUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Mover para baixo"
                  disabled={i === itens.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  <ChevronDown />
                </Button>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className={BOTAO_PRIMARIO_CLASSE} onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar ordem"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
