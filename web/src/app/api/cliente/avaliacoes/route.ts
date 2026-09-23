import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { avaliacoesCliente } from "@/db/queries/avaliacoes";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const id = Number(params.get("id") ?? 0);
  const pagina = Number(params.get("pagina") ?? "1");

  const resultado = await avaliacoesCliente(sessao.lojaId, id, pagina);
  if (!resultado.ok) return NextResponse.json(resultado);

  return NextResponse.json({
    ok: true,
    total: resultado.total,
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    avaliacoes: resultado.avaliacoes.map((a) => ({ id: a.id, nota: a.nota, descricao: a.descricao, pedido_id: a.pedidoId, criado_em: a.criadoEm })),
  });
}
