import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, clientes, motoboys, pedidoPagamentos, pedidoItens, cashbackMovimentacoes, operacaoLogs, admins, configuracoes } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/pedidos_listar.php, pedidos_kanban.php,
 * pedidos_buscar.php, pedido_detalhe.php e pedidos_zerar_sequencia.php:
 * lado de LEITURA do Gestor de Pedidos (order-list/ordermanager).
 *
 * O lado de ESCRITA (pedidos_status.php, pedidos_cancelar.php,
 * pedidos_finalizar.php) fica de fora desta etapa por decisao deliberada:
 * os tres estao emaranhados com modulos ainda nao portados —
 * cashbackPromoverPendente/cashbackCancelarPendente (promocao/estorno de
 * cashback pendente), caixaAtribuirPedidoFinalizado, credito de pontos
 * pendentes, e principalmente o SaleFinancialIntegrationService (ledger
 * financeiro completo, fase "financeiro" da ordem combinada). Portar so a
 * troca de status sem essas cascatas criaria dados inconsistentes
 * (pedido finalizado sem entrada no financeiro, cashback nunca promovido
 * de pendente pra liberado). Entram juntos quando o financeiro for
 * construido.
 */

/** Base de numeracao zerada (helpers/pedido_codigo.php). */
export async function pedidoCodigoBase(lojaId: number): Promise<number> {
  const v = await getConfig(lojaId, "pedido_codigo_base", "0");
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function codigoDisplay(id: number, base: number): number {
  return base > 0 && id > base ? Math.max(1, id - base) : id;
}

export type PagamentoPedido = { forma: string; valor: number };

async function pagamentosPorPedido(pedidoIds: number[], lojaId: number): Promise<Map<number, PagamentoPedido[]>> {
  const mapa = new Map<number, PagamentoPedido[]>();
  if (pedidoIds.length === 0) return mapa;
  const linhas = await db
    .select({ pedidoId: pedidoPagamentos.pedido_id, forma: pedidoPagamentos.forma, valor: pedidoPagamentos.valor })
    .from(pedidoPagamentos)
    .where(and(inArray(pedidoPagamentos.pedido_id, pedidoIds), eq(pedidoPagamentos.loja_id, lojaId)))
    .orderBy(pedidoPagamentos.id);
  for (const l of linhas) {
    const lista = mapa.get(l.pedidoId) ?? [];
    lista.push({ forma: l.forma ?? "", valor: l.valor });
    mapa.set(l.pedidoId, lista);
  }
  return mapa;
}

export type PedidoResumo = {
  id: number;
  codigo: number;
  status: string;
  tipo: string;
  total: number | null;
  criadoEm: string | null;
  formaPagamento: string;
  enderecoEntrega: string | null;
  nome: string;
  telefone: string | null;
  agendamento: string | null;
  origem: string | null;
  observacoesCliente: string | null;
  motoboyId: number | null;
  motoboyNome: string | null;
  motoboyWhatsapp: string | null;
  statusEm: string | null;
  pagamentos: PagamentoPedido[];
};

// Correlacao com pedidos.id/loja_id via nome literal da tabela externa (nao
// interpolado como coluna) de proposito: interpolar ${pedidos.id} aqui rendia
// so "id" sem qualificar, e como pedido_status_log tambem tem sua propria
// coluna "id", o Postgres resolvia pro "id" ERRADO (o da propria subquery),
// zerando sempre o resultado.
const statusEmExpr = sql<string | null>`(select l.criado_em from pedido_status_log l where l.pedido_id = pedidos.id and l.loja_id = pedidos.loja_id order by l.criado_em desc limit 1)`;

export type ListarPedidosInput = {
  lojaId: number;
  status?: string;
  dataIni?: string;
  dataFim?: string;
  pagina?: number;
  limite?: number;
};

export type ListarPedidosResultado = { ok: true; pedidos: PedidoResumo[]; total: number; paginas: number; pagina: number; limite: number };

/** dd/mm/yyyy ou dd-mm-yyyy -> yyyy-mm-dd (mesma normalizacao de pedidos_listar.php). */
function normalizarDataSQL(d: string): string {
  const s = d.trim();
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

function hojeFortalezaISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

export async function listarPedidos(input: ListarPedidosInput): Promise<ListarPedidosResultado> {
  const { lojaId } = input;
  const hoje = hojeFortalezaISO();
  const dataIni = normalizarDataSQL(input.dataIni ?? hoje);
  const dataFim = normalizarDataSQL(input.dataFim ?? hoje);
  const pagina = Math.max(1, input.pagina ?? 1);
  const limite = ([10, 20, 50] as const).includes(input.limite as never) ? (input.limite as 10 | 20 | 50) : 10;
  const offset = (pagina - 1) * limite;

  const condicoes = [eq(pedidos.loja_id, lojaId)];
  if (input.status) condicoes.push(eq(pedidos.status, input.status as "pendente" | "aceito" | "preparando" | "entrega" | "finalizado" | "cancelado"));
  if (dataIni) condicoes.push(sql`${pedidos.criado_em}::date BETWEEN ${dataIni}::date AND ${dataFim || dataIni}::date`);
  const where = and(...condicoes);

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(pedidos).where(where);
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));

  const linhas = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      tipo: pedidos.tipo,
      total: pedidos.total,
      criadoEm: pedidos.criado_em,
      formaPagamento: pedidos.forma_pagamento,
      enderecoEntrega: pedidos.endereco_entrega,
      nome: sql<string>`coalesce(${clientes.nome}, '(cliente nao encontrado)')`,
      telefone: clientes.telefone,
      agendamento: sql<string | null>`${pedidos.agendamento}`,
      origem: pedidos.origem,
      observacoesCliente: pedidos.observacoes_cliente,
      motoboyId: pedidos.motoboy_id,
      motoboyNome: motoboys.nome,
      motoboyWhatsapp: motoboys.whatsapp,
      statusEm: statusEmExpr,
    })
    .from(pedidos)
    .leftJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .leftJoin(motoboys, and(eq(motoboys.id, pedidos.motoboy_id), eq(motoboys.loja_id, pedidos.loja_id)))
    .where(where)
    .orderBy(desc(pedidos.criado_em))
    .limit(limite)
    .offset(offset);

  const pagamentos = await pagamentosPorPedido(linhas.map((l) => l.id), lojaId);
  const base = await pedidoCodigoBase(lojaId);

  return {
    ok: true,
    pedidos: linhas.map((l) => ({ ...l, codigo: codigoDisplay(l.id, base), pagamentos: pagamentos.get(l.id) ?? [] })),
    total: totalNum,
    paginas,
    pagina,
    limite,
  };
}

