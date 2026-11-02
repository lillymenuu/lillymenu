"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplementoGrupo } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";

/* Escolha do grupo — usada no "Novo complemento" (o item sera criado no grupo escolhido) e no "Clonar grupo". */
export function EscolherGrupoDialog({
  open,
  onOpenChange,
  grupos,
  modo,
  onNovoGrupo,
  onContinuar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupos: ComplementoGrupo[];
  modo: "novo-item" | "clonar";
  onNovoGrupo: () => void;
  onContinuar: (grupoId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const termo = busca.trim().toLowerCase();
  const lista = termo ? grupos.filter((g) => g.nome.toLowerCase().includes(termo)) : grupos;
  const clonar = modo === "clonar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent overlayForceRender className={MODAL_CLASSE}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{clonar ? "Clonar grupo de adicionais" : "Escolha um grupo de adicionais"}</DialogTitle>
          <DialogDescription>
            {clonar
              ? "Escolha o grupo que deseja copiar. A cópia leva os itens, as quantidades e os produtos vinculados."
              : "O grupo reúne os complementos que o cliente pode adicionar ao produto como, bebidas, coberturas ou talheres. Ele também define as quantidades mínima e máxima de escolha."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <label htmlFor="buscar-grupo" className="text-sm font-medium">
            Buscar grupo
          </label>
          <input id="buscar-grupo" className={CAMPO_CLASSE} placeholder="Busque pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{clonar ? "Qual grupo você quer clonar?" : "Este complemento pertence a qual grupo?"}</p>
          <div role="radiogroup" className="-mr-2 flex max-h-[45vh] flex-col gap-2.5 overflow-y-auto pr-2">
            {lista.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum grupo encontrado.</p>}
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
                    "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                    ativo ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      ativo ? "border-primary" : "border-muted-foreground/50"
                    )}
                  >
                    {ativo && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                  {g.nome}
                </button>
              );
            })}
          </div>
        </div>

        {!clonar && (
          <button type="button" onClick={onNovoGrupo} className="mx-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            <Plus size={15} /> Adicionar novo grupo
          </button>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className={BOTAO_PRIMARIO_CLASSE} disabled={selecionado === null} onClick={() => selecionado !== null && onContinuar(selecionado)}>
            {clonar ? "Clonar" : "Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
