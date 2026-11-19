import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessaoAdmin } from "@/lib/session";
import { getSidebarDataCached } from "@/lib/acessoRecurso";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";

/* PWA do painel (so aqui, nao na loja publica dos clientes): no iPhone o Web Push do Gestor de
   pedidos so funciona com o site adicionado a Tela de Inicio, aberto como app (sem barra do Safari). */
export const metadata: Metadata = {
  manifest: "/gestor.webmanifest",
  appleWebApp: { capable: true, title: "LillyMenu", statusBarStyle: "default" },
  /* Icone do app = logo do menu (landing_config.logo_image) com fundo preenchido — o iOS pinta de
     preto cantos transparentes. Se a logo mudar no superadmin, gerar de novo os public/icone-app-*.png. */
  icons: { apple: "/apple-touch-icon.png" },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const [sidebarData, landingCfg] = await Promise.all([
    getSidebarDataCached(sessao.id, sessao.lojaId, sessao.perfil),
    getLandingConfig(),
  ]);

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

  return (
    <AppShell sidebarData={sidebarData} phpAdminUrl={phpAdminUrl} logoPlataforma={lc(landingCfg, "logo_image")}>
      {children}
    </AppShell>
  );
}
