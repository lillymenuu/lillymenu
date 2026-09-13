"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Ticket, Copy, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { cupomDescricao } from "@/lib/cupons";
import type { Cupom, CuponsListarResposta } from "@/lib/cupons";
import { CouponFormDialog } from "@/components/coupons/coupon-form-dialog";

export function CouponsManager({ dadosIniciais, phpAdminUrl }: { dadosIniciais: CuponsListarResposta; phpAdminUrl: string }) {
  const [dados, setDados] = useState(dadosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Cupom | null>(null);
  const [excluir, setExcluir] = useState<Cupom | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [alternando, setAlternando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar cupons.");
        return;
      }
      setDados(data);
    } catch {
      toast.error("Erro ao carregar cupons.");
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(c: Cupom) {
    setEditando(c);
    setFormAberto(true);
  }

  async function alternarAtivo(c: Cupom, ativo: boolean) {
    setAlternando(c.id);
    setDados((prev) => ({ ...prev, cupons: prev.cupons.map((x) => (x.id === c.id ? { ...x, ativo } : x)) }));
    try {
      const res = await fetch("/api/coupons/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, ativo: ativo ? 1 : 0 }),
      });
      const data = await res.json();
      if (!data.ok) {
        setDados((prev) => ({ ...prev, cupons: prev.cupons.map((x) => (x.id === c.id ? { ...x, ativo: !ativo } : x)) }));
        toast.error(data.msg ?? "Erro ao atualizar cupom.");
      }
    } catch {
      setDados((prev) => ({ ...prev, cupons: prev.cupons.map((x) => (x.id === c.id ? { ...x, ativo: !ativo } : x)) }));
      toast.error("Erro ao atualizar cupom.");
    } finally {
      setAlternando(null);
    }
  }

  async function copiarLink(codigo: string) {
    const link = `${phpAdminUrl}/admin/pdv.php?cupom=${codigo}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  async function confirmarExclusao() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/coupons/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluir.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao apagar cupom.");
        return;
      }
      toast.success("Cupom apagado.");
      setExcluir(null);
      carregar();
    } catch {
      toast.error("Erro ao apagar cupom.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie cupons de desconto para seus clientes.</p>
        </div>
        <Button className="gap-1.5" onClick={abrirNovo}>
          <Plus className="size-4" /> Adicionar cupom
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${carregando ? "opacity-60" : ""}`}>
        {dados.cupons.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">Nenhum cupom cadastrado ainda.</Card>
        ) : (
          dados.cupons.map((c) => {
            const disponivel = c.quantidade_total === 0 ? null : Math.max(0, c.quantidade_total - c.quantidade_usada);
            return (
              <Card
                key={c.id}
                className="cursor-pointer space-y-3 p-4 hover:border-primary/40"
                onClick={() => abrirEdicao(c)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Ticket className="size-4.5" />
                    </div>
                    <div className="text-sm font-semibold">{c.codigo}</div>
                  </div>
                  <Switch
                    checked={c.ativo}
                    disabled={alternando === c.id}
                    onCheckedChange={(v) => alternarAtivo(c, v)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <p className="text-xs text-muted-foreground">{cupomDescricao(c)}</p>

                <p className="text-xs text-muted-foreground">
                  {disponivel === null ? "Cupons ilimitados para seus clientes" : `${disponivel} cupons disponíveis para seus clientes`}
                </p>

                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      copiarLink(c.codigo);
                    }}
                  >
                    <Copy className="size-3.5" /> Copiar link com o cupom
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)}>
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <CouponFormDialog
        open={formAberto}
        onOpenChange={setFormAberto}
        cupom={editando}
        onSalvo={carregar}
        onExcluir={(c) => {
          setFormAberto(false);
          setExcluir(c);
        }}
      />

      <ConfirmDialog
        open={excluir !== null}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Apagar cupom"
        descricao="Deseja apagar este cupom? Essa ação não poderá ser desfeita."
        confirmando={excluindo}
        textoConfirmar="Apagar"
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