export async function kanbanPedidos(lojaId: number): Promise<{ ok: true; pedidos: PedidoResumo[] }> {
  const linhas = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      tipo: pedidos.tipo,
      total: pedidos.total,
      criadoEm: pedidos.criado_em,
      formaPagamento: pedidos.forma_pagamento,
      enderecoEntrega: pedidos.endereco_entrega,
      nome: clientes.nome,
      telefone: clientes.telefone,
      agendamento: sql<string | null>`${pedidos.agendamento}`,
      origem: pedidos.origem,
      observacoesCliente: pedidos.observacoes_cliente,
      motoboyId: pedidos.motoboy_id,
      motoboyNome: motoboys.nome,
      motoboyWhatsapp: motoboys.whatsapp,
      statusEm: statusEmExpr,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .leftJoin(motoboys, and(eq(motoboys.id, pedidos.motoboy_id), eq(motoboys.loja_id, pedidos.loja_id)))
    .where(eq(pedidos.loja_id, lojaId))
    .orderBy(desc(pedidos.id));

  const pagamentos = await pagamentosPorPedido(linhas.map((l) => l.id), lojaId);
  const base = await pedidoCodigoBase(lojaId);

  return {
    ok: true,
    pedidos: linhas.map((l) => ({ ...l, nome: l.nome ?? "", codigo: codigoDisplay(l.id, base), pagamentos: pagamentos.get(l.id) ?? [] })),
  };
}

