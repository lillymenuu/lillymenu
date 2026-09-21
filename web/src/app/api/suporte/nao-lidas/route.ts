import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

export async function GET() {
  try {
    const data = await phpApiFetch<{ ok: true; unread: number }>("/admin/api/v1/suporte_unread.php");
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const msg = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
