import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getMotoboysGerenciar } from "@/lib/motoboysGerenciar";
import { getMotoboysAtivos } from "@/lib/pedidos";
import { MotoboysManager } from "@/components/motoboys/motoboys-manager";

export default async function MotoboysPage() {
  let erro: string | null = null;

  try {
    const [dados, motoboysRes] = await Promise.all([
      getMotoboysGerenciar({ periodo: "hoje" }),
      getMotoboysAtivos(),
    ]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <MotoboysManager dadosIniciais={dados} motoboysAtivos={motoboysRes.motoboys} phpAdminUrl={phpAdminUrl} />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar a tela de motoboys.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
