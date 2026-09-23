import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { pedidosCliente } from "@/db/queries/clienteAbas";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const id = Number(params.get("id") ?? 0);
  const periodo = Number(params.get("periodo") ?? "30");
  const tipo = params.get("tipo") ?? "todos";
  const pagina = Number(params.get("pagina") ?? "1");

  const resultado = await pedidosCliente(sessao.lojaId, id, periodo, tipo, pagina);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    total: resultado.total,
    pedidos: resultado.pedidos.map((p) => ({ id: p.id, total: p.total, tipo: p.tipo, criado_em: p.criadoEm, resumo: p.resumo })),
  });
}
