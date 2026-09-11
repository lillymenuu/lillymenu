import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getCrossSellReport } from "@/lib/crossSellReport";
import { CrossSellReportManager } from "@/components/crosssellreport/cross-sell-report-manager";

export default async function CrossSellReportPage() {
  let erro: string | null = null;

  try {
    const dados = await getCrossSellReport({ periodo: "hoje" });
    return <CrossSellReportManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o relatório de cross-sell.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
