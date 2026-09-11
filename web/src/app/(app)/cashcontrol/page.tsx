import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getCaixaResumo } from "@/lib/caixa";
import { CashControlManager } from "@/components/cashcontrol/cash-control-manager";

export default async function CashControlPage() {
  let erro: string | null = null;

  try {
    const dados = await getCaixaResumo();
    return <CashControlManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o controle de caixa.";
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
