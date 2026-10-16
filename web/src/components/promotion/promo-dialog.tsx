"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/components/ordermanager/constants";
import type { Produto } from "@/lib/produtos";
import { cn } from "cn";

const ETIQUETA_ITEMS: Record<string, string> = {
  "": "Sem etiqueta",
  recomendado: "Recomendado",
  mais_pedido: "Mais pedido",
  novidade: "Novidade",
  edicao_limitada: "Edição limitada",
};

export function PromoDialog({
  open,
  onOpenChange,
  produto,
  phpAdminUrl,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produto: Produto | null;
  phpAdminUrl: string;
  onSalvo: () => void;
}) {
  const [ativar, setAtivar] = useState(false);
  const [preco, setPreco] = useState("");
  const [dias, setDias] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!produto) return;
    setAtivar(!!produto.em_promo);
    setPreco(produto.preco_promocional ? String(produto.preco_promocional).replace(".", ",") : "");
    setDias(produto.promo_dias ? String(produto.promo_dias) : "");
    setEtiqueta(produto.promo_etiqueta ?? "");
    setDescricao(produto.promo_descricao ?? "");
    setErro("");
  }, [produto]);

  async function salvar() {
    if (!produto) return;
    if (ativar && !preco.trim()) {
      setErro("Informe o preço promocional.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch("/api/promotion/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: produto.id,
          ativar: ativar ? 1 : 0,
          preco_promocional: preco.trim(),
          promo_dias: dias.trim(),
          promo_etiqueta: etiqueta,
          promo_descricao: descricao.trim(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "Erro ao salvar promoção.");
        return;
      }
      onSalvo();
    } catch {
      setErro("Erro ao salvar promoção.");
    } finally {
      setSalvando(false);
    }
  }

  if (!produto) return null;

  const thumbUrl = produto.imagem
    ? produto.imagem.startsWith("http")
      ? produto.imagem
      : `${phpAdminUrl}/${produto.imagem}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3 rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Promoção do produto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-shrink-0 flex-col items-center gap-2 text-center sm:w-56">
            <div className="flex size-32 items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground">
              {thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbUrl} alt={produto.nome} className="size-full object-cover" />
              ) : (
                <ImageIcon size={28} />
              )}
            </div>
            <div className="text-sm font-semibold">{produto.nome}</div>
            <div className="text-xs text-muted-foreground">
              Preço atual: <strong className="text-foreground">{formatBRL(produto.preco)}</strong>
            </div>

            <label className="mt-3 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
              <span>Ativar esta promoção</span>
              <Switch checked={ativar} onCheckedChange={(v) => setAtivar(v === true)} />
            </label>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Preço promocional</Label>
                <Input
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                  className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Dias ativos (opcional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  placeholder="Sem expiração"
                  className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Etiqueta de destaque (opcional)</Label>
              <Select items={ETIQUETA_ITEMS} value={etiqueta} onValueChange={(v) => setEtiqueta(v ?? "")}>
                <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETIQUETA_ITEMS).map(([value, label]) => (
                    <SelectItem key={value || "nenhuma"} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Descrição da promoção (opcional)</Label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
                placeholder="Alguma informação extra sobre essa promoção..."
                className="rounded-2xl border-0 bg-muted/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/60"
              />
            </div>

            {erro && <p className="text-xs font-semibold text-destructive">{erro}</p>}
          </div>
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button onClick={salvar} disabled={salvando} className={cn("rounded-full", salvando && "opacity-70")}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
