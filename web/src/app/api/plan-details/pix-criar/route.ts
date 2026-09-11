import { NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

export async function POST() {
  try {
    const data = await phpApiFetch("/admin/api/v1/pagamento_pix_criar.php", { method: "POST" });
    return NextResponse.json(data);
  } catch (e) {
    return erroResposta(e);
  }
}
