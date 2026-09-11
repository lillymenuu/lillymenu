import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getRelatorios } from "@/lib/relatorios";
import { getMotoboysAtivos } from "@/lib/pedidos";
import { SalesManager } from "@/components/sales/sales-manager";

export default async function SalesPage() {
  let erro: string | null = null;

  try {
    const [dados, motoboysRes] = await Promise.all([
      getRelatorios({ periodo: "hoje" }),
      getMotoboysAtivos(),
    ]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <SalesManager dadosIniciais={dados} motoboys={motoboysRes.motoboys} phpAdminUrl={phpAdminUrl} />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o relatório de vendas.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
