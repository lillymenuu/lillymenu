import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { superApiFetch } from "@/lib/superApi";
import { SaDashboardView, type SaDashboard } from "@/components/superadmin/sa-dashboard";

export default async function SuperadminDashboardPage() {
  let dados: SaDashboard | null = null;
  let erro: string | null = null;

  try {
    dados = await superApiFetch<SaDashboard>("/admin/api/v1/superadmin_dashboard.php");
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o dashboard.";
  }

  if (!dados) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    );
  }

  return <SaDashboardView dados={dados} />;
}
