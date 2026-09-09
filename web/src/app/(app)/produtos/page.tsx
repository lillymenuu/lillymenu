import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getCategorias, getProdutos } from "@/lib/produtos";
import { ProdutosManager } from "@/components/produtos/produtos-manager";

export default async function ProdutosPage() {
  let erro: string | null = null;

  try {
    const [{ categorias }, { produtos }] = await Promise.all([getCategorias(), getProdutos()]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <ProdutosManager categorias={categorias} produtos={produtos} phpAdminUrl={phpAdminUrl} />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar produtos.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
