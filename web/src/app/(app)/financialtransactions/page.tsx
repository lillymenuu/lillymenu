import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroLancamentos } from "@/lib/financeiroLancamentosServer";
import { FinancialTransactionsManager } from "@/components/financialtransactions/financial-transactions-manager";

export default async function FinancialTransactionsPage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroLancamentos();
    return <FinancialTransactionsManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar os lançamentos financeiros.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
