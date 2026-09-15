import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getOrcamentos } from "@/lib/orcamentosServer";
import { QuotesManager } from "@/components/quotes/quotes-manager";

export default async function QuotesPage() {
  let erro: string | null = null;

  try {
    const dados = await getOrcamentos();
    return <QuotesManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar os orçamentos.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
