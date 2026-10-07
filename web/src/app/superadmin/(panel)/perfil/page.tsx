import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoSuperadmin } from "@/lib/session";
import { getPerfilSuperadmin, type PerfilSuperadmin } from "@/db/queries/superadminPerfil";
import { getNotificacoesSuperadmin, type SaNotificacao } from "@/lib/superadminServer";
import { SaPerfil } from "@/components/superadmin/sa-perfil";

export default async function SuperadminPerfilPage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  let dados: { perfil: PerfilSuperadmin; notificacoes: SaNotificacao[] } | null = null;

  try {
    const [perfil, notificacoes] = await Promise.all([getPerfilSuperadmin(sessao.id), getNotificacoesSuperadmin()]);
    dados = { perfil, notificacoes };
  } catch {
    dados = null;
  }

  if (!dados) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">Erro ao carregar o perfil.</CardContent>
      </Card>
    );
  }

  return <SaPerfil perfil={dados.perfil} notificacoes={dados.notificacoes} />;
}
