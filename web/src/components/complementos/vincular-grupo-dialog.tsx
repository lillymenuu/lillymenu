"use client";

import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { GrupoResumo } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";

/*
 * "Vincular a um grupo" (aba Complementos do produto). "compartilhados" = grupos que ja estao em
 * algum produto ou categoria; "todos" = todos os grupos da loja. Os ja vinculados ao produto nao aparecem.
 */
export function VincularGrupoDialog({
  open,
  onOpenChange,
  grupos,
  onVincular,
  onNovoGrupo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupos: GrupoResumo[];
  onVincular: (grupoId: number) => Promise<void>;
  onNovoGrupo: () => void;
}) {
  const [filtro, setFiltro] = useState<"compartilhados" | "todos">("compartilhados");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [vinculando, setVinculando] = useState(false);

  const termo = busca.trim().toLowerCase();
  const lista = grupos
    .filter((g) => filtro === "todos" || g.totalProdutos + g.totalCategorias > 0)
    .filter((g) => !termo || g.nome.toLowerCase().includes(termo));

  async function vincular() {
    if (selecionado === null) return;
    setVinculando(true);
    try {
      await onVincular(selecionado);
    } finally {
      setVinculando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayForceRender className={cn(MODAL_CLASSE, "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Vincular a um grupo</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 overflow-hidden rounded-md bg-muted text-sm">
          {(["compartilhados", "todos"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => {
                setFiltro(opcao);
                setSelecionado(null);
              }}
              className={cn(
                "py-2 font-medium transition-colors",
                filtro === opcao ? "rounded-md bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/70"
              )}
            >
              {opcao}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="vincular-grupo-busca" className="text-sm font-medium">
            Buscar grupo
          </label>
          <input id="vincular-grupo-busca" className={CAMPO_CLASSE} placeholder="Busque pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <div role="radiogroup" className="-mr-2 flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto pr-2">
          {lista.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {grupos.length === 0 ? "Nenhum grupo disponível para vincular." : "Nenhum grupo encontrado."}
            </p>
          )}
          {lista.map((g) => {
            const ativo = selecionado === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => setSelecionado(g.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-4 py-3.5 text-left text-sm font-semibold transition-colors",
                  ativo ? "bg-primary/10" : "bg-muted/70 hover:bg-muted"
                )}
              >
                <span className="min-w-0 truncate">{g.nome}</span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                    ativo ? "border-primary" : "border-foreground/70"
                  )}
                >
                  {ativo && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" className="h-9 rounded-full px-4 font-medium" onClick={onNovoGrupo}>
            Adicionar novo grupo
          </Button>
          <Button className={BOTAO_PRIMARIO_CLASSE} disabled={selecionado === null || vinculando} onClick={vincular}>
            {vinculando ? "Vinculando..." : "Vincular"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
