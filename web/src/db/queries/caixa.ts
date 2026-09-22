import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, caixaTurnos, caixaMovimentacoes, operacaoLogs } from "@/db/schema";
import { timestampFortaleza, dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/caixa_abrir.php, caixa_fechar.php e
 * caixa_movimentar.php: ciclo de vida do caixa (turno) do PDV. caixa_resumo.php
 * (reconciliacao/relatorio) fica de fora por ora — ver decisao registrada
 * junto ao restante da migracao do PDV.
 */

/** Best-effort, igual ao registrarOperacao do PHP: nunca deve derrubar o fluxo principal. */
async function registrarOperacao(operadorId: number | null, acao: string, referencia: string, dados: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(operacaoLogs).values({
      operador_id: operadorId,
      acao,
      referencia,
      dados: JSON.stringify(dados),
    });
  } catch {
    // silencia — log nao pode interromper o fluxo principal
  }
}

export type CaixaTurno = {
  id: number;
  status: "aberto" | "fechado";
  saldoInicial: number;
  abertoEm: string;
};

export type AbrirCaixaInput = {
  lojaId: number;
  adminId: number;
  perfil: string;
  operadorId?: number;
  saldoInicial?: number;
  observacoes?: string;
};

export type AbrirCaixaResultado =
  | { ok: true; caixa: CaixaTurno; jaAberto?: boolean }
  | { ok: false; msg: string; caixa?: CaixaTurno };

export async function abrirCaixa(input: AbrirCaixaInput): Promise<AbrirCaixaResultado> {
  const lojaId = input.lojaId;
  const operadorId = input.operadorId && input.operadorId > 0 ? input.operadorId : input.adminId;

  if (operadorId !== input.adminId && input.perfil !== "admin" && input.perfil !== "gerente") {
    return { ok: false, msg: "Sem permissao para abrir caixa para outro operador." };
  }

  const operador = await db
    .select({ id: admins.id })
    .from(admins)
    .where(and(eq(admins.id, operadorId), eq(admins.loja_id, lojaId)))
    .limit(1);
  if (operador.length === 0) return { ok: false, msg: "Operador invalido" };

  const saldoInicial = input.saldoInicial ?? 0;
  const observacoes = (input.observacoes ?? "").trim();
  const hoje = dataFortaleza();

  const abertoHoje = await db
    .select({ id: caixaTurnos.id, status: caixaTurnos.status, saldoInicial: caixaTurnos.saldo_inicial, abertoEm: caixaTurnos.aberto_em })
    .from(caixaTurnos)
    .where(and(eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId)))
    .orderBy(desc(caixaTurnos.id));
  const jaAberto = abertoHoje.find((c) => c.abertoEm.slice(0, 10) === hoje);
  if (jaAberto) {
    return { ok: true, jaAberto: true, caixa: jaAberto };
  }

  const abertoAnterior = abertoHoje[0];
  if (abertoAnterior) {
    const [ano, mes, dia] = abertoAnterior.abertoEm.slice(0, 10).split("-");
    const dataFmt = `${dia}/${mes}/${ano}`;
    return {
      ok: false,
      msg: `Existe um caixa aberto do dia ${dataFmt}. Feche o caixa anterior para abrir o caixa de hoje.`,
      caixa: abertoAnterior,
    };
  }

  const agora = timestampFortaleza();
  const inserido = await db
    .insert(caixaTurnos)
    .values({ operador_id: operadorId, status: "aberto", saldo_inicial: saldoInicial, aberto_em: agora, obs_abertura: observacoes || null, loja_id: lojaId })
    .returning({ id: caixaTurnos.id, status: caixaTurnos.status, saldoInicial: caixaTurnos.saldo_inicial, abertoEm: caixaTurnos.aberto_em });
  const caixa = inserido[0];

  await registrarOperacao(operadorId, "caixa_aberto", `caixa:${caixa.id}`, { saldo_inicial: saldoInicial, operador_id: operadorId });

  return { ok: true, caixa };
}

export type FecharCaixaInput = {
  lojaId: number;
  adminId: number;
  caixaId: number;
  saldoFinal?: number;
  observacoes?: string;
};

export type FecharCaixaResultado = { ok: true } | { ok: false; msg: string };

export async function fecharCaixa(input: FecharCaixaInput): Promise<FecharCaixaResultado> {
  if (!input.caixaId) return { ok: false, msg: "Dados incompletos" };

  const linhas = await db
    .select({ id: caixaTurnos.id })
    .from(caixaTurnos)
    .where(and(eq(caixaTurnos.id, input.caixaId), eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, input.lojaId)))
    .limit(1);
  if (linhas.length === 0) return { ok: false, msg: "Caixa nao encontrado" };

  const saldoFinal = input.saldoFinal ?? 0;
  const observacoes = (input.observacoes ?? "").trim();
  const agora = timestampFortaleza();

  await db
    .update(caixaTurnos)
    .set({ status: "fechado", saldo_final: saldoFinal, fechado_em: agora, obs_fechamento: observacoes || null })
    .where(and(eq(caixaTurnos.id, input.caixaId), eq(caixaTurnos.loja_id, input.lojaId)));

  await registrarOperacao(input.adminId, "caixa_fechado", `caixa:${input.caixaId}`, { saldo_final: saldoFinal });

  return { ok: true };
}

export type MovimentarCaixaInput = {
  lojaId: number;
  adminId: number;
  tipo: "suprimento" | "sangria";
  valor: number;
  observacoes?: string;
};

export type MovimentarCaixaResultado = { ok: true; caixaId: number } | { ok: false; msg: string };

export async function movimentarCaixa(input: MovimentarCaixaInput): Promise<MovimentarCaixaResultado> {
  if (!input.tipo || input.valor <= 0) return { ok: false, msg: "Dados incompletos" };
  if (input.tipo !== "suprimento" && input.tipo !== "sangria") return { ok: false, msg: "Tipo invalido" };

  const aberto = await db
    .select({ id: caixaTurnos.id })
    .from(caixaTurnos)
    .where(and(eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, input.lojaId)))
    .orderBy(desc(caixaTurnos.id))
    .limit(1);
  const caixaId = aberto[0]?.id;
  if (!caixaId) return { ok: false, msg: "Caixa fechado" };

  const observacoes = (input.observacoes ?? "").trim();
  const agora = timestampFortaleza();

  await db.insert(caixaMovimentacoes).values({
    caixa_id: caixaId,
    operador_id: input.adminId,
    tipo: input.tipo,
    valor: input.valor,
    observacoes: observacoes || null,
    criado_em: agora,
    loja_id: input.lojaId,
  });

  await registrarOperacao(input.adminId, "caixa_movimentacao", `caixa:${caixaId}`, { tipo: input.tipo, valor: input.valor });

  return { ok: true, caixaId };
}
