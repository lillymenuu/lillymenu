import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getRelatoriosFidelidade } from "@/lib/relatoriosFidelidade";
import { LoyaltyReportsView } from "@/components/loyaltyreports/loyalty-reports-view";

export default async function LoyaltyReportsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getRelatoriosFidelidade>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getRelatoriosFidelidade(sessao.lojaId, { periodo: "hoje" });
  } catch {
    erro = "Erro ao carregar o relatório de fidelidade.";
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

  return <LoyaltyReportsView dadosIniciais={dados} />;
}
