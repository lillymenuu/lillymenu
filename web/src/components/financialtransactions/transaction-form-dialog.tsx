"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import { MESES_LABEL } from "@/lib/financeiroLancamentos";
import type {
  FinanceiroCategoriaOpcao,
  FinanceiroContaOpcao,
  FinanceiroFormaPagamentoOpcao,
  FinanceiroLancamento,
} from "@/lib/financeiroLancamentos";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  lancamento,
  categorias,
  contas,
  formasPagamento,
  anos,
  mesAtual,
  anoAtual,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lancamento: FinanceiroLancamento | null;
  categorias: FinanceiroCategoriaOpcao[];
  contas: FinanceiroContaOpcao[];
  formasPagamento: FinanceiroFormaPagamentoOpcao[];
  anos: number[];
  mesAtual: number;
  anoAtual: number;
  onSalvo: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [transactionDate, setTransactionDate] = useState(hojeISO());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(String(mesAtual));
  const [referenceYear, setReferenceYear] = useState(String(anoAtual));
  const [notes, setNotes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (lancamento) {
      setType(lancamento.type);
      setTransactionDate(lancamento.transaction_date);
      setDescription(lancamento.description);
      setAmount(String(lancamento.amount));
      setAccountId(String(lancamento.account_id));
      setCategoryId(String(lancamento.category_id));
      setPaymentMethodId(lancamento.payment_method_id ? String(lancamento.payment_method_id) : "");
      setReferenceMonth(String(lancamento.reference_month));
      setReferenceYear(String(lancamento.reference_year));
      setNotes(lancamento.notes ?? "");
    } else {
      setType("income");
      setTransactionDate(hojeISO());
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setPaymentMethodId("");
      setReferenceMonth(String(mesAtual));
      setReferenceYear(String(anoAtual));
      setNotes("");
    }
  }, [open, lancamento, mesAtual, anoAtual]);

  const categoriasFiltradas = categorias.filter((c) => c.type === type);

  useEffect(() => {
    if (!open) return;
    if (categoryId && !categoriasFiltradas.some((c) => String(c.id) === categoryId)) {
      setCategoryId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open]);

  function alterarCategoria(id: string) {
    setCategoryId(id);
    const cat = categorias.find((c) => String(c.id) === id);
    if (cat) setType(cat.type);
  }

  async function salvar() {
    if (!description.trim() || !amount || !accountId || !categoryId || !transactionDate) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/financialtransactions/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lancamento?.id ?? 0,
          type,
          transaction_date: transactionDate,
          description,
          amount,
          account_id: Number(accountId),
          category_id: Number(categoryId),
          payment_method_id: paymentMethodId ? Number(paymentMethodId) : null,
          reference_month: Number(referenceMonth),
          reference_year: Number(referenceYear),
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar lançamento.");
        return;
      }
      toast.success(data.msg ?? "Lançamento salvo.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[600px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{lancamento ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as "income" | "expense")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => (type === "income" ? "Receita" : "Despesa")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Venda balcão" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor</Label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Conta</Label>
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {() => contas.find((c) => String(c.id) === accountId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoryId} onValueChange={(v) => v && alterarCategoria(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione">
                    {() => categorias.find((c) => String(c.id) === categoryId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={paymentMethodId || "none"} onValueChange={(v) => setPaymentMethodId(v === "none" ? "" : (v as string))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => formasPagamento.find((p) => String(p.id) === paymentMethodId)?.name ?? "Não informar"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informar</SelectItem>
                  {formasPagamento.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Mês de referência</Label>
              <Select value={referenceMonth} onValueChange={(v) => v && setReferenceMonth(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => MESES_LABEL[Number(referenceMonth)] ?? referenceMonth}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MESES_LABEL).map(([id, nome]) => (
                    <SelectItem key={id} value={id}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano de referência</Label>
              <Select value={referenceYear} onValueChange={(v) => v && setReferenceYear(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
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
