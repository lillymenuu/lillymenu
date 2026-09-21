import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erro(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const msg = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg }, { status });
}

export async function GET() {
  try {
    return NextResponse.json(await phpApiFetch("/admin/api/v1/suporte_digitando.php"));
  } catch (e) {
    return erro(e);
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const data = await phpApiFetch("/admin/api/v1/suporte_digitando.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    return erro(e);
  }
}