export async function buscarPedidos(lojaId: number, termoBruto: string): Promise<{ ok: true; pedidos: PedidoResumo[] }> {
  const termo = termoBruto.trim();
  if (!termo) return { ok: true, pedidos: [] };

  const base = await pedidoCodigoBase(lojaId);
  const telefoneDigitos = termo.replace(/\D/g, "");
  const condicoesOr = [sql`${clientes.nome} ilike ${"%" + termo + "%"}`];
  if (telefoneDigitos) {
    condicoesOr.push(sql`regexp_replace(${clientes.telefone}, '[()\\- +]', '', 'g') like ${"%" + telefoneDigitos + "%"}`);
  }
  if (/^\d+$/.test(termo)) {
    const idsCandidatos = [Number(termo)];
    if (base > 0) idsCandidatos.push(Number(termo) + base);
    condicoesOr.push(inArray(pedidos.id, idsCandidatos));
  }

  const linhas = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      tipo: pedidos.tipo,
      total: pedidos.total,
      criadoEm: pedidos.criado_em,
      formaPagamento: pedidos.forma_pagamento,
      enderecoEntrega: sql<string | null>`null`,
      nome: clientes.nome,
      telefone: clientes.telefone,
      agendamento: sql<string | null>`null`,
      origem: pedidos.origem,
      observacoesCliente: sql<string | null>`null`,
      motoboyId: sql<number | null>`null`,
      motoboyNome: sql<string | null>`null`,
      motoboyWhatsapp: sql<string | null>`null`,
      statusEm: sql<string | null>`null`,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), sql.join(condicoesOr, sql` or `)))
    .orderBy(desc(pedidos.id))
    .limit(30);

  const pagamentos = await pagamentosPorPedido(linhas.map((l) => l.id), lojaId);

  return {
    ok: true,
    pedidos: linhas.map((l) => ({ ...l, nome: l.nome ?? "", codigo: codigoDisplay(l.id, base), pagamentos: pagamentos.get(l.id) ?? [] })),
  };
}

export type ItemPedido = { produtoId: number | null; produtoNome: string | null; quantidade: number | null; preco: number | null; observacoes: string | null };
export type PagamentoDetalhado = { forma: string; valor: number; taxaMaquininha: number };

export type ClienteStats = {
  pedidosFeitos: number;
  ticketMedio: number;
  cashbackTotal: number;
  cashbackSaldo: number;
  cashbackExpiraEm: string | null;
  cashbackExpirado: boolean;
  pontos: number;
};

export type DetalhePedidoResultado =
  | { ok: false; msg: string }
  | { ok: true; pedido: Record<string, unknown> & { codigo: number; editadoPor: string | null }; clienteStats: ClienteStats; itens: ItemPedido[]; pagamentos: PagamentoDetalhado[] };

