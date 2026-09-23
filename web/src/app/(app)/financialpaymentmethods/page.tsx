import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroFormasPagamento } from "@/lib/financeiroFormasPagamentoServer";
import { FinancialPaymentMethodsManager } from "@/components/financialpaymentmethods/financial-payment-methods-manager";

export default async function FinancialPaymentMethodsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroFormasPagamento>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroFormasPagamento(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar as formas de pagamento.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return <FinancialPaymentMethodsManager dadosIniciais={dados} />;
}
