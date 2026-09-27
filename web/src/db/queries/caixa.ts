import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import type { NeonTx } from "@/db";
import { admins, caixaTurnos, caixaMovimentacoes, operacaoLogs, pedidos, lojas } from "@/db/schema";
import { timestampFortaleza, dataFortaleza } from "@/db/queries/tempo";
import { resumoCaixaAtual } from "@/db/queries/caixaResumo";
import { verificarSenhaPorId } from "@/db/queries/auth";
import { MOTIVOS_SAIDA_VALORES, LIMITE_AUTORIZACAO_SENHA } from "@/lib/caixaMotivos";

type Queryable = typeof db | NeonTx;

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
  motivo?: string;
  autorizadoPorId?: number;
  autorizadoPorSenha?: string;
};

export type MovimentarCaixaResultado = { ok: true; caixaId: number; movimentacaoId: number } | { ok: false; msg: string };

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
  let motivo: string | null = null;
  let autorizadoPorId: number | null = null;
  let autorizadoPorNome: string | null = null;

  if (input.tipo === "sangria") {
    motivo = (input.motivo ?? "").trim();
    if (!motivo || !MOTIVOS_SAIDA_VALORES.includes(motivo)) return { ok: false, msg: "Informe o motivo da saída." };

    const resumo = await resumoCaixaAtual(input.lojaId);
    const saldoDisponivel = resumo.caixa ? resumo.resumo.saldoEsperado : 0;
    if (input.valor > saldoDisponivel) {
      return { ok: false, msg: `Saldo insuficiente em caixa. Saldo disponível: ${formatBRLServidor(saldoDisponivel)}` };
    }

    if (!input.autorizadoPorId) return { ok: false, msg: "Selecione o responsável pela autorização." };
    const [supervisor] = await db
      .select({ id: admins.id, nome: admins.nome, perfil: admins.perfil, ativo: admins.ativo })
      .from(admins)
      .where(and(eq(admins.id, input.autorizadoPorId), eq(admins.loja_id, input.lojaId)))
      .limit(1);
    if (!supervisor || !supervisor.ativo || (supervisor.perfil !== "admin" && supervisor.perfil !== "gerente")) {
      return { ok: false, msg: "Responsável pela autorização inválido." };
    }
    autorizadoPorId = supervisor.id;
    autorizadoPorNome = supervisor.nome ?? "";

    if (input.valor >= LIMITE_AUTORIZACAO_SENHA) {
      if (!input.autorizadoPorSenha) return { ok: false, msg: "Confirme a senha do responsável para autorizar essa saída." };
      const senhaOk = await verificarSenhaPorId(supervisor.id, input.lojaId, input.autorizadoPorSenha);
      if (!senhaOk) return { ok: false, msg: "Senha do responsável incorreta." };
    }
  }

  const agora = timestampFortaleza();

  const [inserido] = await db
    .insert(caixaMovimentacoes)
    .values({
      caixa_id: caixaId,
      operador_id: input.adminId,
      tipo: input.tipo,
      motivo,
      valor: input.valor,
      observacoes: observacoes || null,
      autorizado_por_id: autorizadoPorId,
      autorizado_por_nome: autorizadoPorNome,
      criado_em: agora,
      loja_id: input.lojaId,
    })
    .returning({ id: caixaMovimentacoes.id });

  await registrarOperacao(input.adminId, "caixa_movimentacao", `caixa:${caixaId}`, { tipo: input.tipo, valor: input.valor, motivo });

  return { ok: true, caixaId, movimentacaoId: inserido.id };
}

function formatBRLServidor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type CaixaSupervisor = { id: number; nome: string };

/** Admins da loja com perfil admin/gerente, elegiveis a autorizar uma saida de caixa. */
export async function listarSupervisores(lojaId: number): Promise<CaixaSupervisor[]> {
  const linhas = await db
    .select({ id: admins.id, nome: admins.nome })
    .from(admins)
    .where(and(eq(admins.loja_id, lojaId), eq(admins.ativo, true), inArray(admins.perfil, ["admin", "gerente"])))
    .orderBy(admins.nome);
  return linhas.map((a) => ({ id: a.id, nome: a.nome ?? `Admin #${a.id}` }));
}

export type CaixaSaidaItem = {
  id: number;
  caixaId: number;
  valor: number;
  motivo: string | null;
  observacoes: string | null;
  operador: string | null;
  autorizadoPor: string | null;
  criadoEm: string;
};