export async function detalhePedido(lojaId: number, pedidoId: number): Promise<DetalhePedidoResultado> {
  const linhas = await db
    .select({
      pedido: pedidos,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      motoboyId: motoboys.id,
      motoboyNome: motoboys.nome,
      motoboyWhatsapp: motoboys.whatsapp,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .leftJoin(motoboys, and(eq(motoboys.id, pedidos.motoboy_id), eq(motoboys.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)))
    .limit(1);

  const linha = linhas[0];
  if (!linha) return { ok: false, msg: "Pedido nao encontrado." };

  const stats: ClienteStats = { pedidosFeitos: 0, ticketMedio: 0, cashbackTotal: 0, cashbackSaldo: 0, cashbackExpiraEm: null, cashbackExpirado: false, pontos: 0 };
  const clienteId = linha.pedido.cliente_id;

  if (clienteId) {
    const [statsRow] = await db
      .select({
        pedidosFeitos: sql<string>`count(*)`,
        ticketMedio: sql<string>`coalesce(avg(${pedidos.total}),0)`,
        cashbackTotal: sql<string>`coalesce(sum(${pedidos.cashback_valor}),0)`,
      })
      .from(pedidos)
      .where(and(eq(pedidos.cliente_id, clienteId), eq(pedidos.loja_id, lojaId), sql`(${pedidos.status} is null or ${pedidos.status} <> 'cancelado')`));
    stats.pedidosFeitos = Number(statsRow?.pedidosFeitos ?? 0);
    stats.ticketMedio = Number(statsRow?.ticketMedio ?? 0);
    stats.cashbackTotal = Number(statsRow?.cashbackTotal ?? 0);

    const [clienteLinha] = await db.select({ cashbackSaldo: clientes.cashback_saldo, pontos: clientes.pontos_saldo }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
    stats.cashbackSaldo = clienteLinha?.cashbackSaldo ?? 0;
    stats.pontos = clienteLinha?.pontos ?? 0;

    if (stats.cashbackSaldo > 0) {
      const expira = await db.execute<{ expira_em: string | null }>(sql`
        select expira_em from (
          select m.expira_em, (m.valor - coalesce(sum(u.valor),0)) as restante
          from cashback_movimentacoes m
          left join cashback_movimentacoes u on u.referencia_id = m.id and u.tipo in ('uso','expirado') and u.loja_id = m.loja_id
          where m.cliente_id = ${clienteId} and m.loja_id = ${lojaId} and m.tipo = 'entrada'
            and (m.expira_em is null or m.expira_em >= current_date)
          group by m.id, m.expira_em, m.valor
          having (m.valor - coalesce(sum(u.valor),0)) > 0 and m.expira_em is not null
        ) t
        order by expira_em asc
        limit 1
      `);
      stats.cashbackExpiraEm = expira.rows[0]?.expira_em ?? null;
    } else {
      const [ultima] = await db
        .select({ tipo: cashbackMovimentacoes.tipo })
        .from(cashbackMovimentacoes)
        .where(and(eq(cashbackMovimentacoes.cliente_id, clienteId), eq(cashbackMovimentacoes.loja_id, lojaId)))
        .orderBy(desc(cashbackMovimentacoes.criado_em), desc(cashbackMovimentacoes.id))
        .limit(1);
      stats.cashbackExpirado = ultima?.tipo === "expirado";
    }
  }

  const itensLinhas = await db
    .select({ produtoId: pedidoItens.produto_id, produtoNome: pedidoItens.produto_nome, quantidade: pedidoItens.quantidade, preco: pedidoItens.preco, observacoes: pedidoItens.observacoes })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.pedido_id, pedidoId), eq(pedidoItens.loja_id, lojaId)));

  const pagamentosLinhas = await db
    .select({ forma: pedidoPagamentos.forma, valor: pedidoPagamentos.valor, taxaMaquininha: pedidoPagamentos.taxa_maquininha })
    .from(pedidoPagamentos)
    .where(and(eq(pedidoPagamentos.pedido_id, pedidoId), eq(pedidoPagamentos.loja_id, lojaId)));

  const base = await pedidoCodigoBase(lojaId);

  const [editoLinha] = await db
    .select({ nome: admins.nome })
    .from(operacaoLogs)
    .leftJoin(admins, eq(admins.id, operacaoLogs.operador_id))
    .where(and(eq(operacaoLogs.acao, "pedido_editado"), eq(operacaoLogs.referencia, `pedido:${pedidoId}`)))
    .orderBy(desc(operacaoLogs.criado_em), desc(operacaoLogs.id))
    .limit(1);

  return {
    ok: true,
    pedido: { ...linha.pedido, nome: linha.clienteNome, telefone: linha.clienteTelefone, motoboy_id: linha.motoboyId, motoboy_nome: linha.motoboyNome, motoboy_whatsapp: linha.motoboyWhatsapp, codigo: codigoDisplay(linha.pedido.id, base), editadoPor: editoLinha?.nome ?? null },
    clienteStats: stats,
    itens: itensLinhas,
    pagamentos: pagamentosLinhas,
  };
}

export async function zerarSequenciaPedidos(lojaId: number): Promise<{ ok: true; msg: string; base: number; proximo: number }> {
  await db.execute(sql`update ${pedidos} set codigo = ${pedidos.id}::text where loja_id = ${lojaId} and (codigo is null or codigo = '')`);

  const [{ maxId }] = await db.select({ maxId: sql<string>`coalesce(max(${pedidos.id}),0)` }).from(pedidos).where(eq(pedidos.loja_id, lojaId));
  const base = Number(maxId);

  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave: "pedido_codigo_base", valor: String(base) })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: String(base) } });

  return { ok: true, msg: "Sequencia zerada! O proximo pedido sera o #1.", base, proximo: 1 };
}
