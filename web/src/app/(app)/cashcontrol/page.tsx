import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getSessaoAdmin } from "@/lib/session";
import { getCaixaResumo } from "@/lib/caixa";
import { CashControlManager } from "@/components/cashcontrol/cash-control-manager";

export default async function CashControlPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getCaixaResumo>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getCaixaResumo(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o controle de caixa.";
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

  return (
    <>
      <CashControlManager dadosIniciais={dados} />
      <ScrollToTop />
    </>
  );
}
