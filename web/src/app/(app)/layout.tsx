import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessaoAdmin } from "@/lib/session";
import { getSidebarDataNeon } from "@/db/queries/sidebar";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const [sidebarData, landingCfg] = await Promise.all([
    getSidebarDataNeon(sessao.id, sessao.lojaId, sessao.perfil),
    getLandingConfig(),
  ]);

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

  return (
    <AppShell sidebarData={sidebarData} phpAdminUrl={phpAdminUrl} logoPlataforma={lc(landingCfg, "logo_image")}>
      {children}
    </AppShell>
  );
}
