import "server-only";
import { and, eq, sql, asc, desc, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { motoboys, pedidos, clientes } from "@/db/schema";
import { dataFortaleza, adicionarDiasFortaleza } from "@/db/queries/tempo";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";

/*
 * Equivalente de admin/api/v1/motoboys.php (list/bind), motoboys_gerenciar.php,
 * motoboys_entregas.php, motoboys_salvar.php e motoboys_excluir.php: tela de
 * Motoboys (/motoboys) e o seletor de motoboy no Gestor de Pedidos.
 */

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function resolverPeriodo(periodoInput: string, dataInicioInput: string, dataFimInput: string) {
  const hoje = dataFortaleza();
  let periodo = periodoInput;
  let dataInicio: string;
  let dataFim: string;

  if (periodo === "7dias") {
    dataInicio = adicionarDiasFortaleza(-6);
    dataFim = hoje;
  } else if (periodo === "customizado" && RE_DATA.test(dataInicioInput) && RE_DATA.test(dataFimInput)) {
    dataInicio = dataInicioInput;
    dataFim = dataFimInput;
  } else {
    periodo = "hoje";
    dataInicio = hoje;
    dataFim = hoje;
  }

  return { periodo, dataInicio, dataFim, inicioTimestamp: `${dataInicio} 00:00:00`, fimTimestamp: `${dataFim} 23:59:59` };
}

export type MotoboyParaVinculo = { id: number; nome: string; whatsapp: string };

export async function listarMotoboysParaVinculo(lojaId: number, pedidoId: number): Promise<{ motoboys: MotoboyParaVinculo[]; selectedId: number }> {
  let selectedId = 0;
  if (pedidoId > 0) {
    const [linha] = await db.select({ motoboyId: pedidos.motoboy_id }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
    selectedId = linha?.motoboyId ?? 0;
  }

  const linhas = await db
    .select({ id: motoboys.id, nome: motoboys.nome, whatsapp: motoboys.whatsapp })
    .from(motoboys)
    .where(and(eq(motoboys.loja_id, lojaId), eq(motoboys.ativo, true)))
    .orderBy(asc(motoboys.nome));

  return { motoboys: linhas, selectedId };
}

export async function vincularMotoboy(lojaId: number, pedidoId: number, motoboyId: number): Promise<{ ok: true; msg: string; motoboyNome: string } | { ok: false; msg: string }> {
  if (pedidoId <= 0) return { ok: false, msg: "Pedido invalido." };

  const [pedido] = await db.select({ id: pedidos.id, tipo: pedidos.tipo }).from(pedidos).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId))).limit(1);
  if (!pedido) return { ok: false, msg: "Pedido nao encontrado." };
  if (pedido.tipo !== "entrega") return { ok: false, msg: "Somente pedidos de entrega podem vincular motoboy." };

  let motoboyNome = "";
  if (motoboyId > 0) {
    const [m] = await db.select({ nome: motoboys.nome }).from(motoboys).where(and(eq(motoboys.id, motoboyId), eq(motoboys.loja_id, lojaId))).limit(1);
    motoboyNome = m?.nome ?? "";
    if (motoboyNome === "") return { ok: false, msg: "Motoboy nao encontrado." };
  }

  await db.update(pedidos).set({ motoboy_id: motoboyId > 0 ? motoboyId : null }).where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)));

  return { ok: true, msg: motoboyId > 0 ? "Motoboy vinculado com sucesso." : "Motoboy desvinculado com sucesso.", motoboyNome };
}

export type MotoboyGerenciar = { id: number; nome: string; whatsapp: string; dataCadastro: string; ativo: boolean; entregasPeriodo: number; taxasPeriodo: number };

export type GerenciarMotoboysResultado = {
  periodo: string;
  dataInicio: string;
  dataFim: string;
  stats: { totalMotoboys: number; entregasPeriodo: number; taxasPeriodo: number };
  motoboys: MotoboyGerenciar[];
};

export async function gerenciarMotoboys(lojaId: number, periodoInput: string, dataInicioInput: string, dataFimInput: string): Promise<GerenciarMotoboysResultado> {
  const { periodo, dataInicio, dataFim, inicioTimestamp, fimTimestamp } = resolverPeriodo(periodoInput, dataInicioInput, dataFimInput);

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(motoboys).where(eq(motoboys.loja_id, lojaId));

  const condicaoEntregas = and(
    eq(pedidos.loja_id, lojaId),
    eq(pedidos.tipo, "entrega"),
    isNotNull(pedidos.motoboy_id),
    eq(pedidos.status, "finalizado"),
    sql`${pedidos.criado_em} between ${inicioTimestamp} and ${fimTimestamp}`
  );

  const [statsEntregas] = await db
    .select({ entregas: sql<string>`count(*)`, taxas: sql<string>`coalesce(sum(${pedidos.taxa_entrega}), 0)` })
    .from(pedidos)
    .where(condicaoEntregas);

  const linhas = await db
    .select({
      id: motoboys.id,
      nome: motoboys.nome,
      whatsapp: motoboys.whatsapp,
      dataCadastro: motoboys.data_cadastro,
      ativo: motoboys.ativo,
      entregasPeriodo: sql<string>`count(${pedidos.id})`,
      taxasPeriodo: sql<string>`coalesce(sum(${pedidos.taxa_entrega}), 0)`,
    })
    .from(motoboys)
    .leftJoin(
      pedidos,
      and(eq(pedidos.motoboy_id, motoboys.id), eq(pedidos.loja_id, motoboys.loja_id), eq(pedidos.tipo, "entrega"), eq(pedidos.status, "finalizado"), sql`${pedidos.criado_em} between ${inicioTimestamp} and ${fimTimestamp}`)
    )
    .where(eq(motoboys.loja_id, lojaId))
    .groupBy(motoboys.id)
    .orderBy(asc(motoboys.nome));

  return {
    periodo,
    dataInicio,
    dataFim,
    stats: { totalMotoboys: Number(total), entregasPeriodo: Number(statsEntregas?.entregas ?? 0), taxasPeriodo: Number(statsEntregas?.taxas ?? 0) },
    motoboys: linhas.map((l) => ({ ...l, entregasPeriodo: Number(l.entregasPeriodo), taxasPeriodo: Number(l.taxasPeriodo) })),
  };
}

