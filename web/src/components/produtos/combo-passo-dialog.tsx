"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Produto } from "@/lib/produtos";
import type { ComboPasso, ComboPassoSalvarResposta } from "@/lib/combos";

/*
 * Cria/edita um passo do combo — salva imediatamente (precisa de
 * comboId, o combo ja tem que existir), igual ao legado
 * (admin/api/combo_passo_save.php). Depois de salvar, avisa o pai via
 * onSalvo pra recarregar a lista de passos.
 */
export function ComboPassoDialog({
  open,
  onOpenChange,
  comboId,
  passo,
  produtos,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  comboId: number | null;
  passo: ComboPasso | null;
  produtos: Produto[];
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [obrigatorio, setObrigatorio] = useState(true);
  const [minItens, setMinItens] = useState("1");
  const [maxItens, setMaxItens] = useState("1");
  const [permiteRepetir, setPermiteRepetir] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    if (passo) {
      setNome(passo.nome);
      setDescricao(passo.descricao ?? "");
      setObrigatorio(passo.obrigatorio === 1);
      setMinItens(String(passo.min_itens));
      setMaxItens(String(passo.max_itens));
      setPermiteRepetir(passo.permite_repetir === 1);
      setSelecionados(new Set(passo.opcoes.map((o) => o.id)));
    } else {
      setNome("");
      setDescricao("");
      setObrigatorio(true);
      setMinItens("1");
      setMaxItens("1");
      setPermiteRepetir(false);
      setSelecionados(new Set());
    }
  }, [open, passo]);

  function toggleProduto(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const produtosAtivos = produtos.filter((p) => p.ativo === 1 && p.estoque_quantidade > 0);
  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = termo ? produtosAtivos.filter((p) => p.nome.toLowerCase().includes(termo)) : produtosAtivos;

  async function salvar() {
    if (!comboId) return;
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      toast.error("Informe o nome do passo.");
      return;
    }
    if (selecionados.size === 0) {
      toast.error("Adicione pelo menos uma opção ao passo.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/combos/passo-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passo_id: passo?.id ?? 0,
          combo_id: comboId,
          nome: nomeLimpo,
          descricao: descricao.trim(),
          obrigatorio: obrigatorio ? 1 : 0,
          min_itens: Math.max(0, parseInt(minItens, 10) || 0),
          max_itens: Math.max(1, parseInt(maxItens, 10) || 1),
          permite_repetir: permiteRepetir ? 1 : 0,
          produto_ids: [...selecionados].join(","),
        }),
      });
      const data: ComboPassoSalvarResposta | { ok: false; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar o passo.");
        return;
      }
      toast.success(passo ? "Passo atualizado." : "Passo criado.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar o passo.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{passo ? "Editar passo" : "Novo passo"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label className="text-xs">Nome do passo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Ex.: "Escolha sua pizza"' />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ajuda a explicar o que deve ser escolhido" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <span className="text-sm font-medium">Obrigatório</span>
              <Switch checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(v === true)} />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <span className="text-sm font-medium">Permite repetir</span>
              <Switch checked={permiteRepetir} onCheckedChange={(v) => setPermiteRepetir(v === true)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mínimo de itens</Label>
              <Input type="number" min={0} value={minItens} onChange={(e) => setMinItens(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Máximo de itens</Label>
              <Input type="number" min={1} value={maxItens} onChange={(e) => setMaxItens(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Produtos disponíveis neste passo</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" className="pl-9" />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {produtosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2.5 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50">
                    <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleProduto(p.id)} className="size-4 accent-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.nome}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">R$ {p.preco_base.toFixed(2).replace(".", ",")}</span>
                  </label>
                ))
              )}
            </div>
            <div className="text-right text-xs text-muted-foreground">{selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar passo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
