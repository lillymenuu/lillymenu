import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getCrossSellReport } from "@/lib/crossSellReport";
import { CrossSellReportManager } from "@/components/crosssellreport/cross-sell-report-manager";

export default async function CrossSellReportPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getCrossSellReport>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getCrossSellReport(sessao.lojaId, { periodo: "hoje" });
  } catch {
    erro = "Erro ao carregar o relatório de cross-sell.";
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

  return <CrossSellReportManager dadosIniciais={dados} />;
}
