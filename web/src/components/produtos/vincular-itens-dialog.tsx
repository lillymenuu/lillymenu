"use client";

import { useEffect, useState } from "react";
import { Search, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type ProdutoElegivel = {
  id: number;
  nome: string;
  imagem: string | null;
  vinculado: boolean;
};

export function VincularItensDialog({
  open,
  onOpenChange,
  produtoId,
  phpAdminUrl,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtoId: number;
  phpAdminUrl: string;
  onSaved: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<ProdutoElegivel[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    carregar("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtoId]);

  async function carregar(termo: string) {
    setCarregando(true);
    try {
      const res = await fetch(
        `/api/estoque-vinculo?produto_id=${produtoId}&search=${encodeURIComponent(termo)}`
      );
      const data = await res.json();
      if (data.ok) {
        setProdutos(data.produtos);
        setSelecionados(new Set(data.produtos.filter((p: ProdutoElegivel) => p.vinculado).map((p: ProdutoElegivel) => p.id)));
      }
    } finally {
      setCarregando(false);
    }
  }

  function toggle(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      await fetch("/api/estoque-vinculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto_id: produtoId, produto_ids: Array.from(selecionados) }),
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular itens</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            className="pl-8"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              carregar(e.target.value);
            }}
          />
        </div>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {carregando && <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>}
          {!carregando && produtos.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
          )}
          {produtos.map((p) => {
            const imagemUrl = p.imagem ? (p.imagem.startsWith("http") ? p.imagem : `${phpAdminUrl}/${p.imagem}`) : null;
            return (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox checked={selecionados.has(p.id)} onCheckedChange={() => toggle(p.id)} />
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Package size={14} className="text-muted-foreground" />
                  )}
                </div>
                <span className="truncate text-sm">{p.nome}</span>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
