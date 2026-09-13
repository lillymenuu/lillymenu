import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroFormasPagamento } from "@/lib/financeiroFormasPagamentoServer";
import { FinancialPaymentMethodsManager } from "@/components/financialpaymentmethods/financial-payment-methods-manager";

export default async function FinancialPaymentMethodsPage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroFormasPagamento();
    return <FinancialPaymentMethodsManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar as formas de pagamento.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
