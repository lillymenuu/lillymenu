import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getModoGarcomDetalhe } from "@/lib/modoGarcom";
import { WaiterModeManager } from "@/components/waitermode/waiter-mode-manager";

export default async function WaiterModePage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getModoGarcomDetalhe>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getModoGarcomDetalhe(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o modo garçom.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return <WaiterModeManager dadosIniciais={dados} />;
}
