import "server-only";
import { cookies } from "next/headers";
import { SA_TOKEN_COOKIE } from "@/lib/superAuthCookie";
import { PhpApiError, phpApiBaseUrl } from "@/lib/phpApi";

/**
 * Chama admin/api/v1/superadmin_*.php servidor-a-servidor com o token do
 * SUPERADMIN (cookie lm_sa_token, nunca o lm_token das lojas). O PHP ainda
 * confere o perfil "superadmin" em toda chamada.
 */
export async function superApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const store = await cookies();
  const token = store.get(SA_TOKEN_COOKIE)?.value;

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${phpApiBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    throw new PhpApiError(res.status, data?.erro ?? data?.msg ?? "Erro ao falar com a API.");
  }
  return data as T;
}
