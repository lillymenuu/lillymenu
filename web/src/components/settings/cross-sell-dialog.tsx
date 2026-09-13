"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shuffle, Lightbulb, Settings2 } from "lucide-react";
import { formatBRL } from "@/components/ordermanager/constants";
import type { CrossSellStatusResposta } from "@/lib/crossSell";

export function CrossSellDialog({
  open,
  onOpenChange,
  ativo,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ativo: boolean;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState(ativo);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<CrossSellStatusResposta | null>(null);

  useEffect(() => {
    if (!open) return;
    setValor(ativo);
    setStatus(null);
    fetch("/api/settings/cross-sell")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStatus(data);
      })
      .catch(() => {});
  }, [open, ativo]);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cross_sell_ativo: valor ? "1" : "0" }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success(valor ? "Cross-sell habilitado." : "Cross-sell desabilitado.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do Cross-sell</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Cross-sell</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Gere automaticamente grupos de cross-sell para aumentar o faturamento da sua loja.
              </p>
            </div>
            <Switch checked={valor} onCheckedChange={setValor} className="shrink-0" />
          </div>

          {status?.ativo ? (
            <div className="space-y-1 rounded-lg border p-4 text-center">
              <div className="text-xs text-muted-foreground">Seu faturamento aumentou</div>
              <div className="text-2xl font-bold">{formatBRL(status.faturamento_extra)}</div>
              <div className="text-xs text-muted-foreground">a mais com o cross-sell</div>
              <Link href="/crosssellreport" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
                Ver relatório completo
              </Link>
            </div>
          ) : null}

          <div className="flex gap-3 rounded-lg border p-3">
            <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">O que é o cross-sell?</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cross-sell é uma estratégia de vendas que incentiva o cliente a adicionar produtos que combinam com o
                que ele já está comprando. Ex.: Cliente selecionou um hambúrguer → sugerir batata frita e
                refrigerante. O objetivo é aumentar o valor do pedido oferecendo itens relevantes para complementar a
                compra, sem mudar a escolha principal do cliente.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-lg border p-3">
            <Settings2 className="mt-0.5 size-4.5 shrink-0 text-primary" />
            <div>
              <div className="text-sm font-medium">Como funciona?</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ao habilitar a funcionalidade de cross-sell, o sistema analisa o histórico de pedidos da sua loja e
                identifica quais produtos costumam ser comprados juntos, criando automaticamente os grupos de
                cross-sell mais relevantes. Enquanto sua loja ainda não tem pedidos suficientes de uma categoria,
                usamos bebidas como sugestão inicial, já que costumam combinar com qualquer pedido. Esses grupos serão
                exibidos na seção do carrinho do seu cardápio digital.
              </p>
            </div>
          </div>

          {status?.ativo && status.grupos.length > 0 ? (
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">Grupos cross-sell</div>
              <div className="space-y-2">
                {status.grupos.map((g) => (
                  <div key={g.categoria} className="rounded-md border p-2.5">
                    <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                      <Shuffle className="size-3" />
                      {g.categoria}
                    </div>
                    <div className="text-xs font-medium">
                      Contém {g.total_produtos} produto{g.total_produtos === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-muted-foreground">{g.exemplos.join(", ")}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
