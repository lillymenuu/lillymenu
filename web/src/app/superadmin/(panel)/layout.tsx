import { redirect } from "next/navigation";
import { getSessaoSuperadmin } from "@/lib/session";
import { superadminMe } from "@/db/queries/superadminMe";
import { SuperadminShell } from "@/components/superadmin/superadmin-shell";

export default async function SuperadminPanelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  const me = await superadminMe(sessao.id, sessao.nome);

  return (
    <SuperadminShell admin={me.admin} suporteNaoLidas={me.unread}>
      {children}
    </SuperadminShell>
  );
}
