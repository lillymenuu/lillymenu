import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getFinanceiroCategorias } from "@/lib/financeiroCategoriasServer";
import { FinancialCategoriesManager } from "@/components/financialcategories/financial-categories-manager";

export default async function FinancialCategoriesPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getFinanceiroCategorias>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getFinanceiroCategorias(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar as categorias financeiras.";
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

  return <FinancialCategoriesManager dadosIniciais={dados} />;
}
