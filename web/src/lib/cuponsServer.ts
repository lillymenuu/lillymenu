import "server-only";
import { headers } from "next/headers";
import { listarCupons } from "@/db/queries/cuponsAdmin";
import type { CuponsListarResposta } from "@/lib/cupons";

export async function getCupons(lojaId: number): Promise<CuponsListarResposta> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  const lojaLinkBase = `${proto}://${host}/`;

  const resultado = await listarCupons(lojaId, lojaLinkBase);
  return {
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
  };
}
