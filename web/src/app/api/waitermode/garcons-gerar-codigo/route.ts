import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { gerarCodigoGarcom } from "@/db/queries/modoGarcom";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);

  const resultado = await gerarCodigoGarcom(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, codigo_acesso: resultado.codigoAcesso });
}