/** Saidas (sangria) do caixa aberto no momento, mais recentes primeiro — alimenta o card de acompanhamento. */
export async function listarSaidasCaixaAberto(lojaId: number): Promise<CaixaSaidaItem[]> {
  const aberto = await db
    .select({ id: caixaTurnos.id })
    .from(caixaTurnos)
    .where(and(eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId)))
    .orderBy(desc(caixaTurnos.id))
    .limit(1);
  const caixaId = aberto[0]?.id;
  if (!caixaId) return [];

  const linhas = await db
    .select({
      id: caixaMovimentacoes.id,
      caixaId: caixaMovimentacoes.caixa_id,
      valor: caixaMovimentacoes.valor,
      motivo: caixaMovimentacoes.motivo,
      observacoes: caixaMovimentacoes.observacoes,
      operador: admins.nome,
      autorizadoPor: caixaMovimentacoes.autorizado_por_nome,
      criadoEm: caixaMovimentacoes.criado_em,
    })
    .from(caixaMovimentacoes)
    .leftJoin(admins, eq(admins.id, caixaMovimentacoes.operador_id))
    .where(and(eq(caixaMovimentacoes.caixa_id, caixaId), eq(caixaMovimentacoes.loja_id, lojaId), eq(caixaMovimentacoes.tipo, "sangria")))
    .orderBy(desc(caixaMovimentacoes.criado_em), desc(caixaMovimentacoes.id));

  return linhas;
}

export type CaixaSaidaComprovante = {
  id: number;
  caixaId: number;
  valor: number;
  motivo: string | null;
  observacoes: string | null;
  operador: string | null;
  autorizadoPor: string | null;
  criadoEm: string;
  lojaNome: string | null;
};

/** Dados de uma saida especifica para montar o comprovante de impressao. */
export async function buscarSaidaComprovante(lojaId: number, movimentacaoId: number): Promise<CaixaSaidaComprovante | null> {
  const [linha] = await db
    .select({
      id: caixaMovimentacoes.id,
      caixaId: caixaMovimentacoes.caixa_id,
      valor: caixaMovimentacoes.valor,
      motivo: caixaMovimentacoes.motivo,
      observacoes: caixaMovimentacoes.observacoes,
      operador: admins.nome,
      autorizadoPor: caixaMovimentacoes.autorizado_por_nome,
      criadoEm: caixaMovimentacoes.criado_em,
      lojaNome: lojas.nome,
    })
    .from(caixaMovimentacoes)
    .leftJoin(admins, eq(admins.id, caixaMovimentacoes.operador_id))
    .leftJoin(lojas, eq(lojas.id, lojaId))
    .where(and(eq(caixaMovimentacoes.id, movimentacaoId), eq(caixaMovimentacoes.loja_id, lojaId), eq(caixaMovimentacoes.tipo, "sangria")))
    .limit(1);
  return linha ?? null;
}

/*
 * Equivalente de admin/helpers/caixa_module.php (caixaAtribuirPedidoFinalizado):
 * atribui o caixa aberto da loja a um pedido que ainda nao tem caixa_id (caso de
 * pedidos agendados feitos pelo cliente, que nascem sem operador/caixa). So
 * faz sentido na finalizacao, pra entrar na movimentacao do caixa aberto no dia
 * em que foi processado (nao no dia em que foi originalmente criado/agendado).
 * Nunca sobrescreve um caixa_id ja existente (ex.: pedido criado pelo PDV).
 */
export async function caixaAtribuirPedidoFinalizado(conexao: Queryable, lojaId: number, pedidoId: number): Promise<void> {
  try {
    const [pedido] = await conexao.select({ caixaId: pedidos.caixa_id }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    if (!pedido || pedido.caixaId) return;

    const hoje = dataFortaleza();
    const [caixaAberto] = await conexao
      .select({ id: caixaTurnos.id })
      .from(caixaTurnos)
      .where(and(eq(caixaTurnos.status, "aberto"), eq(caixaTurnos.loja_id, lojaId), sql`to_char(${caixaTurnos.aberto_em}, 'YYYY-MM-DD') = ${hoje}`))
      .orderBy(desc(caixaTurnos.id))
      .limit(1);
    if (!caixaAberto) return;

    await conexao.update(pedidos).set({ caixa_id: caixaAberto.id }).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId), sql`${pedidos.caixa_id} is null`));
  } catch (e) {
    console.error("[caixa] falha ao atribuir caixa ao pedido finalizado", pedidoId, e);
  }
}
