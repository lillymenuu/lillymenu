import { redirect } from "next/navigation";
import { PhpApiError } from "@/lib/phpApi";
import { superApiFetch } from "@/lib/superApi";
import { SuperadminShell } from "@/components/superadmin/superadmin-shell";

type MeResposta = {
  ok: true;
  admin: { nome: string; email: string };
  unread: number;
};

export default async function SuperadminPanelLayout({ children }: { children: React.ReactNode }) {
  let me: MeResposta | null = null;
  try {
    me = await superApiFetch<MeResposta>("/admin/api/v1/superadmin_me.php");
  } catch (e) {
    /* Sem token valido de superadmin (inclui tokens de lojista): volta ao login. */
    if (e instanceof PhpApiError && (e.status === 401 || e.status === 403)) {
      redirect("/superadmin/login");
    }
    throw e;
  }

  return (
    <SuperadminShell admin={me.admin} suporteNaoLidas={me.unread}>
      {children}
    </SuperadminShell>
  );
}
