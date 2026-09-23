import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { lojaEventos } from "@/db/schema";
import { adicionarDiasFortaleza } from "@/db/queries/tempo";

/* Equivalente de admin/api/v1/funil_conversao.php: funil de visitas -> views -> carrinho -> pedido, por visitante unico. */

export type FunilConversaoResultado = {
  dias: number;
  visitas: number;
  views: number;
  carrinhos: number;
  pedidos: number;
  conversao: number;
  pctViews: number;
  pctCarrinhos: number;
  pctPedidos: number;
};

export async function funilConversao(lojaId: number, diasInput: number): Promise<FunilConversaoResultado> {
  const dias = Math.max(1, Math.min(90, diasInput));
  const desde = `${adicionarDiasFortaleza(-dias)} 00:00:00`;

  const linhas = await db
    .select({ tipo: lojaEventos.tipo, cnt: sql<string>`count(distinct ${lojaEventos.visitante})` })
    .from(lojaEventos)
    .where(and(eq(lojaEventos.loja_id, lojaId), gte(lojaEventos.criado_em, desde), isNotNull(lojaEventos.visitante)))
    .groupBy(lojaEventos.tipo);

  const mapa = new Map(linhas.map((l) => [l.tipo, Number(l.cnt)]));

  // Funil: cada etapa nunca passa da anterior.
  const visitas = mapa.get("visita") ?? 0;
  const views = Math.min(visitas, mapa.get("view_item") ?? 0);
  const carrinhos = Math.min(views, mapa.get("carrinho") ?? 0);
  const pedidosCount = Math.min(carrinhos, mapa.get("pedido") ?? 0);

  const pct = (v: number) => (visitas > 0 ? Math.round((v / visitas) * 100) : 0);

  return {
    dias,
    visitas,
    views,
    carrinhos,
    pedidos: pedidosCount,
    conversao: pct(pedidosCount),
    pctViews: pct(views),
    pctCarrinhos: pct(carrinhos),
    pctPedidos: pct(pedidosCount),
  };
}
