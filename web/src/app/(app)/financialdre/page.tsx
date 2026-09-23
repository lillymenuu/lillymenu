import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroDre } from "@/lib/financeiroDreServer";
import { FinancialDreManager } from "@/components/financialdre/financial-dre-manager";

export default async function FinancialDrePage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroDre>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroDre(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o DRE.";
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

  return <FinancialDreManager dadosIniciais={dados} />;
}
