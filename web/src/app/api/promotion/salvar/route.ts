import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarPromocao } from "@/db/queries/promocoes";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultado = await salvarPromocao(sessao.lojaId, sessao.id, {
    produtoId: Number(body?.produto_id ?? 0),
    ativar: Boolean(Number(body?.ativar ?? 0)),
    precoPromocional: body?.preco_promocional,
    promoDias: body?.promo_dias,
    promoDescricao: typeof body?.promo_descricao === "string" ? body.promo_descricao : undefined,
    promoImagemBase64: typeof body?.promo_imagem_base64 === "string" ? body.promo_imagem_base64 : undefined,
    promoImagemRemover: Boolean(Number(body?.promo_imagem_remover ?? 0)),
    promoEtiqueta: typeof body?.promo_etiqueta === "string" ? body.promo_etiqueta : undefined,
  });

  return NextResponse.json(resultado);
}
