import "server-only";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authCookie";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";
import { validarSessao, type AdminAutenticado } from "@/db/queries/auth";
import { exigirSuperadmin } from "@/db/queries/superadminAuth";

/*
 * Substitui phpApiFetch/superApiFetch como fonte de identidade do
 * admin/superadmin logado: le o cookie httpOnly (lm_token/lm_sa_token) e
 * valida direto no Neon, sem chamar o PHP.
 */

/**
 * Sessao do lojista. Igual a admin/helpers/api_auth.php::apiAuthExigir: alem
 * de admin.ativo (ja checado dentro de validarSessao), tambem exige a loja
 * ativa — diferente do superadmin, que nao tem essa checagem.
 */
export async function getSessaoAdmin(): Promise<AdminAutenticado | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;

  const admin = await validarSessao(token);
  if (!admin || !admin.lojaAtiva) return null;
  return admin;
}

/** Sessao do superadmin. Igual a admin/helpers/superadmin_auth.php::apiSuperadminExigir. */
export async function getSessaoSuperadmin(): Promise<AdminAutenticado | null> {
  const store = await cookies();
  const token = store.get(SA_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return exigirSuperadmin(token);
}
