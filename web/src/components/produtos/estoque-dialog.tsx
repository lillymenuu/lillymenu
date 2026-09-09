"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VincularItensDialog } from "./vincular-itens-dialog";

type Vinculado = { id: number; nome: string };

export function EstoqueDialog({
  open,
  onOpenChange,
  produtoId,
  phpAdminUrl,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtoId: number | null;
  phpAdminUrl: string;
  onSaved?: (novaQuantidade: number) => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [quantidade, setQuantidade] = useState("0");
  const [quantidadeMinima, setQuantidadeMinima] = useState("0");
  const [vinculados, setVinculados] = useState<Vinculado[]>([]);
  const [vincularOpen, setVincularOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!open || !produtoId) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtoId]);

  async function carregar() {
    if (!produtoId) return;
    setCarregando(true);
    try {
      const res = await fetch(`/api/estoque?produto_id=${produtoId}`);
      const data = await res.json();
      if (data.ok) {
        setQuantidade(String(data.quantidade));
        setQuantidadeMinima(String(data.quantidade_minima));
        setVinculados(data.vinculados ?? []);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function salvar() {
    if (!produtoId) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/estoque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produtoId,
          quantidade: Math.max(0, parseInt(quantidade, 10) || 0),
          quantidade_minima: Math.max(0, parseInt(quantidadeMinima, 10) || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao salvar estoque.");
        return;
      }
      toast.success("Item de estoque editado com sucesso");
      onSaved?.(Math.max(0, parseInt(quantidade, 10) || 0));
      onOpenChange(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!produtoId) return;
    if (!confirm("Tem certeza que deseja deletar o controle de estoque deste produto? A quantidade e o vínculo com outros itens serão removidos.")) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/estoque", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao deletar o estoque.");
        return;
      }
      toast.success("Estoque deletado com sucesso");
      onDeleted?.();
      onOpenChange(false);
      router.refresh();
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar item de estoque</DialogTitle>
          </DialogHeader>

          {carregando ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-qtd-dialog">Quantidade em estoque</Label>
                <Input
                  id="est-qtd-dialog"
                  type="number"
                  min={0}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="est-min-dialog">Quantidade mínima para alerta</Label>
                <Input
                  id="est-min-dialog"
                  type="number"
                  min={0}
                  value={quantidadeMinima}
                  onChange={(e) => setQuantidadeMinima(e.target.value)}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                Caso você venda o mesmo item como produto ou item de complemento (adicional), você
                poderá vincular esse aqui e o mesmo terá um único estoque
              </p>
              <button
                type="button"
                onClick={() => setVincularOpen(true)}
                className="w-fit text-sm font-medium text-primary hover:underline"
              >
                vincular outros itens
              </button>

              {vinculados.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Produtos vinculados</span>
                  <div className="flex flex-col gap-1">
                    {vinculados.map((v) => (
                      <div key={v.id} className="rounded-lg bg-muted px-3 py-2 text-sm">
                        {v.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={excluir} disabled={excluindo}>
              {excluindo ? "Excluindo..." : "Deletar estoque"}
            </Button>
            <Button onClick={salvar} disabled={salvando || carregando}>
              {salvando ? "Salvando..." : "Salvar estoque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {produtoId && (
        <VincularItensDialog
          open={vincularOpen}
          onOpenChange={setVincularOpen}
          produtoId={produtoId}
          phpAdminUrl={phpAdminUrl}
          onSaved={carregar}
        />
      )}
    </>
  );
}
