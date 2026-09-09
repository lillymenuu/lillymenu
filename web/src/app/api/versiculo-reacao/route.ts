import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    const data = await phpApiFetch("/admin/api/v1/versiculo_reacao.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const erro = e instanceof PhpApiError ? e.message : "Erro ao salvar reacao.";
    return NextResponse.json({ ok: false, erro }, { status });
  }
}
