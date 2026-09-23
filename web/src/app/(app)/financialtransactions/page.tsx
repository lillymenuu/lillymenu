import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroLancamentos } from "@/lib/financeiroLancamentosServer";
import { FinancialTransactionsManager } from "@/components/financialtransactions/financial-transactions-manager";

export default async function FinancialTransactionsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroLancamentos>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroLancamentos(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar os lançamentos financeiros.";
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

  return <FinancialTransactionsManager dadosIniciais={dados} />;
}