export type EntregaMotoboy = {
  id: number;
  codigo: number;
  status: string;
  criadoEm: string | null;
  enderecoEntrega: string | null;
  taxaEntrega: number | null;
  clienteNome: string | null;
  clienteTelefone: string | null;
  motoboyNome: string;
  motoboyWhatsapp: string;
};

export type ListarEntregasResultado = {
  entregas: EntregaMotoboy[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  mostrandoDe: number;
  mostrandoAte: number;
};

export async function listarEntregasMotoboy(lojaId: number, periodoInput: string, dataInicioInput: string, dataFimInput: string, pageInput: number, perPageInput: number): Promise<ListarEntregasResultado> {
  const { inicioTimestamp, fimTimestamp } = resolverPeriodo(periodoInput, dataInicioInput, dataFimInput);
  const perPage = [5, 10, 25].includes(perPageInput) ? perPageInput : 10;

  const condicao = and(
    eq(pedidos.loja_id, lojaId),
    eq(pedidos.tipo, "entrega"),
    isNotNull(pedidos.motoboy_id),
    eq(pedidos.status, "finalizado"),
    sql`${pedidos.criado_em} between ${inicioTimestamp} and ${fimTimestamp}`
  );

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(pedidos).where(condicao);
  const totalNum = Number(total);
  const totalPages = Math.max(1, Math.ceil(totalNum / perPage));
  const page = Math.min(Math.max(1, pageInput), totalPages);
  const offset = (page - 1) * perPage;

  const linhas = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      criadoEm: pedidos.criado_em,
      enderecoEntrega: pedidos.endereco_entrega,
      taxaEntrega: pedidos.taxa_entrega,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      motoboyNome: motoboys.nome,
      motoboyWhatsapp: motoboys.whatsapp,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .innerJoin(motoboys, and(eq(motoboys.id, pedidos.motoboy_id), eq(motoboys.loja_id, pedidos.loja_id)))
    .where(condicao)
    .orderBy(desc(pedidos.criado_em), desc(pedidos.id))
    .limit(perPage)
    .offset(offset);

  const base = await pedidoCodigoBase(lojaId);

  return {
    entregas: linhas.map((l) => ({ ...l, codigo: codigoDisplay(l.id, base) })),
    total: totalNum,
    page,
    perPage,
    totalPages,
    mostrandoDe: totalNum > 0 ? offset + 1 : 0,
    mostrandoAte: Math.min(page * perPage, totalNum),
  };
}

export type SalvarMotoboyInput = { id?: number; nome: string; whatsapp: string; dataCadastro?: string; ativo?: boolean };

export async function salvarMotoboy(lojaId: number, input: SalvarMotoboyInput): Promise<{ ok: true; msg: string; id?: number } | { ok: false; msg: string }> {
  const id = input.id && input.id > 0 ? input.id : 0;
  const nome = input.nome.trim();
  const whatsapp = input.whatsapp.replace(/\D+/g, "");
  const dataCadastro = (input.dataCadastro ?? "").trim() || dataFortaleza();
  const ativo = input.ativo === undefined ? true : input.ativo;

  if (nome === "") return { ok: false, msg: "Informe o nome do motoboy." };
  if (whatsapp === "") return { ok: false, msg: "Informe o WhatsApp do motoboy." };

  if (id > 0) {
    await db.update(motoboys).set({ nome, whatsapp, data_cadastro: dataCadastro, ativo, atualizado_em: sql`now()` }).where(and(eq(motoboys.id, id), eq(motoboys.loja_id, lojaId)));
    return { ok: true, msg: "Motoboy atualizado com sucesso." };
  }

  const [nova] = await db.insert(motoboys).values({ loja_id: lojaId, nome, whatsapp, data_cadastro: dataCadastro, ativo }).returning({ id: motoboys.id });
  return { ok: true, msg: "Motoboy cadastrado com sucesso.", id: nova.id };
}

export async function excluirMotoboy(lojaId: number, id: number): Promise<{ ok: true; msg: string } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Motoboy invalido." };
  await db.update(pedidos).set({ motoboy_id: null }).where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.motoboy_id, id)));
  await db.delete(motoboys).where(and(eq(motoboys.id, id), eq(motoboys.loja_id, lojaId)));
  return { ok: true, msg: "Motoboy removido com sucesso." };
}
