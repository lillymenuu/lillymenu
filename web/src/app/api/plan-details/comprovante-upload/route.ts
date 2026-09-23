import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { uploadComprovante } from "@/db/queries/pagamentoPix";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await uploadComprovante(sessao.lojaId, String(body.comprovante_base64 ?? ""), String(body.comprovante_ext ?? ""));
  return NextResponse.json(resultado);
}
