import "server-only";
import { validarSessao, type AdminAutenticado } from "@/db/queries/auth";

/*
 * Equivalente de admin/helpers/superadmin_auth.php (apiSuperadminExigir):
 * mesmo token Bearer/tabela admin_api_tokens das lojas (validarSessao, ja
 * portado em auth.ts), so que exige perfil 'superadmin' em toda chamada.
 */
export async function exigirSuperadmin(token: string): Promise<AdminAutenticado | null> {
  const admin = await validarSessao(token);
  if (!admin || admin.perfil !== "superadmin") return null;
  return admin;
}
