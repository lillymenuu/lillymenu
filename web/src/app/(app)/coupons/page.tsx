import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getCupons } from "@/lib/cuponsServer";
import { CouponsManager } from "@/components/coupons/coupons-manager";

export default async function CouponsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getCupons>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getCupons(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar os cupons.";
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

  return <CouponsManager dadosIniciais={dados} />;
}
