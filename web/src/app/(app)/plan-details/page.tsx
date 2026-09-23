import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getAssinaturaDetalhe } from "@/lib/assinatura";
import { PlanDetailsManager } from "@/components/plandetails/plan-details-manager";

export default async function PlanDetailsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getAssinaturaDetalhe>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getAssinaturaDetalhe(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar a tela de assinatura.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return <PlanDetailsManager dados={dados} />;
}
