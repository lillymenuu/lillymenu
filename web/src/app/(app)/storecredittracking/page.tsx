import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFiadoClientes } from "@/lib/fiado";
import { getMotoboysAtivos } from "@/lib/pedidos";
import { StoreCreditManager } from "@/components/storecredittracking/store-credit-manager";

export default async function StoreCreditTrackingPage() {
  let erro: string | null = null;

  try {
    const [dados, motoboysRes] = await Promise.all([
      getFiadoClientes({ pagina: 1, limite: 10 }),
      getMotoboysAtivos(),
    ]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <StoreCreditManager dadosIniciais={dados} motoboys={motoboysRes.motoboys} phpAdminUrl={phpAdminUrl} />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o controle de fiado.";
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
