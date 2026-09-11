import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getAssinaturaDetalhe } from "@/lib/assinatura";
import { PlanDetailsManager } from "@/components/plandetails/plan-details-manager";

export default async function PlanDetailsPage() {
  let erro: string | null = null;

  try {
    const dados = await getAssinaturaDetalhe();
    return <PlanDetailsManager dados={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar a tela de assinatura.";
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
