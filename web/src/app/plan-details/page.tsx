import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdminParaCobranca } from "@/lib/session";
import { souAdminPrincipal } from "@/db/queries/usuariosAdmin";
import { ShieldAlert } from "lucide-react";
import { getAssinaturaDetalhe } from "@/lib/assinatura";
import { PlanDetailsManager } from "@/components/plandetails/plan-details-manager";

export default async function PlanDetailsPage() {
  const sessao = await getSessaoAdminParaCobranca();
  if (!sessao) redirect("/login");

  /* Assinatura e dados de cobranca: so o dono da loja (as APIs conferem o mesmo). */
  if (!(await souAdminPrincipal(sessao.id, sessao.perfil))) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldAlert size={22} />
        </span>
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          {sessao.lojaAtiva
            ? "Apenas o administrador da loja pode ver a assinatura e os pagamentos."
            : "A assinatura da loja precisa ser regularizada. Fale com o administrador da loja."}
        </p>
      </div>
    );
  }

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
