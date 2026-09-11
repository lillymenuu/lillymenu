import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getEstoqueListar } from "@/lib/estoque";
import { StockManager } from "@/components/stock/stock-manager";

export default async function StockPage() {
  let erro: string | null = null;

  try {
    const data = await getEstoqueListar();
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return <StockManager itensIniciais={data.itens} phpAdminUrl={phpAdminUrl} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o estoque.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
