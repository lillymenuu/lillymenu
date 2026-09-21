import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { superApiFetch } from "@/lib/superApi";
import type { SaLojasResposta } from "@/lib/superadmin";
import { SaLojasManager } from "@/components/superadmin/sa-lojas-manager";

export default async function SuperadminLojasPage() {
  let dados: SaLojasResposta | null = null;
  let erro: string | null = null;

  try {
    dados = await superApiFetch<SaLojasResposta>("/admin/api/v1/superadmin_lojas.php");
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar as lojas.";
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
