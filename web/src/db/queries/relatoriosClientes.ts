import "server-only";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pedidos, clientes } from "@/db/schema";

/* Equivalente de admin/api/v1/relatorios_clientes.php (/clientreports). */

const DIAS_VALIDOS = ["7", "15", "30", "60", "90", "365"] as const;

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { inicio: string; fim: string } {
  if (dataIni && dataFim) return { inicio: `${dataIni} 00:00:00`, fim: `${dataFim} 23:59:59` };
  const dias = (DIAS_VALIDOS as readonly string[]).includes(periodo) ? Number(periodo) : 30;
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  const [y, m, d] = hojeISO.split("-").map(Number);
  const inicioDt = new Date(Date.UTC(y, m - 1, d) - dias * 86_400_000);
  const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
  return { inicio: `${inicio} 00:00:00`, fim: `${hojeISO} 23:59:59` };
}

const expUltimoPedido = sql<string>`max(${pedidos.criado_em})`;
const expTotalTaxa = sql<string>`coalesce(sum(coalesce(${pedidos.taxa_entrega},0)),0)`;
const expTicketMedio = sql<string>`coalesce(avg(coalesce(${pedidos.subtotal}, ${pedidos.total})),0)`;
const expTotalGasto = sql<string>`coalesce(sum(${pedidos.total}),0)`;
const expPedidosFeitos = sql<string>`count(${pedidos.id})`;

type OrdenarPor = "total_gasto" | "pedidos" | "ticket_medio" | "ultimo_pedido" | "nome";

function ordenarPor(chave: OrdenarPor) {
  switch (chave) {
    case "pedidos":
      return desc(expPedidosFeitos);
    case "ticket_medio":
      return desc(expTicketMedio);
    case "ultimo_pedido":
      return desc(expUltimoPedido);
    case "nome":
      return asc(clientes.nome);
    default:
      return desc(expTotalGasto);
  }
}

export type RelatorioClientesInput = { lojaId: number; busca?: string; ordenar?: OrdenarPor; periodo?: string; dataIni?: string; dataFim?: string; pagina?: number; limite?: number };

export type ClienteRelatorio = { clienteId: number; nome: string; telefone: string | null; ultimoPedido: string | null; totalTaxa: number; ticketMedio: number; totalGasto: number; pedidosFeitos: number };

export type RelatorioClientesResultado = { total: number; pagina: number; paginas: number; limite: number; clientes: ClienteRelatorio[] };

export async function relatorioClientes(input: RelatorioClientesInput): Promise<RelatorioClientesResultado> {
  const { lojaId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "30", input.dataIni, input.dataFim);
  const pagina0 = Math.max(1, input.pagina ?? 1);
  const limite = ([10, 25, 50] as const).includes(input.limite as never) ? (input.limite as 10 | 25 | 50) : 10;
  const ordenar = ordenarPor(input.ordenar ?? "total_gasto");

  const condicoes = [eq(pedidos.loja_id, lojaId), sql`${pedidos.criado_em} between ${inicio} and ${fim}`, ne(pedidos.status, "cancelado")];
  const busca = input.busca?.trim();
  if (busca) condicoes.push(or(ilike(clientes.nome, `%${busca}%`), ilike(clientes.telefone, `%${busca}%`)) as never);
  const where = and(...condicoes);

  const [{ total }] = await db
    .select({ total: sql<string>`count(distinct ${clientes.id})` })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .where(where);
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));
  const pagina = Math.min(pagina0, paginas);
  const offset = (pagina - 1) * limite;

  const linhas = await db
    .select({
      clienteId: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      ultimoPedido: expUltimoPedido,
      totalTaxa: expTotalTaxa,
      ticketMedio: expTicketMedio,
      totalGasto: expTotalGasto,
      pedidosFeitos: expPedidosFeitos,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .where(where)
    .groupBy(clientes.id, clientes.nome, clientes.telefone)
    .orderBy(ordenar)
    .limit(limite)
    .offset(offset);

  return {
    total: totalNum,
    pagina,
    paginas,
    limite,
    clientes: linhas.map((l) => ({
      clienteId: l.clienteId,
      nome: l.nome ?? "",
      telefone: l.telefone,
      ultimoPedido: l.ultimoPedido,
      totalTaxa: Number(l.totalTaxa),
      ticketMedio: Number(l.ticketMedio),
      totalGasto: Number(l.totalGasto),
      pedidosFeitos: Number(l.pedidosFeitos),
    })),
  };
}
