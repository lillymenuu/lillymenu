import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getOrcamentos } from "@/lib/orcamentosServer";
import { QuotesManager } from "@/components/quotes/quotes-manager";

export default async function QuotesPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getOrcamentos>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getOrcamentos(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar os orçamentos.";
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

  return <QuotesManager dadosIniciais={dados} />;
}
