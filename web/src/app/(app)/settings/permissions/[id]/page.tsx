import { notFound, redirect } from "next/navigation";
import { getSessaoAdmin } from "@/lib/session";
import { exigirRecurso } from "@/lib/acessoRecurso";
import { souAdminPrincipal } from "@/db/queries/usuariosAdmin";
import { obterNivelAcesso } from "@/db/queries/permissoesNiveis";
import { PermissaoForm } from "@/components/permissoes/permissao-form";
import { SomenteAdminPrincipal } from "@/components/permissoes/somente-admin-principal";

/** /settings/permissions/new cria; /settings/permissions/<id> abre (padrao so leitura). */
export default async function PermissionPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirRecurso("configuracoes");
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  if (!(await souAdminPrincipal(sessao.id, sessao.perfil))) return <SomenteAdminPrincipal />;

  const { id } = await params;
  if (id === "new") return <PermissaoForm nivel={null} />;

  const nivel = /^\d+$/.test(id) ? await obterNivelAcesso(sessao.lojaId, Number(id)) : null;
  if (!nivel) notFound();
  return <PermissaoForm nivel={nivel} />;
}
