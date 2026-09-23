import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarGarcom } from "@/db/queries/modoGarcom";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const nome = typeof body?.nome === "string" ? body.nome : "";
  const email = typeof body?.email === "string" ? body.email : "";

  const resultado = await salvarGarcom(sessao.lojaId, id, nome, email);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({ ok: true, id: resultado.id, codigo_acesso: resultado.codigoAcesso ?? null });
}
