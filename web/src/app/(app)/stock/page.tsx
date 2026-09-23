import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getSessaoAdmin } from "@/lib/session";
import { getEstoqueListar } from "@/lib/estoque";
import { StockManager } from "@/components/stock/stock-manager";

export default async function StockPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let data: Awaited<ReturnType<typeof getEstoqueListar>> | null = null;
  let erro: string | null = null;

  try {
    data = await getEstoqueListar(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o estoque.";
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  return (
    <>
      <StockManager itensIniciais={data.itens} phpAdminUrl={phpAdminUrl} />
      <ScrollToTop />
    </>
  );
}
