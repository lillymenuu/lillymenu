import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { dashboardDesperdicio } from "@/db/queries/desperdicios";
import { DesperdicioManager } from "@/components/desperdicios/desperdicio-manager";

export default async function DesperdiciosPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof dashboardDesperdicio>> | null = null;
  try {
    dados = await dashboardDesperdicio(sessao.lojaId);
  } catch {
    dados = null;
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">Erro ao carregar o controle de desperdício.</CardContent>
        </Card>
      </div>
    );
  }

  return <DesperdicioManager dadosIniciais={dados} />;
}
