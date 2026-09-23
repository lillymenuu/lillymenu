import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarClientesFiado } from "@/db/queries/fiado";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const busca = params.get("busca") ?? "";
  const pagina = Number(params.get("pagina") ?? "1");
  const limite = Number(params.get("limite") ?? "10");

  const resultado = await listarClientesFiado(sessao.lojaId, busca, pagina, limite);
  return NextResponse.json({
    ok: true,
    total_debitos: resultado.totalDebitos,
    total_clientes: resultado.totalClientes,
    clientes: resultado.clientes.map((c) => ({ id: c.id, nome: c.nome ?? "", telefone: c.telefone ?? "", saldo_fiado: c.saldoFiado })),
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    total: resultado.total,
  });
}
