"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, MoreVertical, Trash2, Unlink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { ComplementoItem } from "@/db/queries/complementos";
import type { EstoqueComplemento } from "@/db/queries/complementosEstoque";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE } from "./estilos";
import { VincularEstoqueDialog } from "./vincular-estoque-dialog";
import { EstoqueEditarDialog } from "./estoque-editar-dialog";

async function postEstoque(body: Record<string, unknown>) {
  const resp = await fetch("/api/product-complement/estoque", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json().catch(() => null);
}

/* Aba "Gerenciar estoque" do item: sem estoque -> vincular/criar; com estoque -> card com saldo e acoes. */
export function ItemEstoqueAba({ item, onAlterado }: { item: ComplementoItem | null; onAlterado: () => void }) {
  const [estoque, setEstoque] = useState<EstoqueComplemento | null>(item?.estoque ?? null);
  const [vincularAberto, setVincularAberto] = useState(false);
  const [editarAberto, setEditarAberto] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [apagando, setApagando] = useState(false);

  if (!item) {
    return <p className="text-sm text-muted-foreground">Salve o item primeiro para gerenciar o estoque dele.</p>;
  }
  const itemAtual = item;

  async function desvincular() {
    const data = await postEstoque({ acao: "desvincular", item_id: itemAtual.id });
    if (!data?.ok) {
      toast.error(data?.msg ?? "Não foi possível desvincular o estoque.");
      return;
    }
    setEstoque(null);
    toast.success("Estoque desvinculado");
    onAlterado();
  }

  async function apagar() {
    if (!estoque) return;
    setApagando(true);
    try {
      const data = await postEstoque({ acao: "apagar", id: estoque.id });
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível apagar o estoque.");
        return;
      }
      setEstoque(null);
      setConfirmarApagar(false);
      toast.success("Estoque apagado");
      onAlterado();
    } finally {
      setApagando(false);
    }
  }

  return (
    <>
      {!estoque ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm">Nenhum estoque encontrado para esse item.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => setVincularAberto(true)}>
              Vincular a um estoque existente
            </Button>
            <Button className={BOTAO_PRIMARIO_CLASSE} onClick={() => setEditarAberto(true)}>
              Criar estoque
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold">{estoque.nome}</div>
              <div className="mt-0.5 flex items-center gap-1 text-sm">
                {estoque.quantidade > 0 ? <CheckCircle2 size={14} className="text-emerald-600" /> : <X size={14} className="text-destructive" />}
                <strong>{estoque.quantidade}</strong> em estoque
              </div>
              {estoque.tipo === "produto" && <div className="mt-1 text-xs text-muted-foreground">Estoque compartilhado com o produto.</div>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" className="shrink-0 rounded-full bg-muted text-primary" aria-label="Mais opções" />}
              >
                <MoreVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
                <DropdownMenuItem onClick={desvincular}>
                  <Unlink size={15} /> Desvincular estoque
                </DropdownMenuItem>
                {estoque.tipo === "complemento" && (
                  <DropdownMenuItem onClick={() => setConfirmarApagar(true)}>
                    <Trash2 size={15} /> Apagar estoque
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex justify-end">
            <Button className={BOTAO_PRIMARIO_CLASSE} onClick={() => setEditarAberto(true)}>
              Editar estoque
            </Button>
          </div>
        </div>
      )}

      {vincularAberto && (
        <VincularEstoqueDialog
          open={vincularAberto}
          onOpenChange={setVincularAberto}
          itemNome={item.nome}
          onVincular={async (tipo, id) => {
            const data = await postEstoque({ acao: "vincular", item_id: itemAtual.id, tipo, id });
            if (!data?.ok) {
              toast.error(data?.msg ?? "Não foi possível vincular o estoque.");
              return;
            }
            setEstoque(data.estoque ?? null);
            setVincularAberto(false);
            toast.success("Estoque vinculado");
            onAlterado();
          }}
        />
      )}

      {editarAberto && (
        <EstoqueEditarDialog
          open={editarAberto}
          onOpenChange={setEditarAberto}
          item={{ id: item.id, nome: item.nome }}
          estoque={estoque}
          onSalvo={(novo) => {
            setEstoque(novo);
            onAlterado();
          }}
          onApagado={() => {
            setEstoque(null);
            onAlterado();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmarApagar}
        onOpenChange={setConfirmarApagar}
        titulo="Apagar estoque?"
        descricao="O estoque será apagado e os itens que usam ele ficarão sem estoque. Essa ação não pode ser desfeita."
        confirmando={apagando}
        textoConfirmar="Apagar"
        onConfirmar={apagar}
      />
    </>
  );
}
