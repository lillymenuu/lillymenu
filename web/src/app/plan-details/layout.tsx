import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessaoAdminParaCobranca } from "@/lib/session";
import { getSidebarDataNeon } from "@/db/queries/sidebar";

/**
 * Layout proprio (fora do grupo (app)) porque essa e a UNICA tela do admin que precisa continuar
 * acessivel mesmo com a loja bloqueada por assinatura vencida -- e a rota que deixa o lojista pagar
 * o Pix e se desbloquear sozinho. Usa getSessaoAdminParaCobranca() (sem a checagem de lojaAtiva do
 * (app)/layout.tsx normal) e monta o mesmo AppShell/sidebar pra manter a mesma cara do resto do admin.
 */
export default async function PlanDetailsLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoAdminParaCobranca();
  if (!sessao) redirect("/login");

  const sidebarData = await getSidebarDataNeon(sessao.id, sessao.lojaId, sessao.perfil);

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

  return (
    <AppShell sidebarData={sidebarData} phpAdminUrl={phpAdminUrl} bloqueado={!sessao.lojaAtiva}>
      {children}
    </AppShell>
  );
}
