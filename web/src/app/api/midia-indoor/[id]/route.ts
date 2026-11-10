import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { removerTv, salvarTv } from "@/db/queries/midiaIndoor";
import { ehLayoutTv, normalizarConfigTv } from "@/lib/midiaIndoor";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  return NextResponse.json(
    await salvarTv(sessao.lojaId, Number(id), {
      nome: String(body.nome ?? ""),
      layout: ehLayoutTv(body.layout) ? body.layout : "vitrine",
      config: normalizarConfigTv(body.config),
    })
  );
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  await removerTv(sessao.lojaId, Number(id));
  return NextResponse.json({ ok: true });
}
