import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroContas } from "@/lib/financeiroContasServer";
import { FinancialAccountsManager } from "@/components/financialaccounts/financial-accounts-manager";

export default async function FinancialAccountsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroContas>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroContas(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar as contas financeiras.";
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

  return <FinancialAccountsManager dadosIniciais={dados} />;
}
