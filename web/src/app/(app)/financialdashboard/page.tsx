import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroDashboard } from "@/lib/financeiroDashboardServer";
import { FinancialDashboardManager } from "@/components/financialdashboard/financial-dashboard-manager";

export default async function FinancialDashboardPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroDashboard>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroDashboard(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o dashboard financeiro.";
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

  return <FinancialDashboardManager dadosIniciais={dados} />;
}
