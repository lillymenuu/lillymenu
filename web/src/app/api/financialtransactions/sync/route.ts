import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { sincronizarPedidosFinanceiro } from "@/db/queries/financeiroRelatorios";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const modo = body?.modo === "todos" ? "todos" : "mes";
  const mes = body?.mes ? Number(body.mes) : undefined;
  const ano = body?.ano ? Number(body.ano) : undefined;

  try {
    const resultado = await sincronizarPedidosFinanceiro(sessao.lojaId, modo, mes, ano);
    return NextResponse.json(resultado);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao sincronizar pedidos.";
    return NextResponse.json({ ok: false, msg: `Erro: ${msg}` });
  }
}
