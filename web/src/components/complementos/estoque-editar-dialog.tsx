"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { EstoqueComplemento } from "@/db/queries/complementosEstoque";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";
import { VincularItensDialog, type ItemVinculo } from "./vincular-itens-dialog";

function apenasNumero(v: string) {
  return v.replace(/\D/g, "").slice(0, 6);
}

/*
 * Criar (estoque === null) ou editar o estoque do item. Na criacao nasce um estoque proprio de
 * complementos com o nome do item. Montado so enquanto aberto.
 */
export function EstoqueEditarDialog({
  open,
  onOpenChange,
  item,
  estoque,
  onSalvo,
  onApagado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: { id: number; nome: string };
  estoque: EstoqueComplemento | null;
  onSalvo: (estoqueDoItem: EstoqueComplemento | null) => void;
  onApagado: () => void;
}) {
  const [quantidade, setQuantidade] = useState(String(estoque?.quantidade ?? 0));
  const [minima, setMinima] = useState(String(estoque?.quantidadeMinima ?? 0));
  const [vinculados, setVinculados] = useState<ItemVinculo[] | null>(estoque ? null : [{ id: item.id, nome: item.nome, grupo: "" }]);
  const [vincularAberto, setVincularAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [apagando, setApagando] = useState(false);

  useEffect(() => {
    if (!estoque) return;
    let cancelado = false;
    fetch(`/api/product-complement/estoque?tipo=${estoque.tipo}&id=${estoque.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data?.ok) {
          setQuantidade(String(data.estoque.quantidade));
          setMinima(String(data.estoque.quantidadeMinima));
          setVinculados(data.estoque.itensVinculados);
        } else {
          setVinculados([]);
        }
      })
      .catch(() => !cancelado && setVinculados([]));
    return () => {
      cancelado = true;
    };
  }, [estoque]);

  async function salvar() {
    if (vinculados === null) return;
    setSalvando(true);
    try {
      const qtd = parseInt(quantidade, 10) || 0;
      const min = parseInt(minima, 10) || 0;
      const resp = await fetch("/api/product-complement/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "salvar",
          tipo: estoque?.tipo ?? "complemento",
          id: estoque?.id,
          item_id: item.id,
          quantidade: qtd,
          quantidade_minima: min,
          item_ids: vinculados.map((v) => v.id),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível salvar o estoque.");
        return;
      }
      toast.success(estoque ? "Estoque atualizado" : "Estoque criado");
      const continuaVinculado = vinculados.some((v) => v.id === item.id);
      onSalvo(continuaVinculado ? { tipo: data.tipo, id: data.id, nome: estoque?.nome ?? item.nome, quantidade: qtd, quantidadeMinima: min } : null);
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!estoque) return;
    setApagando(true);
    try {
      const resp = await fetch("/api/product-complement/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "apagar", id: estoque.id }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível apagar o estoque.");
        return;
      }
      toast.success("Estoque apagado");
      setConfirmarApagar(false);
      onApagado();
      onOpenChange(false);
    } finally {
      setApagando(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={MODAL_CLASSE}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{estoque ? "Editar item de estoque" : "Criar item de estoque"}</DialogTitle>
          </DialogHeader>

          {estoque?.tipo === "produto" && (
            <p className="-mt-2 text-sm text-muted-foreground">
              Este é o estoque do produto <strong className="text-foreground">{estoque.nome}</strong>. Alterar o saldo aqui altera também o produto.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="estoque-qtd" className="text-sm font-medium">
              Quantidade em estoque
            </label>
            <input id="estoque-qtd" inputMode="numeric" className={CAMPO_CLASSE} value={quantidade} onChange={(e) => setQuantidade(apenasNumero(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="estoque-min" className="text-sm font-medium">
              Quantidade mínima para alerta
            </label>
            <input id="estoque-min" inputMode="numeric" className={CAMPO_CLASSE} value={minima} onChange={(e) => setMinima(apenasNumero(e.target.value))} />
          </div>

          <p className="text-sm">
            Caso você venda o mesmo item como produto ou item de complemento (adicional), você poderá vincular esse aqui e o mesmo terá um
            único estoque
          </p>
          <button
            type="button"
            onClick={() => setVincularAberto(true)}
            disabled={vinculados === null}
            className="mx-auto text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            vincular outros itens
          </button>

          <div className="mt-2 flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Adicionais(complementos) vinculados</h3>
            {vinculados === null && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {vinculados?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum adicional vinculado.</p>}
            <div className="-mr-2 flex max-h-48 flex-col gap-2 overflow-y-auto pr-2">
              {vinculados?.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/70 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">
                    {v.nome}
                    {v.grupo && <span className="text-muted-foreground"> · {v.grupo}</span>}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ${v.nome}`}
                    onClick={() => setVinculados((atual) => (atual ?? []).filter((x) => x.id !== v.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {estoque?.tipo === "complemento" && (
              <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => setConfirmarApagar(true)}>
                Deletar estoque
              </Button>
            )}
            <Button className={BOTAO_PRIMARIO_CLASSE} onClick={salvar} disabled={salvando || vinculados === null}>
              {salvando ? "Salvando..." : "Salvar estoque"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {vincularAberto && vinculados && (
        <VincularItensDialog
          open={vincularAberto}
          onOpenChange={setVincularAberto}
          selecionados={vinculados}
          onConfirmar={(lista) => {
            setVinculados(lista);
            setVincularAberto(false);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmarApagar}
        onOpenChange={setConfirmarApagar}
        titulo="Deletar estoque?"
        descricao="O estoque será apagado e os itens que usam ele ficarão sem estoque. Essa ação não pode ser desfeita."
        confirmando={apagando}
        textoConfirmar="Deletar"
        onConfirmar={apagar}
      />
    </>
  );
}
