import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { pontosCliente } from "@/db/queries/clienteAbas";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const id = Number(params.get("id") ?? 0);
  const pagina = Number(params.get("pagina") ?? "1");

  const resultado = await pontosCliente(sessao.lojaId, id, pagina);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    total: resultado.total,
    pontos: resultado.pontos.map((p) => ({ id: p.id, pedido_id: p.pedidoId, tipo: p.tipo, pontos: p.pontos, saldo_antes: p.saldoAntes, saldo_depois: p.saldoDepois, criado_em: p.criadoEm })),
  });
}
