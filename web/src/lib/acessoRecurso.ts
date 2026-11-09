import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessaoAdmin } from "@/lib/session";
import { getSidebarDataNeon } from "@/db/queries/sidebar";

/*
 * Acesso as telas pelo plano contratado e pelo nivel do usuario. O menu lateral ja esconde o que
 * nao esta liberado, mas a tela abria mesmo assim digitando a URL. Cada page.tsx chama
 * exigirRecurso() com a mesma chave de menu do sidebar (sidebar-nav-config) antes de carregar
 * qualquer dado; sem acesso, vai pra /sem-acesso.
 *
 * A consulta e a mesma do layout (getSidebarDataNeon) e fica em cache por requisicao, entao o
 * layout e a pagina nao consultam o banco duas vezes.
 */
export const getSidebarDataCached = cache(getSidebarDataNeon);

export async function exigirRecurso(menuKey: string): Promise<void> {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");
  const sidebar = await getSidebarDataCached(sessao.id, sessao.lojaId, sessao.perfil);
  if (!sidebar.menu[menuKey]) redirect(`/sem-acesso?recurso=${encodeURIComponent(menuKey)}`);
}
