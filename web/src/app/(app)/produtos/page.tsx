import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getCategorias, getProdutos } from "@/lib/produtos";
import { getCombos } from "@/lib/combosServer";
import { ProdutosManager } from "@/components/produtos/produtos-manager";

export default async function ProdutosPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof carregarDados>> | null = null;
  let erro: string | null = null;

  try {
    dados = await carregarDados(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar produtos.";
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
  return (
    <ProdutosManager categorias={dados.categorias} produtos={dados.produtos} combos={dados.combos} phpAdminUrl={phpAdminUrl} />
  );
}

async function carregarDados(lojaId: number) {
  const [{ categorias }, { produtos }, { combos }] = await Promise.all([
    getCategorias(lojaId),
    getProdutos(lojaId),
    getCombos(lojaId),
  ]);
  return { categorias, produtos, combos };
}
