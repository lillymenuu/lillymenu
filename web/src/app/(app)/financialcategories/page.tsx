import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getFinanceiroCategorias } from "@/lib/financeiroCategoriasServer";
import { FinancialCategoriesManager } from "@/components/financialcategories/financial-categories-manager";

export default async function FinancialCategoriesPage() {
  let erro: string | null = null;

  try {
    const dados = await getFinanceiroCategorias();
    return <FinancialCategoriesManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar as categorias financeiras.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
