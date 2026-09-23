import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarMotoboy } from "@/db/queries/motoboys";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await salvarMotoboy(sessao.lojaId, {
    id: Number(body?.id ?? 0) > 0 ? Number(body.id) : undefined,
    nome: typeof body?.nome === "string" ? body.nome : "",
    whatsapp: typeof body?.whatsapp === "string" ? body.whatsapp : "",
    dataCadastro: typeof body?.data_cadastro === "string" ? body.data_cadastro : undefined,
    ativo: body?.ativo === undefined ? undefined : Boolean(Number(body.ativo)),
  });

  return NextResponse.json(resultado);
}
