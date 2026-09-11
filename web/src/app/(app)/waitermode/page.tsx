import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getModoGarcomDetalhe } from "@/lib/modoGarcom";
import { WaiterModeManager } from "@/components/waitermode/waiter-mode-manager";

export default async function WaiterModePage() {
  let erro: string | null = null;

  try {
    const dados = await getModoGarcomDetalhe();
    return <WaiterModeManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o modo garçom.";
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
