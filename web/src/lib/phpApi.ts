import "server-only";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authCookie";

const BASE_URL = process.env.PHP_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("PHP_API_BASE_URL nao configurada.");
}

export class PhpApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Chama a API do PHP (admin/api/v1/*) servidor-a-servidor, anexando o token
 * Bearer guardado no cookie httpOnly do proprio Next.js. Nunca roda no
 * navegador do cliente — so em Server Components e Route Handlers.
 */
export async function phpApiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new PhpApiError(res.status, data?.erro ?? "Erro ao falar com a API.");
  }

  return data as T;
}

export function phpApiBaseUrl(): string {
  return BASE_URL as string;
}
