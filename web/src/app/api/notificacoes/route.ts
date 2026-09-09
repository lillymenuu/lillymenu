import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

export async function GET() {
  try {
    const data = await phpApiFetch("/admin/api/v1/notificacoes_pedidos.php");
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    return NextResponse.json({ ok: false, pedidos: [] }, { status });
  }
}
