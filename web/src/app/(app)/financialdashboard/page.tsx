import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroDashboard } from "@/lib/financeiroDashboardServer";
import { FinancialDashboardManager } from "@/components/financialdashboard/financial-dashboard-manager";

export default async function FinancialDashboardPage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroDashboard();
    return <FinancialDashboardManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o dashboard financeiro.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
