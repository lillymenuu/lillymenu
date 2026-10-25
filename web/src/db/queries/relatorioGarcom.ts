import "server-only";
import { and, eq, ne, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { garcons, pedidos, pedidoItens, mesas, pedidoStatusLog } from "@/db/schema";
import { getConfigs } from "@/db/queries/config";
import { timestampFortaleza } from "@/db/queries/tempo";

/*
 * Relatorio de desempenho por garcom (/waiter-report) — novo, sem equivalente no
 * admin PHP legado (modo_garcom_stats.php la so tem os 3 contadores do cabecalho).
 *
 * Duas limitacoes de schema que o relatorio reflete honestamente em vez de inventar
 * numero:
 * - Nao existe log do MOMENTO em que um chamado de mesa foi atendido
 *   (conta_solicitada_em e so um timestamp "aberto", zerado sem registro de
 *   quando/quem atendeu) — entao "chamadosAbertos" so consegue congelar o tempo
 *   de espera quando o ultimo pedido da mesa ja fechou (finalizado/cancelado,
 *   via pedido_status_log); enquanto a mesa ainda tem pedido em andamento, o
 *   tempo mostrado e AO VIVO (quanto tempo esta esperando agora).
 * - "mesasSemMovimento" = mesas ativas sem nenhum pedido no periodo filtrado
 *   (nao ha conceito de "sessao de mesa aberta" separado dos proprios pedidos).
 *
 * pedidos.updated_at NAO serve pra marcar "quando o pedido finalizou": as
 * cascatas de troca de status (pedidosStatus.ts) so fazem UPDATE de `status`,
 * sem tocar updated_at — ele fica preso perto de criado_em. O momento real de
 * cada transicao de status mora em pedido_status_log (criado_em da linha
 * correspondente), usado aqui tanto pro giro medio quanto pros chamados.
 */

export type Turno = "todos" | "manha" | "tarde" | "noite";

function resolverPeriodo(periodo: string, dataIni?: string, dataFim?: string): { periodo: string; inicio: string; fim: string } {
  const hojeISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
  if (periodo === "customizado") {
    return { periodo, inicio: dataIni || `${hojeISO.slice(0, 7)}-01`, fim: dataFim || hojeISO };
  }
  if (periodo === "7dias" || periodo === "30dias") {
    const dias = periodo === "7dias" ? 6 : 29;
    const [y, m, d] = hojeISO.split("-").map(Number);
    const inicioDt = new Date(Date.UTC(y, m - 1, d) - dias * 86_400_000);
    const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
    return { periodo, inicio, fim: hojeISO };
  }
  return { periodo: "hoje", inicio: hojeISO, fim: hojeISO };
}

function condicaoTurno(turno: Turno) {
  if (turno === "manha") return sql`extract(hour from ${pedidos.criado_em}) >= 6 and extract(hour from ${pedidos.criado_em}) < 12`;
  if (turno === "tarde") return sql`extract(hour from ${pedidos.criado_em}) >= 12 and extract(hour from ${pedidos.criado_em}) < 18`;
  if (turno === "noite") return sql`(extract(hour from ${pedidos.criado_em}) >= 18 or extract(hour from ${pedidos.criado_em}) < 6)`;
  return null;
}

function condicoesPeriodoPedido(inicio: string, fim: string, turno: Turno) {
  const condicoes = [sql`${pedidos.criado_em}::date between ${inicio}::date and ${fim}::date`];
  const turnoCond = condicaoTurno(turno);
  if (turnoCond) condicoes.push(turnoCond);
  return condicoes;
}

export type RelatorioGarcomLinha = {
  garcomId: number;
  nome: string;
  ativo: boolean;
  mesasAtendidas: number;
  pedidos: number;
  valorVendido: number;
  ticketMedio: number;
  baseComissao: number;
  comissaoValor: number;
  giroMedioMinutos: number | null;
};

export type RelatorioGarcomChamado = { mesaId: number; mesaNome: string; garcomNome: string | null; minutos: number; status: "aberto" | "fechado" };
export type RelatorioGarcomMesaOciosa = { id: number; numero: number; nome: string };
export type RelatorioGarcomTopProduto = { nome: string; qtd: number; valor: number };

export type RelatorioGarcomResultado = {
  periodo: { inicio: string; fim: string };
  turno: Turno;
  taxaServicoPct: number;
  porGarcom: RelatorioGarcomLinha[];
  topProdutos: RelatorioGarcomTopProduto[];
  mesasSemMovimento: RelatorioGarcomMesaOciosa[];
  chamadosAbertos: RelatorioGarcomChamado[];
};

export type RelatorioGarcomInput = { lojaId: number; periodo?: string; dataIni?: string; dataFim?: string; turno?: Turno; garcomId?: number };

/** Lista simples pro seletor de garcom do relatorio (id/nome/ativo, sem as metricas). */
export async function listarGarconsAdmin(lojaId: number): Promise<{ id: number; nome: string; ativo: boolean }[]> {
  return db.select({ id: garcons.id, nome: garcons.nome, ativo: garcons.ativo }).from(garcons).where(eq(garcons.loja_id, lojaId)).orderBy(garcons.nome);
}

export async function relatorioGarcons(input: RelatorioGarcomInput): Promise<RelatorioGarcomResultado> {
  const { lojaId, garcomId } = input;
  const { inicio, fim } = resolverPeriodo(input.periodo ?? "hoje", input.dataIni, input.dataFim);
  const turno = input.turno ?? "todos";

  const cfg = await getConfigs(lojaId, ["taxa_servico_pct"]);
  const taxaServicoPct = Number(cfg.taxa_servico_pct || "0");

  const joinCondicoes = [eq(pedidos.garcom_id, garcons.id), eq(pedidos.loja_id, garcons.loja_id), ne(pedidos.status, "cancelado"), ...condicoesPeriodoPedido(inicio, fim, turno)];

  const whereGarcons = [eq(garcons.loja_id, lojaId)];
  if (garcomId) whereGarcons.push(eq(garcons.id, garcomId));

  const linhas = await db
    .select({
      garcomId: garcons.id,
      nome: garcons.nome,
      ativo: garcons.ativo,
      mesasAtendidas: sql<string>`count(distinct ${pedidos.mesa_id})`,
      pedidosCount: sql<string>`count(${pedidos.id})`,
      valorVendido: sql<string>`coalesce(sum(${pedidos.total}),0)`,
      baseComissao: sql<string>`coalesce(sum(${pedidos.subtotal} - ${pedidos.desconto}),0)`,
      comissaoValor: sql<string>`coalesce(sum(${pedidos.taxa_servico}),0)`,
      giroMedioMinutos: sql<string | null>`avg(
        case when ${pedidos.status} = 'finalizado' then
          extract(epoch from (
            (select max(${pedidoStatusLog.criado_em}) from ${pedidoStatusLog} where ${pedidoStatusLog.pedido_id} = ${pedidos.id} and ${pedidoStatusLog.status} = 'finalizado')
            - ${pedidos.criado_em}
          )) / 60
        end
      )`,
    })
    .from(garcons)
    .leftJoin(pedidos, and(...joinCondicoes))
    .where(and(...whereGarcons))
    .groupBy(garcons.id, garcons.nome, garcons.ativo)
    .orderBy(sql`coalesce(sum(${pedidos.total}),0) desc`);

  const porGarcom: RelatorioGarcomLinha[] = linhas.map((l) => {
    const mesasAtendidas = Number(l.mesasAtendidas);
    const pedidosCount = Number(l.pedidosCount);
    const valorVendido = Number(l.valorVendido);
    const divisorTicket = mesasAtendidas > 0 ? mesasAtendidas : pedidosCount;
    return {
      garcomId: l.garcomId,
      nome: l.nome,
      ativo: l.ativo,
      mesasAtendidas,
      pedidos: pedidosCount,
      valorVendido,
      ticketMedio: divisorTicket > 0 ? valorVendido / divisorTicket : 0,
      baseComissao: Number(l.baseComissao),
      comissaoValor: Number(l.comissaoValor),
      giroMedioMinutos: l.giroMedioMinutos != null ? Number(l.giroMedioMinutos) : null,
    };
  });

  let topProdutos: RelatorioGarcomTopProduto[] = [];
  if (garcomId) {
    const topRows = await db
      .select({
        nome: pedidoItens.produto_nome,
        qtd: sql<string>`sum(${pedidoItens.quantidade})`,
        valor: sql<string>`sum(${pedidoItens.preco} * ${pedidoItens.quantidade})`,
      })
      .from(pedidoItens)
      .innerJoin(pedidos, and(eq(pedidos.id, pedidoItens.pedido_id), eq(pedidos.loja_id, pedidoItens.loja_id)))
      .where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.garcom_id, garcomId), ne(pedidos.status, "cancelado"), ...condicoesPeriodoPedido(inicio, fim, turno)))
      .groupBy(pedidoItens.produto_nome)
      .orderBy(sql`sum(${pedidoItens.preco} * ${pedidoItens.quantidade}) desc`)
      .limit(8);
    topProdutos = topRows.map((r) => ({ nome: r.nome ?? "", qtd: Number(r.qtd), valor: Number(r.valor) }));
  }

  const mesasAtivas = await db
    .select({ id: mesas.id, numero: mesas.numero, nome: mesas.nome })
    .from(mesas)
    .where(and(eq(mesas.loja_id, lojaId), eq(mesas.ativo, true)));

  const mesasComPedido = await db
    .select({ mesaId: pedidos.mesa_id })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), ne(pedidos.status, "cancelado"), ...condicoesPeriodoPedido(inicio, fim, turno)))
    .groupBy(pedidos.mesa_id);
  const setComPedido = new Set(mesasComPedido.map((m) => m.mesaId));

  const mesasSemMovimento = mesasAtivas
    .filter((m) => !setComPedido.has(m.id))
    .sort((a, b) => a.numero - b.numero);

  const chamadosRaw = await db
    .select({ mesaId: mesas.id, mesaNome: mesas.nome, contaSolicitadaEm: mesas.conta_solicitada_em })
    .from(mesas)
    .where(and(eq(mesas.loja_id, lojaId), isNotNull(mesas.conta_solicitada_em)))
    .orderBy(mesas.conta_solicitada_em);

  const agora = timestampFortaleza();
  const chamadosAbertos: RelatorioGarcomChamado[] = await Promise.all(
    chamadosRaw.map(async (m) => {
      /* Pedido mais recente da mesa, independente do status: se ja fechou
         (finalizado/cancelado), o chamado tambem fechou junto — congela a
         espera no momento real dessa troca de status (pedido_status_log),
         em vez de continuar contando a partir de "agora". */
      const [ultimoPedido] = await db
        .select({ id: pedidos.id, status: pedidos.status, garcomNome: garcons.nome })
        .from(pedidos)
        .leftJoin(garcons, eq(garcons.id, pedidos.garcom_id))
        .where(and(eq(pedidos.mesa_id, m.mesaId), eq(pedidos.loja_id, lojaId)))
        .orderBy(sql`${pedidos.criado_em} desc`)
        .limit(1);

      const encerrado = ultimoPedido?.status === "finalizado" || ultimoPedido?.status === "cancelado";

      let fimReferencia: string | null = null;
      if (encerrado && ultimoPedido) {
        const [logLinha] = await db
          .select({ criadoEm: pedidoStatusLog.criado_em })
          .from(pedidoStatusLog)
          .where(and(eq(pedidoStatusLog.pedido_id, ultimoPedido.id), eq(pedidoStatusLog.status, ultimoPedido.status), eq(pedidoStatusLog.loja_id, lojaId)))
          .orderBy(sql`${pedidoStatusLog.criado_em} desc`)
          .limit(1);
        fimReferencia = logLinha?.criadoEm ?? null;
      }

      const status: "aberto" | "fechado" = fimReferencia ? "fechado" : "aberto";
      const fimEfetivo = fimReferencia ?? agora;

      const minutos = m.contaSolicitadaEm
        ? Math.max(0, Math.round((new Date(fimEfetivo.replace(" ", "T")).getTime() - new Date(m.contaSolicitadaEm.replace(" ", "T")).getTime()) / 60_000))
        : 0;

      return { mesaId: m.mesaId, mesaNome: m.mesaNome, garcomNome: ultimoPedido?.garcomNome ?? null, minutos, status };
    })
  );

  return { periodo: { inicio, fim }, turno, taxaServicoPct, porGarcom, topProdutos, mesasSemMovimento, chamadosAbertos };
}
