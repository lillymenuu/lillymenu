import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoSuperadmin } from "@/lib/session";
import { getListagemLojasSuperadmin } from "@/lib/superadminServer";
import type { SaLojasResposta } from "@/lib/superadmin";
import { SaLojasManager } from "@/components/superadmin/sa-lojas-manager";

export default async function SuperadminLojasPage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  let dados: SaLojasResposta | null = null;
  let erro: string | null = null;

  try {
    dados = await getListagemLojasSuperadmin();
  } catch {
    erro = "Erro ao carregar as lojas.";
  }

  if (!dados) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    );
  }

  return <SaLojasManager inicial={dados} phpAdminUrl={process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? ""} />;
}
