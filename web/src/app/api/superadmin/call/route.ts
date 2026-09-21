import { NextRequest, NextResponse } from "next/server";
import { PhpApiError } from "@/lib/phpApi";
import { superApiFetch } from "@/lib/superApi";

/*
 * Proxy unico do painel do superadmin para admin/api/v1/superadmin_*.php.
 * So repassa para a lista abaixo; o PHP valida o token e o perfil superadmin.
 */
const ALVOS = new Set([
  "superadmin_lojas",
  "superadmin_loja_salvar",
  "superadmin_loja_acao",
  "superadmin_config_salvar",
  "superadmin_suporte",
  "superadmin_me",
]);

async function repassar(request: NextRequest, metodo: "GET" | "POST") {
  const alvo = request.nextUrl.searchParams.get("alvo") ?? "";
  if (!ALVOS.has(alvo)) {
    return NextResponse.json({ ok: false, msg: "Não encontrado." }, { status: 404 });
  }

  const repasse = new URLSearchParams(request.nextUrl.searchParams);
  repasse.delete("alvo");
  const qs = repasse.toString();
  const path = `/admin/api/v1/${alvo}.php${qs ? `?${qs}` : ""}`;

  try {
    const data = await superApiFetch(
      path,
      metodo === "POST"
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text() }
        : {}
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const msg = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}

export const GET = (request: NextRequest) => repassar(request, "GET");
export const POST = (request: NextRequest) => repassar(request, "POST");
