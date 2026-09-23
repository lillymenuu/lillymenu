import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarCombo } from "@/db/queries/combosAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const categoriaIdRaw = body.categoria_id;
  const precoPromoRaw = body.preco_promocional;

  const resultado = await salvarCombo(sessao.lojaId, {
    id: Number(body.id ?? 0) > 0 ? Number(body.id) : undefined,
    nome: typeof body.nome === "string" ? body.nome : "",
    descricao: typeof body.descricao === "string" ? body.descricao : undefined,
    categoriaId: categoriaIdRaw !== null && categoriaIdRaw !== undefined && categoriaIdRaw !== "" ? Number(categoriaIdRaw) : null,
    tipoPreco: body.tipo_preco === "por_item" ? "por_item" : "por_combo",
    preco: Number(body.preco ?? 0),
    precoPromocional: precoPromoRaw !== "" && precoPromoRaw !== null && precoPromoRaw !== undefined ? Number(precoPromoRaw) : null,
    promoDesativado: Boolean(Number(body.promo_desativado ?? 0)),
    imagemBase64: typeof body.imagem_base64 === "string" ? body.imagem_base64 : undefined,
    imagemRemover: body.imagem_remover === "1" || body.imagem_remover === true,
    ativo: Boolean(Number(body.ativo ?? 1)),
  });

  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, combo_id: resultado.comboId });
}
