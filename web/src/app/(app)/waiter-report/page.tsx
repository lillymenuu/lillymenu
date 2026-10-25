import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getWaiterReport } from "@/lib/waiterReport";
import { listarGarconsAdmin } from "@/db/queries/relatorioGarcom";
import { WaiterReportManager } from "@/components/waiterreport/waiter-report-manager";

export default async function WaiterReportPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getWaiterReport>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getWaiterReport(sessao.lojaId, { periodo: "hoje" });
  } catch {
    erro = "Erro ao carregar o relatório de garçons.";
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

  const garcons = await listarGarconsAdmin(sessao.lojaId);

  return <WaiterReportManager dadosIniciais={dados} garcons={garcons} />;
}
