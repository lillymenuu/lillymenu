import { redirect } from "next/navigation";
import { getSessaoAdmin } from "@/lib/session";
import { exigirRecurso } from "@/lib/acessoRecurso";
import { souAdminPrincipal } from "@/db/queries/usuariosAdmin";
import { listarNiveisAcesso } from "@/db/queries/permissoesNiveis";
import { PermissoesLista } from "@/components/permissoes/permissoes-lista";
import { SomenteAdminPrincipal } from "@/components/permissoes/somente-admin-principal";

export default async function PermissionsPage() {
  await exigirRecurso("configuracoes");
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  if (!(await souAdminPrincipal(sessao.id, sessao.perfil))) return <SomenteAdminPrincipal />;

  const niveis = await listarNiveisAcesso(sessao.lojaId);
  return <PermissoesLista niveis={niveis} />;
}
