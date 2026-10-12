import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { atualizarStatusNotaFiscal, getNotaFiscalPorPedido } from "@/db/queries/nfce";

/* Atualizacao manual de status (reconsulta GET /resumo no PlugNotas) — usado enquanto o webhook ainda nao esta registrado (exige URL publica). */
export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const pedidoId = Number(body?.pedidoId);
  if (!pedidoId) return NextResponse.json({ ok: false, msg: "pedidoId inválido." }, { status: 400 });

  await atualizarStatusNotaFiscal(pedidoId);
  const nota = await getNotaFiscalPorPedido(pedidoId);
  return NextResponse.json({ ok: true, nota });
}
