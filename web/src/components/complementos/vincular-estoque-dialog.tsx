"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EstoqueTipo } from "@/db/queries/complementosEstoque";
import { BOTAO_PRIMARIO_CLASSE, MODAL_CLASSE } from "./estilos";

type Opcao = { tipo: EstoqueTipo; id: number; nome: string; quantidade: number };

/* Lista os estoques existentes (de produtos e de complementos) para o item usar. Montado so enquanto aberto. */
export function VincularEstoqueDialog({
  open,
  onOpenChange,
  itemNome,
  onVincular,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemNome: string;
  onVincular: (tipo: EstoqueTipo, id: number) => Promise<void>;
}) {
  const [opcoes, setOpcoes] = useState<Opcao[] | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/product-complement/estoque?lista=opcoes")
      .then((r) => r.json())
      .then((data) => !cancelado && setOpcoes(data?.ok ? data.opcoes : []))
      .catch(() => !cancelado && setOpcoes([]));
    return () => {
      cancelado = true;
    };
  }, []);

  const escolhida = opcoes?.find((o) => `${o.tipo}-${o.id}` === selecionado);

  async function vincular() {
    if (!escolhida) return;
    setVinculando(true);
    try {
      await onVincular(escolhida.tipo, escolhida.id);
    } finally {
      setVinculando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(MODAL_CLASSE, "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="pr-6 text-base font-semibold">Vincule um item de estoque para {itemNome}</DialogTitle>
        </DialogHeader>

        <div role="radiogroup" className="-mr-2 flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto pr-2">
          {opcoes === null && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
          {opcoes?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum estoque cadastrado ainda.</p>}
          {opcoes?.map((o) => {
            const chave = `${o.tipo}-${o.id}`;
            const ativo = selecionado === chave;
            return (
              <button
                key={chave}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setSelecionado(chave)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition-colors",
                  ativo ? "bg-primary/10" : "bg-muted/70 hover:bg-muted"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {o.tipo === "produto" ? "Produto" : "Complemento"} · {o.quantidade} em estoque
                  </span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                    ativo ? "border-primary" : "border-foreground/60"
                  )}
                >
                  {ativo && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-9 rounded-full px-4 font-medium text-primary hover:text-primary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button className={BOTAO_PRIMARIO_CLASSE} disabled={!escolhida || vinculando} onClick={vincular}>
            {vinculando ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
