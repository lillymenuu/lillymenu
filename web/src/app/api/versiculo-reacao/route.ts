import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarReacaoVersiculo } from "@/db/queries/versiculoReacao";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, erro: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await salvarReacaoVersiculo(
    sessao.id,
    typeof body?.reacao === "string" ? body.reacao : "",
    typeof body?.data === "string" ? body.data : "",
    typeof body?.referencia === "string" ? body.referencia : "",
    typeof body?.texto === "string" ? body.texto : ""
  );

  if (!resultado.ok) return NextResponse.json({ ok: false, erro: resultado.msg });
  return NextResponse.json(resultado);
}
