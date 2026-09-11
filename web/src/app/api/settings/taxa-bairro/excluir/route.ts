import { NextResponse } from "next/server";
import { phpApiFetchPassthrough, PhpApiError } from "@/lib/phpApi";

export async function POST(request: Request) {
  const body = await request.text();
  try {
    const data = await phpApiFetchPassthrough("/admin/api/v1/taxa_bairro_excluir.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof PhpApiError ? e.status : 500;
    const msg = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
    return NextResponse.json({ ok: false, msg }, { status });
  }
}
