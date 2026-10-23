import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { relatorioCanaisVenda } from "@/db/queries/relatorioCanaisVenda";
import { SalesChannelsReportManager } from "@/components/saleschannels/sales-channels-report-manager";

export default async function SalesChannelsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dadosIniciais: Awaited<ReturnType<typeof relatorioCanaisVenda>> | null = null;
  let erro: string | null = null;

  try {
    dadosIniciais = await relatorioCanaisVenda({ lojaId: sessao.lojaId, periodo: "hoje" });
  } catch {
    erro = "Erro ao carregar o relatório de canais de venda.";
  }

  if (!dadosIniciais) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return <SalesChannelsReportManager dadosIniciais={dadosIniciais} />;
}
