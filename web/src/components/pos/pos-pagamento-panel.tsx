"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Banknote, CreditCard, Smartphone, Ticket, Receipt, Percent, Coins, Split } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosClienteStats, PosFormaPagamento, PosPagamentoLinha } from "@/lib/pos";

const FORMAS: { valor: PosFormaPagamento; label: string; icon: typeof Banknote }[] = [
  { valor: "dinheiro", label: "Dinheiro", icon: Banknote },
  { valor: "credito", label: "Crédito", icon: CreditCard },
  { valor: "debito", label: "Débito", icon: CreditCard },
  { valor: "pix", label: "Pix", icon: Smartphone },
  { valor: "voucher", label: "Voucher", icon: Ticket },
  { valor: "fiado", label: "Fiado", icon: Receipt },
];

export type PosPagamentoDados = {
  pagamentos: PosPagamentoLinha[];
  pagamentoDividido: boolean;
  valorPago: number;
  descontoTipo: "valor" | "percent";
  descontoValor: number;
  cashbackUsado: number;
};

export function PosPagamentoPanel({
  subtotal,
  taxaEntrega,
  cupom,
  podeAplicarDesconto,
  clienteStats,
  onDadosChange,
  onVoltar,
  onFinalizar,
  finalizando,
  desabilitado,
}: {
  subtotal: number;
  taxaEntrega: number;
  cupom: { codigo: string; valor: number } | null;
  podeAplicarDesconto: boolean;
  clienteStats: PosClienteStats | null;
  onDadosChange: (dados: PosPagamentoDados, total: number) => void;
  onVoltar: () => void;
  onFinalizar: () => void;
  finalizando: boolean;
  desabilitado: boolean;
}) {
  const [formaPrimaria, setFormaPrimaria] = useState<PosFormaPagamento>("dinheiro");
  const [dividido, setDividido] = useState(false);
  const [formaSecundaria, setFormaSecundaria] = useState<PosFormaPagamento>("pix");
  const [valorSecundario, setValorSecundario] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");

  const [descontoAberto, setDescontoAberto] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"valor" | "percent">("valor");
  const [descontoValor, setDescontoValor] = useState("");

  const [usarCashback, setUsarCashback] = useState(false);
  const [cashbackValor, setCashbackValor] = useState("");

  const descontoCalculado = useMemo(() => {
    const v = Number(descontoValor || 0);
    if (!descontoAberto || v <= 0) return 0;
    return descontoTipo === "percent" ? subtotal * (v / 100) : v;
  }, [descontoAberto, descontoTipo, descontoValor, subtotal]);

  const cashbackNum = usarCashback ? Math.min(Number(cashbackValor || 0), clienteStats?.cashback ?? 0) : 0;
  const cupomValorAplicado = cupom?.valor ?? 0;

  const total = Math.max(0, subtotal + taxaEntrega - descontoCalculado - cupomValorAplicado - cashbackNum);

  const valorSecundarioNum = dividido ? Number(valorSecundario || 0) : 0;
  const valorPrimario = dividido ? Math.max(0, total - valorSecundarioNum) : total;

  const pagamentos: PosPagamentoLinha[] = dividido
    ? [
        { forma: formaPrimaria, valor: Number(valorPrimario.toFixed(2)) },
        { forma: formaSecundaria, valor: Number(valorSecundarioNum.toFixed(2)) },
      ]
    : [{ forma: formaPrimaria, valor: Number(total.toFixed(2)) }];

  const troco = formaPrimaria === "dinheiro" && !dividido && valorRecebido ? Math.max(0, Number(valorRecebido) - total) : 0;

  useEffect(() => {
    onDadosChange(
      {
        pagamentos,
        pagamentoDividido: dividido,
        valorPago: formaPrimaria === "dinheiro" ? Number(valorRecebido || total) : total,
        descontoTipo,
        descontoValor: descontoCalculado > 0 ? Number(descontoValor || 0) : 0,
        cashbackUsado: cashbackNum,
      },
      total
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formaPrimaria, dividido, formaSecundaria, valorSecundario, valorRecebido, descontoTipo, descontoValor, descontoCalculado, cashbackNum, total]);

  return (
    <div className="space-y-3">
      <button type="button" onClick={onVoltar} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Voltar ao resumo
      </button>

      <div>
        <Label className="mb-1.5 block text-xs">Forma de pagamento</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMAS.map((f) => {
            const Icon = f.icon;
            const ativo = formaPrimaria === f.valor;
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFormaPrimaria(f.valor)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-colors ${
                  ativo ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Icon className="size-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDividido((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <Split className="size-3.5" />
        {dividido ? "Cancelar pagamento dividido" : "Dividir pagamento"}
      </button>

      {dividido ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2.5">
          <div className="space-y-1">
            <Label className="text-[11px]">2ª forma</Label>
            <Select value={formaSecundaria} onValueChange={(v) => v && setFormaSecundaria(v as PosFormaPagamento)}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAS.filter((f) => f.valor !== formaPrimaria).map((f) => (
                  <SelectItem key={f.valor} value={f.valor}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Valor ({FORMAS.find((f) => f.valor === formaSecundaria)?.label})</Label>
            <MoneyInput value={valorSecundario} onChange={setValorSecundario} className="h-8 text-xs" />
          </div>
          <div className="col-span-2 text-[11px] text-muted-foreground">
            1ª forma ({FORMAS.find((f) => f.valor === formaPrimaria)?.label}): <strong>{formatBRL(valorPrimario)}</strong>
          </div>
        </div>
      ) : null}

      {formaPrimaria === "dinheiro" && !dividido ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Valor recebido</Label>
            <MoneyInput value={valorRecebido} onChange={setValorRecebido} className="h-8 text-xs" placeholder={formatBRL(total)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Troco</Label>
            <div className="flex h-8 items-center rounded-md border bg-muted/40 px-3 text-xs font-semibold">{formatBRL(troco)}</div>
          </div>
        </div>
      ) : null}

      {podeAplicarDesconto ? (
        <div className="space-y-1.5 rounded-xl border p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Percent className="size-3.5" /> Desconto
            </span>
            <Switch checked={descontoAberto} onCheckedChange={setDescontoAberto} />
          </div>
          {descontoAberto ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Select value={descontoTipo} onValueChange={(v) => v && setDescontoTipo(v as "valor" | "percent")}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor">Em reais</SelectItem>
                  <SelectItem value="percent">Em %</SelectItem>
                </SelectContent>
              </Select>
              {descontoTipo === "valor" ? (
                <MoneyInput value={descontoValor} onChange={setDescontoValor} className="h-8 text-xs" />
              ) : (
                <Input
                  className="h-8 text-xs"
                  type="number"
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  placeholder="0"
                />
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {clienteStats && (clienteStats.cashback ?? 0) > 0 ? (
        <div className="space-y-1.5 rounded-xl border p-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <Coins className="size-3.5 text-amber-600" /> Usar cashback ({formatBRL(clienteStats.cashback ?? 0)} disponível)
            </span>
            <Switch checked={usarCashback} onCheckedChange={setUsarCashback} />
          </div>
          {usarCashback ? <MoneyInput value={cashbackValor} onChange={setCashbackValor} className="h-8 text-xs" /> : null}
        </div>
      ) : null}

      <div className="space-y-1 border-t pt-2.5 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatBRL(subtotal)}</span>
        </div>
        {taxaEntrega > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <span>Taxa de entrega</span>
            <span>{formatBRL(taxaEntrega)}</span>
          </div>
        ) : null}
        {descontoCalculado > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <span>Desconto</span>
            <span>-{formatBRL(descontoCalculado)}</span>
          </div>
        ) : null}
        {cupomValorAplicado > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <span>Cupom {cupom?.codigo}</span>
            <span>-{formatBRL(cupomValorAplicado)}</span>
          </div>
        ) : null}
        {cashbackNum > 0 ? (
          <div className="flex justify-between text-emerald-600">
            <span>Cashback usado</span>
            <span>-{formatBRL(cashbackNum)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>
      </div>

      <Button className="h-11 w-full text-sm" onClick={onFinalizar} disabled={desabilitado || finalizando}>
        {finalizando ? "Finalizando..." : `Finalizar pedido · ${formatBRL(total)}`}
      </Button>
    </div>
  );
}
