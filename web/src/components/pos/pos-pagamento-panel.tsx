"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Smartphone, Ticket, MessageCircle, Tag, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosClienteStats, PosFormaPagamento, PosPagamentoLinha } from "@/lib/pos";
import { PosDescontoDialog } from "@/components/pos/pos-desconto-dialog";
import { PosTrocoDialog } from "@/components/pos/pos-troco-dialog";
import { cn } from "cn";

const FORMAS: { valor: PosFormaPagamento; label: string; icon: typeof Banknote }[] = [
  { valor: "credito", label: "Crédito", icon: CreditCard },
  { valor: "debito", label: "Débito", icon: CreditCard },
  { valor: "pix", label: "Pix", icon: Smartphone },
  { valor: "voucher", label: "Voucher", icon: Ticket },
  { valor: "outro", label: "Outro", icon: MessageCircle },
];

const LABEL_FORMA: Record<PosFormaPagamento, string> = {
  dinheiro: "Dinheiro",
  credito: "Cartão de crédito",
  debito: "Cartão de débito",
  pix: "Transferência Pix",
  voucher: "Voucher",
  outro: "Outro",
  fiado: "Fiado",
};

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
  valoresIniciais,
  cashbackAplicado,
  onDadosChange,
  onFinalizar,
  finalizando,
  desabilitado,
}: {
  subtotal: number;
  taxaEntrega: number;
  cupom: { codigo: string; valor: number } | null;
  podeAplicarDesconto: boolean;
  clienteStats: PosClienteStats | null;
  valoresIniciais?: { descontoTipo?: "valor" | "percent"; descontoValor?: number };
  /** Valor de cashback a usar, ja decidido no resumo do pedido (ver pos-overlay.tsx). */
  cashbackAplicado: number;
  onDadosChange: (dados: PosPagamentoDados, total: number) => void;
  onFinalizar: (imprimir: boolean) => void;
  finalizando: boolean;
  desabilitado: boolean;
}) {
  const [pagamentosRegistrados, setPagamentosRegistrados] = useState<PosPagamentoLinha[]>([]);
  const [valorInput, setValorInput] = useState("");
  const [descontoModalAberto, setDescontoModalAberto] = useState(false);
  const [trocoModalAberto, setTrocoModalAberto] = useState(false);
  const [descontoReais, setDescontoReais] = useState(() => {
    const v = valoresIniciais?.descontoValor ?? 0;
    if (v <= 0) return 0;
    return valoresIniciais?.descontoTipo === "percent" ? Math.round(subtotal * (v / 100) * 100) / 100 : v;
  });
  const [semPagamento, setSemPagamento] = useState(false);

  const cashbackNum = Math.max(0, Math.min(cashbackAplicado, clienteStats?.cashback ?? cashbackAplicado));
  const cupomValorAplicado = cupom?.valor ?? 0;

  const total = Math.max(0, subtotal + taxaEntrega - descontoReais - cupomValorAplicado - cashbackNum);
  const pagoAteAgora = useMemo(() => pagamentosRegistrados.reduce((s, p) => s + p.valor, 0), [pagamentosRegistrados]);
  const restante = Math.max(0, Math.round((total - pagoAteAgora) * 100) / 100);

  // Mantem o campo de valor sempre igual ao restante quando o restante muda
  // (nova linha registrada, desconto/cashback alterado) — o operador so edita
  // na mao quando quer registrar um valor diferente do que falta.
  useEffect(() => {
    setValorInput(restante > 0 ? String(restante) : "");
  }, [restante]);

  const pagamentosFinais: PosPagamentoLinha[] = semPagamento && restante > 0 ? [...pagamentosRegistrados, { forma: "fiado", valor: restante }] : pagamentosRegistrados;

  useEffect(() => {
    onDadosChange(
      {
        pagamentos: pagamentosFinais,
        pagamentoDividido: true,
        valorPago: pagamentosFinais.reduce((s, p) => s + p.valor, 0),
        descontoTipo: "valor",
        descontoValor: descontoReais,
        cashbackUsado: cashbackNum,
      },
      total
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamentosFinais, descontoReais, cashbackNum, total]);

  function registrarPagamento(forma: PosFormaPagamento) {
    const digitado = Math.max(0, Number(valorInput.replace(",", ".")) || 0);
    if (digitado <= 0 || restante <= 0) return;
    const aplicado = Math.min(digitado, restante);
    setPagamentosRegistrados((prev) => [...prev, { forma, valor: Number(aplicado.toFixed(2)) }]);
  }

  function confirmarTroco(recebida: number | null) {
    if (restante <= 0) return;
    setPagamentosRegistrados((prev) => [...prev, { forma: "dinheiro", valor: restante }]);
    if (recebida !== null && recebida > restante + 0.009) {
      toast.success(`Troco: ${formatBRL(recebida - restante)}`);
    }
    setTrocoModalAberto(false);
  }

  function removerPagamento(index: number) {
    setPagamentosRegistrados((prev) => prev.filter((_, i) => i !== index));
  }

  const restanteAntesDoDesconto = Math.max(0, subtotal + taxaEntrega - cupomValorAplicado - cashbackNum - pagoAteAgora + descontoReais);
  const algumSubModalAberto = descontoModalAberto || trocoModalAberto;

  return (
    <div
      className={cn(
        "space-y-4 transition-[filter,opacity] duration-150",
        algumSubModalAberto && "pointer-events-none opacity-60 blur-sm"
      )}
    >
      <MoneyInput
        value={valorInput}
        onChange={setValorInput}
        className="h-12 w-full rounded-full border-0 bg-muted/60 px-4 text-base font-medium"
        disabled={restante <= 0}
      />

      <div className="space-y-0.5 text-center text-sm">
        <div>
          Total do pedido <span className="font-semibold">{formatBRL(total)}</span>
        </div>
        {restante > 0 ? (
          <div className="font-medium text-destructive">
            Restante a cobrar {formatBRL(restante)}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setTrocoModalAberto(true)}
          disabled={restante <= 0}
          className="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Banknote className="size-4 text-muted-foreground" />
          Dinheiro
        </button>
        {FORMAS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => registrarPagamento(f.valor)}
              disabled={restante <= 0}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon className="size-4 text-muted-foreground" />
              {f.label}
            </button>
          );
        })}
        {podeAplicarDesconto ? (
          <button
            type="button"
            onClick={() => setDescontoModalAberto(true)}
            className="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <Tag className="size-4 text-muted-foreground" />
            Desconto
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => registrarPagamento("fiado")}
          disabled={restante <= 0}
          className="flex flex-col items-center gap-1.5 rounded-xl border py-3 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wallet className="size-4 text-muted-foreground" />
          Fiado
        </button>
      </div>

      <PosDescontoDialog
        open={descontoModalAberto}
        onOpenChange={setDescontoModalAberto}
        restanteAntes={restanteAntesDoDesconto}
        descontoReaisAtual={descontoReais}
        onAplicar={setDescontoReais}
      />

      <PosTrocoDialog
        open={trocoModalAberto}
        onOpenChange={setTrocoModalAberto}
        quantiaACobrar={restante}
        onConfirmar={confirmarTroco}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Finalizar sem pagamento</span>
        <Switch checked={semPagamento} onCheckedChange={setSemPagamento} />
      </div>

      {pagamentosRegistrados.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pagamento registrados</p>
          <div className="space-y-1.5">
            {pagamentosRegistrados.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2 text-sm">
                <span className="font-medium text-primary">{LABEL_FORMA[p.forma]}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatBRL(p.valor)}</span>
                  <button type="button" onClick={() => removerPagamento(i)} aria-label="Remover pagamento" className="text-muted-foreground hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-full"
          onClick={() => onFinalizar(false)}
          disabled={desabilitado || finalizando || (restante > 0 && !semPagamento)}
        >
          {finalizando ? "Finalizando..." : "Finalizar"}
        </Button>
        <Button
          className="h-11 flex-1 rounded-full"
          onClick={() => onFinalizar(true)}
          disabled={desabilitado || finalizando || (restante > 0 && !semPagamento)}
        >
          {finalizando ? "Finalizando..." : "Finalizar e imprimir"}
        </Button>
      </div>
    </div>
  );
}
