import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroContas } from "@/lib/financeiroContasServer";
import { FinancialAccountsManager } from "@/components/financialaccounts/financial-accounts-manager";

export default async function FinancialAccountsPage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroContas();
    return <FinancialAccountsManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar as contas financeiras.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
