import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoSuperadmin } from "@/lib/session";
import { dashboardSuperadmin } from "@/db/queries/superadminDashboard";
import { SaDashboardView, type SaDashboard } from "@/components/superadmin/sa-dashboard";

export default async function SuperadminDashboardPage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  let dados: SaDashboard | null = null;
  let erro: string | null = null;

  try {
    const d = await dashboardSuperadmin(sessao.nome);
    dados = {
      admin: d.admin,
      kpis: {
        total_lojas: d.kpis.totalLojas,
        lojas_ativas: d.kpis.lojasAtivas,
        receita_mes: d.kpis.receitaMes,
        lojas_trial: d.kpis.lojasTrial,
        expira_7: d.kpis.expira7,
        expira_15: d.kpis.expira15,
        expira_30: d.kpis.expira30,
        expiradas: d.kpis.expiradas,
        comprovantes_pendentes: d.kpis.comprovantesPendentes,
        outras: d.kpis.outras,
        suporte_nao_lidas: d.kpis.suporteNaoLidas,
      },
      cadastros_mes: d.cadastrosMes,
      leads: d.leads.map((l) => ({ id: l.id, nome: l.nome, contato: l.contato, criado_em: l.criadoEm })),
      destaque: d.destaque,
    };
  } catch {
    erro = "Erro ao carregar o dashboard.";
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
