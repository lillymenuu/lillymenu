import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { emitirNfceDoPedido, getNotaFiscalPorPedido } from "@/db/queries/nfce";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const pedidoId = Number(request.nextUrl.searchParams.get("pedidoId"));
  if (!pedidoId) return NextResponse.json({ ok: false, msg: "pedidoId inválido." }, { status: 400 });

  const nota = await getNotaFiscalPorPedido(pedidoId);
  return NextResponse.json({ ok: true, nota });
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const pedidoId = Number(body?.pedidoId);
  if (!pedidoId) return NextResponse.json({ ok: false, msg: "pedidoId inválido." }, { status: 400 });

  const resultado = await emitirNfceDoPedido(sessao.lojaId, pedidoId);
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, msg: resultado.erro, produtosSemFiscal: resultado.produtosSemFiscal }, { status: 400 });
  }
  return NextResponse.json({ ok: true, nota: resultado.nota });
}
