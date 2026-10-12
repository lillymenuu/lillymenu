import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { listarNotasFiscais } from "@/db/queries/nfce";
import { NfceReportManager } from "@/components/nfce/nfce-report-manager";

export default async function NfceReportPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) redirect("/settings");

  let dadosIniciais: Awaited<ReturnType<typeof listarNotasFiscais>> | null = null;
  let erro: string | null = null;
  try {
    dadosIniciais = await listarNotasFiscais(sessao.lojaId, "hoje");
  } catch {
    erro = "Erro ao carregar o relatório de notas emitidas.";
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

  return <NfceReportManager dadosIniciais={dadosIniciais} />;
}
