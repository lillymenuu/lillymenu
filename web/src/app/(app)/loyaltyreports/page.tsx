import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getRelatoriosFidelidade } from "@/lib/relatoriosFidelidade";
import { LoyaltyReportsView } from "@/components/loyaltyreports/loyalty-reports-view";

export default async function LoyaltyReportsPage() {
  let erro: string | null = null;

  try {
    const dados = await getRelatoriosFidelidade({ periodo: "hoje" });

    return <LoyaltyReportsView dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o relatório de fidelidade.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
