import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { atualizarPerda, dashboardDesperdicio, excluirPerda, salvarLotePerda } from "@/db/queries/desperdicios";

/* Controle de desperdicio: dashboard do mes (GET), novo lancamento em lote (POST), edicao de um
   item (PUT) e exclusao (DELETE). Nada aqui mexe no estoque. */

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const mes = Number(request.nextUrl.searchParams.get("mes") ?? 0) || undefined;
  const ano = Number(request.nextUrl.searchParams.get("ano") ?? 0) || undefined;
  try {
    return NextResponse.json(await dashboardDesperdicio(sessao.lojaId, mes, ano));
  } catch {
    return NextResponse.json({ ok: false, msg: "Erro ao carregar o controle de desperdício." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." });
  return NextResponse.json(await salvarLotePerda(sessao.lojaId, sessao.id, body));
}

export async function PUT(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." });
  return NextResponse.json(await atualizarPerda(sessao.lojaId, Number(body.id) || 0, body));
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  return NextResponse.json(await excluirPerda(sessao.lojaId, Number(body?.id) || 0));
}
