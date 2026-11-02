import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarGrupoComplemento, excluirGrupoComplemento, clonarGrupoComplemento, reordenarItensComplemento } from "@/db/queries/complementos";

function idsNumericos(v: unknown): number[] {
  return Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
}

/* Cria/edita um grupo de complementos, ou clona um existente ({ clonar_de }). */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  if (body.clonar_de) {
    return NextResponse.json(await clonarGrupoComplemento(sessao.lojaId, Number(body.clonar_de)));
  }

  const resultado = await salvarGrupoComplemento(sessao.lojaId, {
    id: Number(body.id) > 0 ? Number(body.id) : undefined,
    nome: typeof body.nome === "string" ? body.nome : "",
    ativo: body.ativo !== false,
    obrigatorio: body.obrigatorio === true,
    quantidadeMinima: Number(body.quantidade_minima ?? 0),
    quantidadeMaxima: Number(body.quantidade_maxima ?? 0),
    produtoIds: idsNumericos(body.produto_ids),
    categoriaIds: idsNumericos(body.categoria_ids),
  });
  return NextResponse.json(resultado);
}

/* Reordena os itens do grupo ({ id, item_ids }). */
export async function PATCH(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  return NextResponse.json(await reordenarItensComplemento(sessao.lojaId, Number(body?.id ?? 0), idsNumericos(body?.item_ids)));
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  return NextResponse.json(await excluirGrupoComplemento(sessao.lojaId, Number(body?.id ?? 0)));
}
