import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarCupons } from "@/db/queries/cuponsAdmin";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const lojaLinkBase = `${proto}://${host}/`;

  const resultado = await listarCupons(sessao.lojaId, lojaLinkBase);
  return NextResponse.json({
    ok: true,
    cupons: resultado.cupons.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      tipo: c.tipo,
      desconto: c.desconto,
      minimo: c.minimo,
      quantidade_total: c.quantidadeTotal,
      quantidade_usada: c.quantidadeUsada,
      ativo: c.ativo,
      primeira_compra: c.primeiraCompra,
      publico: c.publico,
      criado_em: c.criadoEm,
    })),
    loja_link_base: resultado.lojaLinkBase,
    link_slug: resultado.linkSlug,
  });
}
