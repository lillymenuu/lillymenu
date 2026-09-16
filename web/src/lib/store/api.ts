import "server-only";

const BASE_URL = process.env.PHP_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("PHP_API_BASE_URL nao configurada.");
}

export class StoreApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Chama public/api/*.php (a loja publica nao exige sessao/Bearer — mesmo
 * cardapio que qualquer cliente acessa direto). Usada tanto no server
 * (app/store/[slug]/page.tsx) quanto atras dos proxies em app/api/store/*.
 * Nunca deve ser chamada do navegador do cliente diretamente.
 */
export async function storePhpFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    throw new StoreApiError(res.status, data?.msg ?? "Erro ao falar com a loja.");
  }

  return data as T;
}

/** Monta um corpo x-www-form-urlencoded — public/api/*.php le tudo via $_POST. */
export function storeFormBody(
  fields: Record<string, string | number | boolean | undefined | null>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    params.set(k, typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  }
  return params;
}
