import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { movimentarCaixa } from "@/db/queries/caixa";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const autorizadoPorId = Number(body?.autorizado_por_id ?? 0);
  const resultado = await movimentarCaixa({
    lojaId: sessao.lojaId,
    adminId: sessao.id,
    tipo: body?.tipo,
    valor: Number(body?.valor ?? 0),
    observacoes: typeof body?.observacoes === "string" ? body.observacoes : undefined,
    motivo: typeof body?.motivo === "string" ? body.motivo : undefined,
    autorizadoPorId: autorizadoPorId > 0 ? autorizadoPorId : undefined,
    autorizadoPorSenha: typeof body?.autorizado_por_senha === "string" ? body.autorizado_por_senha : undefined,
  });

  return NextResponse.json(resultado);
}
