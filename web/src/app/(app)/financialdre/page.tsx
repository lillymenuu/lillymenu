import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroDre } from "@/lib/financeiroDreServer";
import { FinancialDreManager } from "@/components/financialdre/financial-dre-manager";

export default async function FinancialDrePage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroDre();
    return <FinancialDreManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o DRE.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
