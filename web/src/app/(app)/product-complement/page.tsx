import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { listarComplementos, opcoesVinculoComplementos } from "@/db/queries/complementos";
import { ComplementosManager } from "@/components/complementos/complementos-manager";
import { exigirRecurso } from "@/lib/acessoRecurso";

export default async function ProductComplementPage() {
  await exigirRecurso("produtos");
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof carregarDados>> | null = null;
  try {
    dados = await carregarDados(sessao.lojaId);
  } catch {
    dados = null;
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">Erro ao carregar complementos.</CardContent>
        </Card>
      </div>
    );
  }

  return <ComplementosManager grupos={dados.grupos} produtos={dados.vinculos.produtos} categorias={dados.vinculos.categorias} />;
}

async function carregarDados(lojaId: number) {
  const [grupos, vinculos] = await Promise.all([listarComplementos(lojaId), opcoesVinculoComplementos(lojaId)]);
  return { grupos, vinculos };
}
