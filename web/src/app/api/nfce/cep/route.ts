import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { pnConsultarCep } from "@/db/queries/plugnotas";

/* Util pro formulario de endereco da loja preencher o codigo IBGE (exigido pro cadastro fiscal da NFCe). */
export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const cep = request.nextUrl.searchParams.get("cep") ?? "";
  if (cep.replace(/\D/g, "").length !== 8) return NextResponse.json({ ok: false, msg: "CEP inválido." }, { status: 400 });

  const resultado = await pnConsultarCep(cep, false);
  if (!resultado.ok) return NextResponse.json({ ok: false, msg: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true, endereco: resultado.dados });
}
