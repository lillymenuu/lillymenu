import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/authCookie";
import { phpApiBaseUrl } from "@/lib/phpApi";

/*
 * Unico endpoint binario do Next hoje — os demais proxies usam
 * phpApiFetch/phpApiFetchPassthrough (JSON). Aqui o PDF gerado pelo PHP
 * (admin/api/v1/orcamentos_pdf.php) precisa chegar intacto ao navegador
 * (aberto via <a target="_blank">), entao repassamos o Response puro em
 * vez de fazer JSON.parse.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const tipo = searchParams.get("tipo") ?? "orcamento";

  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;

  const res = await fetch(
    `${phpApiBaseUrl()}/admin/api/v1/orcamentos_pdf.php?id=${encodeURIComponent(id)}&tipo=${encodeURIComponent(tipo)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    }
  );

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
    },
  });
}
