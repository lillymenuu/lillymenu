import "server-only";
import { and, eq, ne, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { caixaTurnos, caixaMovimentacoes, pedidoPagamentos, pedidos, admins } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/caixa_detalhe.php, caixa_editar_abertura.php e
 * caixa_historico.php: tela de Controle de Caixa (/cashcontrol) — extrato de
 * um turno, edicao do horario de abertura e paginacao do historico.
 */

function normalizarForma(formaInput: string | null | undefined): "pix" | "dinheiro" | "debito" | "credito" | "voucher" | "outro" {
  const valor = (formaInput ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (valor === "pix" || valor.includes("pix")) return "pix";
  if (valor.includes("dinheiro") || valor.includes("cash")) return "dinheiro";
  if (valor.includes("debito")) return "debito";
  if (valor.includes("credito")) return "credito";
  if (valor.includes("voucher") || valor.includes("vale")) return "voucher";
  return "outro";
}

type LinhaExtrato = { uid: string; direcao: "entrada" | "saida"; forma: string; valor: number; criadoEm: string | null; observacoes: string; origem: string };

export type DetalheCaixaResultado = {
  caixa: { id: number; status: string; abertoEm: string | null; fechadoEm: string | null; saldoInicial: number; saldoFinal: number | null; operador: string };
  resumo: { entrada: number; saida: number; saldo: number; pedidosTotal: number; manualEntrada: number; manualSaida: number };
  formas: Record<"pix" | "dinheiro" | "credito" | "debito" | "voucher" | "outro", number>;
  linhas: LinhaExtrato[];
};

export async function detalheCaixa(lojaId: number, caixaId: number): Promise<{ ok: true } & DetalheCaixaResultado | { ok: false; msg: string }> {
  if (caixaId <= 0) return { ok: false, msg: "Caixa inválido" };

  const [caixa] = await db
    .select({
      id: caixaTurnos.id,
      status: caixaTurnos.status,
      abertoEm: caixaTurnos.aberto_em,
      fechadoEm: caixaTurnos.fechado_em,
      saldoInicial: caixaTurnos.saldo_inicial,
      saldoFinal: caixaTurnos.saldo_final,
      operadorNome: admins.nome,
    })
    .from(caixaTurnos)
    .leftJoin(admins, eq(admins.id, caixaTurnos.operador_id))
    .where(and(eq(caixaTurnos.id, caixaId), eq(caixaTurnos.loja_id, lojaId)))
    .limit(1);
  if (!caixa) return { ok: false, msg: "Caixa não encontrado" };

  const codigoExpr = sql<string>`coalesce(nullif(${pedidos.codigo}, ''), ${pedidos.id}::text)`;

  const pagamentosRaw = await db
    .select({
      id: pedidoPagamentos.id,
      forma: sql<string>`coalesce(nullif(${pedidoPagamentos.forma}, ''), nullif(${pedidos.forma_pagamento}, ''), 'outro')`,
      valor: pedidoPagamentos.valor,
      criadoEm: sql<string>`coalesce(${pedidoPagamentos.criado_em}, ${pedidos.criado_em})`,
      codigo: codigoExpr,
    })
    .from(pedidoPagamentos)
    .innerJoin(pedidos, and(eq(pedidos.id, pedidoPagamentos.pedido_id), eq(pedidos.loja_id, pedidoPagamentos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), ne(pedidos.status, "cancelado"), eq(pedidos.caixa_id, caixaId)))
    .orderBy(desc(sql`coalesce(${pedidoPagamentos.criado_em}, ${pedidos.criado_em})`));

  let pagamentos: { uid: string; forma: string; valor: number; criadoEm: string; observacoes: string }[] = pagamentosRaw.map((p) => ({
    uid: `pg-${p.id}`,
    forma: p.forma,
    valor: Number(p.valor),
    criadoEm: p.criadoEm,
    observacoes: `Pedido #${p.codigo}`,
  }));

  if (pagamentos.length === 0) {
    const pedidosSemPagamento = await db
      .select({ id: pedidos.id, forma: sql<string>`coalesce(nullif(${pedidos.forma_pagamento}, ''), 'outro')`, valor: pedidos.total, criadoEm: pedidos.criado_em, codigo: codigoExpr })
      .from(pedidos)
      .where(and(eq(pedidos.loja_id, lojaId), ne(pedidos.status, "cancelado"), eq(pedidos.caixa_id, caixaId)))
      .orderBy(desc(pedidos.criado_em));

    pagamentos = pedidosSemPagamento.map((p) => ({
      uid: `pd-${p.id}`,
      forma: p.forma,
      valor: Number(p.valor ?? 0),
      criadoEm: p.criadoEm ?? "",
      observacoes: `Pedido #${p.codigo}`,
    }));
  }

  const movimentosRaw = await db
    .select({ id: caixaMovimentacoes.id, tipo: caixaMovimentacoes.tipo, valor: caixaMovimentacoes.valor, criadoEm: caixaMovimentacoes.criado_em, observacoes: caixaMovimentacoes.observacoes })
    .from(caixaMovimentacoes)
    .where(and(eq(caixaMovimentacoes.loja_id, lojaId), eq(caixaMovimentacoes.caixa_id, caixaId)))
    .orderBy(desc(caixaMovimentacoes.criado_em), desc(caixaMovimentacoes.id));

  const movimentos = movimentosRaw.map((m) => ({
    uid: `mv-${m.id}`,
    direcao: (m.tipo === "sangria" ? "saida" : "entrada") as "entrada" | "saida",
    valor: Number(m.valor),
    criadoEm: m.criadoEm,
    observacoes: m.observacoes && m.observacoes !== "" ? m.observacoes : m.tipo === "sangria" ? "Sangria manual" : "Suprimento manual",
  }));

  const linhas: LinhaExtrato[] = [
    ...pagamentos.map((p) => ({ uid: p.uid, direcao: "entrada" as const, forma: p.forma, valor: p.valor, criadoEm: p.criadoEm, observacoes: p.observacoes, origem: "LILLY" })),
    ...movimentos.map((m) => ({ uid: m.uid, direcao: m.direcao, forma: "manual", valor: m.valor, criadoEm: m.criadoEm, observacoes: m.observacoes, origem: "MANUAL" })),
  ].sort((a, b) => new Date(b.criadoEm ?? 0).getTime() - new Date(a.criadoEm ?? 0).getTime());

  const formas: Record<"pix" | "dinheiro" | "credito" | "debito" | "voucher" | "outro", number> = { pix: 0, dinheiro: 0, credito: 0, debito: 0, voucher: 0, outro: 0 };
  let entradaPedidosTotal = 0;
  for (const p of pagamentos) {
    const forma = normalizarForma(p.forma);
    formas[forma] += p.valor;
    entradaPedidosTotal += p.valor;
  }

  let entradaManual = 0;
  let saidaManual = 0;
  for (const m of movimentos) {
    if (m.direcao === "saida") saidaManual += m.valor;
    else entradaManual += m.valor;
  }

  const entradaTotal = entradaPedidosTotal + entradaManual;
  const saidaTotal = saidaManual;

  return {
    ok: true,
    caixa: {
      id: caixa.id,
      status: caixa.status,
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      saldoInicial: Number(caixa.saldoInicial),
      saldoFinal: caixa.saldoFinal !== null ? Number(caixa.saldoFinal) : null,
      operador: caixa.operadorNome ?? "-",
    },
    resumo: { entrada: entradaTotal, saida: saidaTotal, saldo: entradaTotal - saidaTotal, pedidosTotal: entradaPedidosTotal, manualEntrada: entradaManual, manualSaida: saidaManual },
    formas,
    linhas,
  };
}

export async function editarAberturaCaixa(lojaId: number, caixaId: number, abertoEmInput: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const abertoEmTrim = abertoEmInput.trim();
  if (caixaId <= 0 || abertoEmTrim === "") return { ok: false, msg: "Dados invalidos" };

  let abertoEm = abertoEmTrim.replace("T", " ");
  if (abertoEm.length === 16) abertoEm += ":00";

  const data = new Date(abertoEm.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return { ok: false, msg: "Data invalida" };

  await db.update(caixaTurnos).set({ aberto_em: abertoEm }).where(and(eq(caixaTurnos.id, caixaId), eq(caixaTurnos.loja_id, lojaId)));

  return { ok: true };
}

export type ItemHistoricoCaixa = { id: number; status: string; abertoEm: string | null; fechadoEm: string | null; operador: string | null };
export type HistoricoCaixaResultado = { tipo: "fechado" | "completo"; itens: ItemHistoricoCaixa[]; pagina: number; totalPaginas: number; total: number; mostrandoDe: number; mostrandoAte: number };

export async function historicoCaixa(lojaId: number, tipoInput: string, paginaInput: number): Promise<HistoricoCaixaResultado> {
  const tipo = tipoInput === "completo" ? "completo" : "fechado";
  const porPagina = tipo === "completo" ? 10 : 9;
  const limite = tipo === "completo" ? 80 : 50;

  const condicao = tipo === "fechado" ? and(eq(caixaTurnos.loja_id, lojaId), ne(caixaTurnos.status, "aberto")) : eq(caixaTurnos.loja_id, lojaId);

  const todos = await db
    .select({ id: caixaTurnos.id, status: caixaTurnos.status, abertoEm: caixaTurnos.aberto_em, fechadoEm: caixaTurnos.fechado_em, operador: admins.nome })
    .from(caixaTurnos)
    .leftJoin(admins, eq(admins.id, caixaTurnos.operador_id))
    .where(condicao)
    .orderBy(desc(caixaTurnos.id))
    .limit(limite);

  const total = todos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(Math.max(1, paginaInput), totalPaginas);
  const offset = (pagina - 1) * porPagina;
  const itens = todos.slice(offset, offset + porPagina);

  return {
    tipo,
    itens,
    pagina,
    totalPaginas,
    total,
    mostrandoDe: total > 0 ? offset + 1 : 0,
    mostrandoAte: Math.min(offset + porPagina, total),
  };
}
