import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getRelatorios } from "@/lib/relatorios";
import { getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy } from "@/lib/pedidos";
import { SalesManager } from "@/components/sales/sales-manager";

export default async function SalesPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getRelatorios>> | null = null;
  let motoboys: Motoboy[] = [];
  let erro: string | null = null;

  try {
    const [dadosRes, motoboysRes] = await Promise.all([getRelatorios(sessao.lojaId, { periodo: "hoje" }), getMotoboysAtivos(sessao.lojaId)]);
    dados = dadosRes;
    motoboys = motoboysRes.motoboys;
  } catch {
    erro = "Erro ao carregar o relatório de vendas.";
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
  return <SalesManager dadosIniciais={dados} motoboys={motoboys} phpAdminUrl={phpAdminUrl} />;
}
