import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getMotoboysGerenciar } from "@/lib/motoboysGerenciar";
import { getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy } from "@/lib/pedidos";
import { MotoboysManager } from "@/components/motoboys/motoboys-manager";

export default async function MotoboysPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getMotoboysGerenciar>> | null = null;
  let motoboysAtivos: Motoboy[] = [];
  let erro: string | null = null;

  try {
    const [dadosRes, motoboysRes] = await Promise.all([getMotoboysGerenciar(sessao.lojaId, { periodo: "hoje" }), getMotoboysAtivos(sessao.lojaId)]);
    dados = dadosRes;
    motoboysAtivos = motoboysRes.motoboys;
  } catch {
    erro = "Erro ao carregar a tela de motoboys.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  return <MotoboysManager dadosIniciais={dados} motoboysAtivos={motoboysAtivos} phpAdminUrl={phpAdminUrl} />;
}
