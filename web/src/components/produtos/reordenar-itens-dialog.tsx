"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, GripVertical, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "cn";
import { avisarCatalogoAlterado } from "@/lib/catalogoSync";

type Item = { id: number; nome: string };

function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length || de === para) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

function ListaOrdenavel({
  itens,
  onChange,
  combo,
}: {
  itens: Item[];
  onChange: (lista: Item[]) => void;
  combo?: boolean;
}) {
  const [arrastandoIdx, setArrastandoIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {itens.map((item, idx) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setArrastandoIdx(idx)}
          onDragEnd={() => setArrastandoIdx(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (arrastandoIdx !== null) onChange(mover(itens, arrastandoIdx, idx));
            setArrastandoIdx(null);
          }}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-full border py-1.5 pr-1.5 pl-4 text-sm active:cursor-grabbing",
            arrastandoIdx === idx && "opacity-50"
          )}
        >
          <GripVertical size={14} className="shrink-0 text-muted-foreground" />
          {combo && <Layers size={13} className="shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1 truncate">
            {idx + 1} - {item.nome}
          </span>
          <button
            type="button"
            onClick={() => onChange(mover(itens, idx, idx - 1))}
            disabled={idx === 0}
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30"
            aria-label={`Subir ${item.nome}`}
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onChange(mover(itens, idx, idx + 1))}
            disabled={idx === itens.length - 1}
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-30"
            aria-label={`Descer ${item.nome}`}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ReordenarItensDialog({
  open,
  onOpenChange,
  categoriaId,
  categoriaNome,
  produtos,
  combos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoriaId: number;
  categoriaNome: string;
  produtos: Item[];
  combos: Item[];
}) {
  const router = useRouter();
  /* O pai monta o dialog so quando abre (com key da categoria), entao a lista nasce da ordem atual. */
  const [listaProdutos, setListaProdutos] = useState<Item[]>(produtos);
  const [listaCombos, setListaCombos] = useState<Item[]>(combos);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/categorias/itens-ordem", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria_id: categoriaId,
          produtos: listaProdutos.map((p) => p.id),
          combos: listaCombos.map((c) => c.id),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.msg || "Não foi possível salvar a ordem.");
        return;
      }
      toast.success("Itens reordenados com sucesso");
      avisarCatalogoAlterado();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Não foi possível salvar a ordem.");
    } finally {
      setSalvando(false);
    }
  }

  const vazio = listaProdutos.length === 0 && listaCombos.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl sm:max-w-md">
        <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
          <DialogTitle className="truncate">Reordenar itens: {categoriaNome}</DialogTitle>
          <Button size="sm" className="shrink-0 rounded-full" onClick={salvar} disabled={salvando || vazio}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Arraste os itens ou use as setas para definir a ordem em que aparecem no PDV balcão e no cardápio da loja.
        </p>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {vazio && <p className="text-sm text-muted-foreground">Nenhum item nesta categoria.</p>}
          {listaCombos.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Combos</span>
              <ListaOrdenavel itens={listaCombos} onChange={setListaCombos} combo />
            </div>
          )}
          {listaProdutos.length > 0 && (
            <div className="flex flex-col gap-2">
              {listaCombos.length > 0 && (
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Produtos</span>
              )}
              <ListaOrdenavel itens={listaProdutos} onChange={setListaProdutos} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
