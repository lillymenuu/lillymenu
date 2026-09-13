"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import { CUPOM_TIPO_LABEL } from "@/lib/cupons";
import type { Cupom, CupomTipo } from "@/lib/cupons";

export function CouponFormDialog({
  open,
  onOpenChange,
  cupom,
  onSalvo,
  onExcluir,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cupom: Cupom | null;
  onSalvo: () => void;
  onExcluir: (cupom: Cupom) => void;
}) {
  const [tipo, setTipo] = useState<CupomTipo>("percent");
  const [codigo, setCodigo] = useState("");
  const [desconto, setDesconto] = useState("");
  const [minimo, setMinimo] = useState("");
  const [quantidadeTotal, setQuantidadeTotal] = useState("0");
  const [ativo, setAtivo] = useState(true);
  const [primeiraCompra, setPrimeiraCompra] = useState(false);
  const [publico, setPublico] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (cupom) {
      setTipo(cupom.tipo);
      setCodigo(cupom.codigo);
      setDesconto(String(cupom.desconto));
      setMinimo(String(cupom.minimo));
      setQuantidadeTotal(String(cupom.quantidade_total));
      setAtivo(cupom.ativo);
      setPrimeiraCompra(cupom.primeira_compra);
      setPublico(cupom.publico);
    } else {
      setTipo("percent");
      setCodigo("");
      setDesconto("");
      setMinimo("");
      setQuantidadeTotal("0");
      setAtivo(true);
      setPrimeiraCompra(false);
      setPublico(false);
    }
  }, [open, cupom]);

  async function salvar() {
    const codigoLimpo = codigo.trim().toUpperCase();
    if (!codigoLimpo) {
      toast.error("Informe o código do cupom.");
      return;
    }
    if (!/^[A-Z0-9_-]{3,15}$/.test(codigoLimpo)) {
      toast.error("Código inválido: use de 3 a 15 letras, números, _ ou -.");
      return;
    }
    const descontoNum = Number(desconto || 0);
    if (tipo !== "frete" && descontoNum <= 0) {
      toast.error("Informe um valor de desconto válido.");
      return;
    }
    if (tipo === "percent" && descontoNum > 100) {
      toast.error("O percentual não pode passar de 100%.");
      return;
    }
    const quantidadeNum = Number(quantidadeTotal || 0);
    if (quantidadeNum < 0) {
      toast.error("Quantidade inválida.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/coupons/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cupom?.id ?? 0,
          codigo: codigoLimpo,
          tipo,
          desconto: tipo === "frete" ? 0 : descontoNum,
          minimo: Number(minimo || 0),
          quantidade_total: quantidadeNum,
          ativo,
          primeira_compra: primeiraCompra,
          publico,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar cupom.");
        return;
      }
      toast.success(cupom ? "Cupom atualizado." : "Cupom salvo.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar cupom.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[520px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{cupom ? "Editar cupom" : "Adicionar cupom"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de desconto</Label>
              <Select value={tipo} onValueChange={(v) => v && setTipo(v as CupomTipo)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => CUPOM_TIPO_LABEL[tipo]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">{CUPOM_TIPO_LABEL.valor}</SelectItem>
                  <SelectItem value="percent">{CUPOM_TIPO_LABEL.percent}</SelectItem>
                  <SelectItem value="frete">{CUPOM_TIPO_LABEL.frete}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código do cupom</Label>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 15))}
                placeholder="Ex.: BEMVINDO10"
                maxLength={15}
              />
              <div className="text-right text-[11px] text-muted-foreground">{codigo.length}/15</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{tipo === "percent" ? "Valor do desconto (%)" : "Valor do desconto"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={tipo === "frete" ? "0" : desconto}
                onChange={(e) => setDesconto(e.target.value)}
                disabled={tipo === "frete"}
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor mínimo do pedido</Label>
              <MoneyInput value={minimo} onChange={setMinimo} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Quantidade de cupons disponíveis</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={quantidadeTotal}
              onChange={(e) => setQuantidadeTotal(e.target.value)}
              placeholder="0 = ilimitado"
            />
            <p className="text-[11px] text-muted-foreground">Use 0 para deixar ilimitado.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Disponibilidade</div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Primeira compra</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Desconto válido só para clientes sem pedidos anteriores.</p>
            </div>
            <Switch checked={primeiraCompra} onCheckedChange={setPrimeiraCompra} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Cupom público</div>
              <p className="mt-0.5 text-xs text-muted-foreground">Fica visível no cardápio pra todo mundo, sem precisar compartilhar o código.</p>
            </div>
            <Switch checked={publico} onCheckedChange={setPublico} />
          </div>
        </div>

        <DialogFooter className={cupom ? "sm:justify-between" : undefined}>
          {cupom ? (
            <Button variant="destructive" onClick={() => onExcluir(cupom)} disabled={salvando}>
              Apagar cupom
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : cupom ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
