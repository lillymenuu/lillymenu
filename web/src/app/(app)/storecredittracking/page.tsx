import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFiadoClientes } from "@/lib/fiado";
import { getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy } from "@/lib/pedidos";
import { StoreCreditManager } from "@/components/storecredittracking/store-credit-manager";

export default async function StoreCreditTrackingPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFiadoClientes>> | null = null;
  let motoboys: Motoboy[] = [];
  let erro: string | null = null;

  try {
    const [dadosRes, motoboysRes] = await Promise.all([getFiadoClientes(sessao.lojaId, { pagina: 1, limite: 10 }), getMotoboysAtivos(sessao.lojaId)]);
    dados = dadosRes;
    motoboys = motoboysRes.motoboys;
  } catch {
    erro = "Erro ao carregar o controle de fiado.";
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

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  return <StoreCreditManager dadosIniciais={dados} motoboys={motoboys} phpAdminUrl={phpAdminUrl} />;
}
