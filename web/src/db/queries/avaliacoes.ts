import "server-only";
import { and, eq, ilike, or, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { avaliacoes, clientes, pedidos } from "@/db/schema";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";

/*
 * Equivalente de admin/api/v1/avaliacoes.php (tela Avaliacoes) e
 * cliente_avaliacoes.php (aba "Avaliacoes" do modal de cliente).
 */

export type EstatisticasAvaliacoes = { total: number; media: number; distribuicao: Record<1 | 2 | 3 | 4 | 5, number> };

export type AvaliacaoListagem = {
  id: number;
  nota: number;
  descricao: string;
  criadoEm: string;
  pedidoId: number;
  codigoPedido: number;
  pedidoTotal: number | null;
  pedidoData: string | null;
  clienteNome: string | null;
  clienteTel: string | null;
};

export type ListarAvaliacoesResultado = EstatisticasAvaliacoes & { totalFiltrado: number; pagina: number; paginas: number; avaliacoes: AvaliacaoListagem[] };

export async function listarAvaliacoes(lojaId: number, filtroNota: number | null, filtroBusca: string, paginaInput: number): Promise<ListarAvaliacoesResultado> {
  const [stats] = await db
    .select({
      total: sql<string>`count(*)`,
      media: sql<string>`round(avg(${avaliacoes.nota}), 1)`,
      n5: sql<string>`sum((${avaliacoes.nota} = 5)::int)`,
      n4: sql<string>`sum((${avaliacoes.nota} = 4)::int)`,
      n3: sql<string>`sum((${avaliacoes.nota} = 3)::int)`,
      n2: sql<string>`sum((${avaliacoes.nota} = 2)::int)`,
      n1: sql<string>`sum((${avaliacoes.nota} = 1)::int)`,
    })
    .from(avaliacoes)
    .where(eq(avaliacoes.loja_id, lojaId));

  const total = Number(stats?.total ?? 0);
  const media = Number(stats?.media ?? 0);
  const distribuicao = { 5: Number(stats?.n5 ?? 0), 4: Number(stats?.n4 ?? 0), 3: Number(stats?.n3 ?? 0), 2: Number(stats?.n2 ?? 0), 1: Number(stats?.n1 ?? 0) };

  let condicao = eq(avaliacoes.loja_id, lojaId);
  if (filtroNota !== null) condicao = and(condicao, eq(avaliacoes.nota, filtroNota))!;
  if (filtroBusca !== "") condicao = and(condicao, or(ilike(clientes.nome, `%${filtroBusca}%`), ilike(avaliacoes.descricao, `%${filtroBusca}%`)))!;

  const limite = 6;
  const [{ totalFiltrado }] = await db
    .select({ totalFiltrado: sql<string>`count(*)` })
    .from(avaliacoes)
    .leftJoin(clientes, and(eq(clientes.id, avaliacoes.cliente_id), eq(clientes.loja_id, avaliacoes.loja_id)))
    .leftJoin(pedidos, and(eq(pedidos.id, avaliacoes.pedido_id), eq(pedidos.loja_id, avaliacoes.loja_id)))
    .where(condicao);
  const totalFiltradoNum = Number(totalFiltrado);
  const paginas = Math.max(1, Math.ceil(totalFiltradoNum / limite));
  const pagina = Math.min(Math.max(1, paginaInput), paginas);
  const offset = (pagina - 1) * limite;

  const linhas = await db
    .select({
      id: avaliacoes.id,
      nota: avaliacoes.nota,
      descricao: avaliacoes.descricao,
      criadoEm: avaliacoes.criado_em,
      pedidoId: avaliacoes.pedido_id,
      pedidoTotal: pedidos.total,
      pedidoData: pedidos.criado_em,
      clienteNome: clientes.nome,
      clienteTel: clientes.telefone,
    })
    .from(avaliacoes)
    .leftJoin(pedidos, and(eq(pedidos.id, avaliacoes.pedido_id), eq(pedidos.loja_id, avaliacoes.loja_id)))
    .leftJoin(clientes, and(eq(clientes.id, avaliacoes.cliente_id), eq(clientes.loja_id, avaliacoes.loja_id)))
    .where(condicao)
    .orderBy(desc(avaliacoes.criado_em))
    .limit(limite)
    .offset(offset);

  const base = await pedidoCodigoBase(lojaId);
  const lista: AvaliacaoListagem[] = linhas.map((l) => ({
    id: l.id,
    nota: l.nota,
    descricao: l.descricao ?? "",
    criadoEm: l.criadoEm,
    pedidoId: l.pedidoId,
    codigoPedido: codigoDisplay(l.pedidoId, base),
    pedidoTotal: l.pedidoTotal !== null ? Number(l.pedidoTotal) : null,
    pedidoData: l.pedidoData,
    clienteNome: l.clienteNome,
    clienteTel: l.clienteTel,
  }));

  return { total, media, distribuicao, totalFiltrado: totalFiltradoNum, pagina, paginas, avaliacoes: lista };
}

export type AvaliacaoCliente = { id: number; nota: number; descricao: string; pedidoId: number | null; criadoEm: string };
export type AvaliacoesClienteResultado = { total: number; pagina: number; paginas: number; avaliacoes: AvaliacaoCliente[] };

export async function avaliacoesCliente(lojaId: number, clienteId: number, paginaInput: number): Promise<{ ok: true } & AvaliacoesClienteResultado | { ok: false; msg: string }> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };

  const limite = 5;
  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(avaliacoes).where(and(eq(avaliacoes.cliente_id, clienteId), eq(avaliacoes.loja_id, lojaId)));
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));
  const pagina = Math.min(Math.max(1, paginaInput), paginas);
  const offset = (pagina - 1) * limite;

  const linhas = await db
    .select({ id: avaliacoes.id, nota: avaliacoes.nota, descricao: avaliacoes.descricao, criadoEm: avaliacoes.criado_em, pedidoId: avaliacoes.pedido_id })
    .from(avaliacoes)
    .where(and(eq(avaliacoes.cliente_id, clienteId), eq(avaliacoes.loja_id, lojaId)))
    .orderBy(desc(avaliacoes.criado_em))
    .limit(limite)
    .offset(offset);

  return { ok: true, total: totalNum, pagina, paginas, avaliacoes: linhas.map((l) => ({ ...l, descricao: l.descricao ?? "" })) };
}
