import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getPedidosAgendados } from "@/lib/pedidos";
import { temRecursoPlano } from "@/db/queries/assinatura";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.pedidos_agendados");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const ano = Number(params.get("ano"));
  const mes = Number(params.get("mes"));
  if (!ano || !mes || mes < 1 || mes > 12) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos." }, { status: 400 });
  }

  const resultado = await getPedidosAgendados(sessao.lojaId, ano, mes);
  return NextResponse.json(resultado);
}
