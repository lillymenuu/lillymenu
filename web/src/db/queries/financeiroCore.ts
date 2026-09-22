import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { financialAccounts, financialCategories, paymentMethods, financialTransactions } from "@/db/schema";

/*
 * Equivalente de models/FinancialAccount.php, models/FinancialCategory.php,
 * models/PaymentMethod.php, models/FinancialTransaction.php e das
 * respectivas requests/controllers (requests/BaseRequest.php +
 * FinancialCategoryRequest/FinancialAccountRequest/PaymentMethodRequest/
 * FinancialTransactionRequest): validacao + CRUD do modulo financeiro.
 * As tabelas ja existem no schema migrado (financial_module.php roda
 * CREATE TABLE IF NOT EXISTS + ALTER a cada chamada — no-op aqui, omitido).
 */

type Queryable = typeof db | NeonTx;

export class ValidacaoFinanceiraError extends Error {
  errors: Record<string, string>;
  constructor(errors: Record<string, string>) {
    super(Object.values(errors).join(" ") || "Dados inválidos.");
    this.errors = errors;
    this.name = "ValidacaoFinanceiraError";
  }
}

function falha(errors: Record<string, string>): never {
  throw new ValidacaoFinanceiraError(errors);
}

function campoString(value: unknown, field: string, errors: Record<string, string>, required = true, max = 255): string {
  const v = String(value ?? "").trim();
  if (required && v === "") {
    errors[field] = `O campo ${field} é obrigatório.`;
    return "";
  }
  if (v !== "" && v.length > max) errors[field] = `O campo ${field} deve ter no máximo ${max} caracteres.`;
  return v;
}

function campoInteiro(value: unknown, field: string, errors: Record<string, string>, required = true, min: number | null = null): number | null {
  if (value === null || value === undefined || value === "") {
    if (required) errors[field] = `O campo ${field} é obrigatório.`;
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    errors[field] = `O campo ${field} deve ser inteiro.`;
    return null;
  }
  if (min !== null && n < min) errors[field] = `O campo ${field} deve ser maior ou igual a ${min}.`;
  return n;
}

function campoDecimal(value: unknown, field: string, errors: Record<string, string>, required = true, min: number | null = null): number | null {
  if (value === null || value === undefined || value === "") {
    if (required) errors[field] = `O campo ${field} é obrigatório.`;
    return null;
  }
  let normalizado = String(value).replace(/[^\d,.\-]/g, "");
  if (normalizado.includes(",") && normalizado.includes(".")) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  } else if (normalizado.includes(",")) {
    normalizado = normalizado.replace(",", ".");
  }
  const n = Number(normalizado);
  if (normalizado === "" || Number.isNaN(n)) {
    errors[field] = `O campo ${field} deve ser numérico.`;
    return null;
  }
  if (min !== null && n < min) errors[field] = `O campo ${field} deve ser maior ou igual a ${min}.`;
  return n;
}

function campoBooleano(value: unknown, padrao = true): boolean {
  if (value === null || value === undefined || value === "") return padrao;
  return value === 1 || value === "1" || value === true || value === "true" || value === "on" || value === "yes";
}

function campoEnum<T extends string>(value: unknown, field: string, permitidos: readonly T[], errors: Record<string, string>, required = true): T | "" {
  const v = String(value ?? "").trim();
  if (v === "") {
    if (required) errors[field] = `O campo ${field} é obrigatório.`;
    return "";
  }
  if (!permitidos.includes(v as T)) errors[field] = `O campo ${field} é inválido.`;
  return v as T;
}

function campoData(value: unknown, field: string, errors: Record<string, string>, required = true): string {
  const v = String(value ?? "").trim();
  if (v === "") {
    if (required) errors[field] = `O campo ${field} é obrigatório.`;
    return "";
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `O campo ${field} deve ser uma data válida.`;
    return "";
  }
  return d.toISOString().slice(0, 10);
}

function campoTextoOpcional(value: unknown, max = 5000): string | null {
  const v = String(value ?? "").trim();
  if (v === "") return null;
  return v.slice(0, max);
}

/* ==================== Categorias ==================== */

export type CategoriaFinanceira = { id: number; name: string; type: "income" | "expense"; parentId: number | null; active: boolean };

function mapCategoria(c: typeof financialCategories.$inferSelect): CategoriaFinanceira {
  return { id: c.id, name: c.name, type: c.type, parentId: c.parent_id, active: Boolean(c.active) };
}

export async function listarCategoriasFinanceiras(lojaId: number, tipo?: "income" | "expense", somenteAtivas = true): Promise<CategoriaFinanceira[]> {
  const condicoes = [eq(financialCategories.tenant_id, lojaId)];
  if (tipo) condicoes.push(eq(financialCategories.type, tipo));
  if (somenteAtivas) condicoes.push(eq(financialCategories.active, true));
  const linhas = await db
    .select()
    .from(financialCategories)
    .where(and(...condicoes))
    .orderBy(sql`${financialCategories.parent_id} is null desc`, financialCategories.parent_id, financialCategories.name);
  return linhas.map(mapCategoria);
}

export type SalvarCategoriaFinanceiraInput = { id?: number; name: string; type: string; parentId?: number | null; active?: boolean };

export async function salvarCategoriaFinanceira(lojaId: number, input: SalvarCategoriaFinanceiraInput): Promise<CategoriaFinanceira> {
  const errors: Record<string, string> = {};
  const name = campoString(input.name, "name", errors, true, 160);
  const type = campoEnum(input.type, "type", ["income", "expense"] as const, errors, true);
  const parentId = campoInteiro(input.parentId ?? null, "parent_id", errors, false, 1);
  const active = campoBooleano(input.active ?? true, true);

  if (parentId) {
    const [pai] = await db.select({ id: financialCategories.id, type: financialCategories.type }).from(financialCategories).where(and(eq(financialCategories.id, parentId), eq(financialCategories.tenant_id, lojaId))).limit(1);
    if (!pai) errors.parent_id = "Categoria pai inválida para este tenant.";
    else if (pai.type !== type) errors.parent_id = "A categoria pai deve ter o mesmo tipo.";
  }

  if (name !== "" && type !== "") {
    const condDup = parentId
      ? and(eq(financialCategories.tenant_id, lojaId), eq(financialCategories.name, name), eq(financialCategories.type, type), eq(financialCategories.parent_id, parentId))
      : and(eq(financialCategories.tenant_id, lojaId), eq(financialCategories.name, name), eq(financialCategories.type, type), sql`${financialCategories.parent_id} is null`);
    const dup = await db.select({ id: financialCategories.id }).from(financialCategories).where(input.id ? and(condDup, sql`${financialCategories.id} <> ${input.id}`) : condDup).limit(1);
    if (dup.length > 0) errors.name = "Já existe uma categoria com esse nome e tipo.";
  }

  if (Object.keys(errors).length > 0) falha(errors);

  if (input.id && input.id > 0) {
    await db.update(financialCategories).set({ name, type: type as "income" | "expense", parent_id: parentId, active, updated_at: sql`now()` }).where(and(eq(financialCategories.id, input.id), eq(financialCategories.tenant_id, lojaId)));
    const [linha] = await db.select().from(financialCategories).where(eq(financialCategories.id, input.id)).limit(1);
    return mapCategoria(linha);
  }

  const [inserida] = await db.insert(financialCategories).values({ tenant_id: lojaId, name, type: type as "income" | "expense", parent_id: parentId, active }).returning();
  return mapCategoria(inserida);
}

export async function excluirCategoriaFinanceira(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  try {
    await db.delete(financialCategories).where(and(eq(financialCategories.id, id), eq(financialCategories.tenant_id, lojaId)));
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "23503") {
      return { ok: false, msg: "Não é possível excluir: existem lançamentos vinculados a esta categoria." };
    }
    return { ok: false, msg: "Erro ao excluir categoria." };
  }
}

/* ==================== Contas ==================== */

export type ContaFinanceira = { id: number; name: string; initialBalance: number; currentBalance: number; active: boolean };

function mapConta(c: typeof financialAccounts.$inferSelect): ContaFinanceira {
  return { id: c.id, name: c.name, initialBalance: c.initial_balance, currentBalance: c.current_balance, active: Boolean(c.active) };
}

export async function listarContasFinanceiras(lojaId: number, somenteAtivas = true): Promise<ContaFinanceira[]> {
  const condicoes = [eq(financialAccounts.tenant_id, lojaId)];
  if (somenteAtivas) condicoes.push(eq(financialAccounts.active, true));
  const linhas = await db.select().from(financialAccounts).where(and(...condicoes)).orderBy(financialAccounts.name);
  return linhas.map(mapConta);
}

export async function buscarContaFinanceira(conexao: Queryable, id: number, lojaId: number): Promise<ContaFinanceira | null> {
  const [linha] = await conexao.select().from(financialAccounts).where(and(eq(financialAccounts.id, id), eq(financialAccounts.tenant_id, lojaId))).limit(1);
  return linha ? mapConta(linha) : null;
}

export type SalvarContaFinanceiraInput = { id?: number; name: string; initialBalance?: number; currentBalance?: number; active?: boolean };

export async function salvarContaFinanceira(lojaId: number, input: SalvarContaFinanceiraInput): Promise<ContaFinanceira> {
  const errors: Record<string, string> = {};
  const name = campoString(input.name, "name", errors, true, 160);
  const initialBalance = campoDecimal(input.initialBalance ?? 0, "initial_balance", errors, true, 0) ?? 0;
  /* igual ao legado: se current_balance nao vier, cai no valor de initial_balance — inclusive na EDICAO. */
  const currentBalance = campoDecimal(input.currentBalance ?? initialBalance, "current_balance", errors, true, 0) ?? 0;
  const active = campoBooleano(input.active ?? true, true);

  if (name !== "") {
    const dup = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(input.id ? and(eq(financialAccounts.tenant_id, lojaId), eq(financialAccounts.name, name), sql`${financialAccounts.id} <> ${input.id}`) : and(eq(financialAccounts.tenant_id, lojaId), eq(financialAccounts.name, name)))
      .limit(1);
    if (dup.length > 0) errors.name = "Já existe uma conta com esse nome.";
  }

  if (Object.keys(errors).length > 0) falha(errors);

  if (input.id && input.id > 0) {
    await db.update(financialAccounts).set({ name, initial_balance: initialBalance, current_balance: currentBalance, active, updated_at: sql`now()` }).where(and(eq(financialAccounts.id, input.id), eq(financialAccounts.tenant_id, lojaId)));
    const [linha] = await db.select().from(financialAccounts).where(eq(financialAccounts.id, input.id)).limit(1);
    return mapConta(linha);
  }

  const [inserida] = await db.insert(financialAccounts).values({ tenant_id: lojaId, name, initial_balance: initialBalance, current_balance: currentBalance, active }).returning();
  return mapConta(inserida);
}

export async function excluirContaFinanceira(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  try {
    await db.delete(financialAccounts).where(and(eq(financialAccounts.id, id), eq(financialAccounts.tenant_id, lojaId)));
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "23503") {
      return { ok: false, msg: "Não é possível excluir: existem lançamentos vinculados a esta conta." };
    }
    return { ok: false, msg: "Erro ao excluir conta." };
  }
}

async function aplicarImpactoConta(tx: NeonTx, accountId: number, lojaId: number, tipo: "income" | "expense", amount: number): Promise<void> {
  const conta = await buscarContaFinanceira(tx, accountId, lojaId);
  if (!conta) throw new Error("Conta financeira não encontrada para este tenant.");
  const novoSaldo = tipo === "income" ? conta.currentBalance + amount : conta.currentBalance - amount;
  await tx.update(financialAccounts).set({ current_balance: novoSaldo, updated_at: sql`now()` }).where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.tenant_id, lojaId)));
}

async function reverterImpactoConta(tx: NeonTx, accountId: number, lojaId: number, tipo: "income" | "expense", amount: number): Promise<void> {
  const conta = await buscarContaFinanceira(tx, accountId, lojaId);
  if (!conta) throw new Error("Conta financeira não encontrada para este tenant.");
  const novoSaldo = tipo === "income" ? conta.currentBalance - amount : conta.currentBalance + amount;
  await tx.update(financialAccounts).set({ current_balance: novoSaldo, updated_at: sql`now()` }).where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.tenant_id, lojaId)));
}

/* ==================== Formas de pagamento ==================== */

export type FormaPagamentoFinanceira = { id: number; name: string; active: boolean };

function mapFormaPagamento(p: typeof paymentMethods.$inferSelect): FormaPagamentoFinanceira {
  return { id: p.id, name: p.name, active: Boolean(p.active) };
}

export async function listarFormasPagamento(lojaId: number, somenteAtivas = true): Promise<FormaPagamentoFinanceira[]> {
  const condicoes = [eq(paymentMethods.tenant_id, lojaId)];
  if (somenteAtivas) condicoes.push(eq(paymentMethods.active, true));
  const linhas = await db.select().from(paymentMethods).where(and(...condicoes)).orderBy(paymentMethods.name);
  return linhas.map(mapFormaPagamento);
}

export async function buscarFormaPagamento(conexao: Queryable, id: number, lojaId: number): Promise<FormaPagamentoFinanceira | null> {
  const [linha] = await conexao.select().from(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.tenant_id, lojaId))).limit(1);
  return linha ? mapFormaPagamento(linha) : null;
}

export type SalvarFormaPagamentoInput = { id?: number; name: string; active?: boolean };

export async function salvarFormaPagamento(lojaId: number, input: SalvarFormaPagamentoInput): Promise<FormaPagamentoFinanceira> {
  const errors: Record<string, string> = {};
  const name = campoString(input.name, "name", errors, true, 120);
  const active = campoBooleano(input.active ?? true, true);

  if (name !== "") {
    const dup = await db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(input.id ? and(eq(paymentMethods.tenant_id, lojaId), eq(paymentMethods.name, name), sql`${paymentMethods.id} <> ${input.id}`) : and(eq(paymentMethods.tenant_id, lojaId), eq(paymentMethods.name, name)))
      .limit(1);
    if (dup.length > 0) errors.name = "Já existe uma forma de pagamento com esse nome.";
  }

  if (Object.keys(errors).length > 0) falha(errors);

  if (input.id && input.id > 0) {
    await db.update(paymentMethods).set({ name, active, updated_at: sql`now()` }).where(and(eq(paymentMethods.id, input.id), eq(paymentMethods.tenant_id, lojaId)));
    const [linha] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, input.id)).limit(1);
    return mapFormaPagamento(linha);
  }

  const [inserida] = await db.insert(paymentMethods).values({ tenant_id: lojaId, name, active }).returning();
  return mapFormaPagamento(inserida);
}

export async function excluirFormaPagamento(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  try {
    await db.delete(paymentMethods).where(and(eq(paymentMethods.id, id), eq(paymentMethods.tenant_id, lojaId)));
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "23503") {
      return { ok: false, msg: "Não é possível excluir: existem lançamentos vinculados a esta forma de pagamento." };
    }
    return { ok: false, msg: "Erro ao excluir forma de pagamento." };
  }
}

/* ==================== Lancamentos (financial_transactions) ==================== */

export type Lancamento = {
  id: number;
  orderId: number | null;
  accountId: number;
  categoryId: number;
  paymentMethodId: number | null;
  type: "income" | "expense";
  description: string;
  amount: number;
  transactionDate: string;
  referenceMonth: number;
  referenceYear: number;
  notes: string | null;
};

function mapLancamento(t: typeof financialTransactions.$inferSelect): Lancamento {
  return {
    id: t.id,
    orderId: t.order_id,
    accountId: t.account_id,
    categoryId: t.category_id,
    paymentMethodId: t.payment_method_id,
    type: t.type,
    description: t.description,
    amount: t.amount,
    transactionDate: t.transaction_date,
    referenceMonth: t.reference_month,
    referenceYear: t.reference_year,
    notes: t.notes,
  };
}

export type FiltrosLancamentos = {
  type?: "income" | "expense";
  accountId?: number;
  categoryId?: number;
  paymentMethodId?: number;
  orderId?: number;
  referenceMonth?: number;
  referenceYear?: number;
  dateFrom?: string;
  dateTo?: string;
};

export async function listarLancamentosFiltrados(lojaId: number, filtros: FiltrosLancamentos = {}): Promise<Lancamento[]> {
  const condicoes = [eq(financialTransactions.tenant_id, lojaId)];
  if (filtros.type) condicoes.push(eq(financialTransactions.type, filtros.type));
  if (filtros.accountId) condicoes.push(eq(financialTransactions.account_id, filtros.accountId));
  if (filtros.categoryId) condicoes.push(eq(financialTransactions.category_id, filtros.categoryId));
  if (filtros.paymentMethodId) condicoes.push(eq(financialTransactions.payment_method_id, filtros.paymentMethodId));
  if (filtros.orderId) condicoes.push(eq(financialTransactions.order_id, filtros.orderId));
  if (filtros.referenceMonth) condicoes.push(eq(financialTransactions.reference_month, filtros.referenceMonth));
  if (filtros.referenceYear) condicoes.push(eq(financialTransactions.reference_year, filtros.referenceYear));
  if (filtros.dateFrom) condicoes.push(gte(financialTransactions.transaction_date, filtros.dateFrom));
  if (filtros.dateTo) condicoes.push(lte(financialTransactions.transaction_date, filtros.dateTo));

  const linhas = await db
    .select()
    .from(financialTransactions)
    .where(and(...condicoes))
    .orderBy(desc(financialTransactions.transaction_date), desc(financialTransactions.id));
  return linhas.map(mapLancamento);
}

export type SalvarLancamentoInput = {
  accountId?: number;
  categoryId?: number;
  paymentMethodId?: number | null;
  type: string;
  description: string;
  amount: number | string;
  transactionDate: string;
  referenceMonth?: number;
  referenceYear?: number;
  notes?: string | null;
  orderId?: number | null;
};

function timestampMesAnoFortaleza(dataISO: string): { mes: number; ano: number } {
  const [ano, mes] = dataISO.split("-").map(Number);
  return { mes, ano };
}

async function validarPayloadLancamento(conexao: Queryable, lojaId: number, input: SalvarLancamentoInput): Promise<Omit<Lancamento, "id">> {
  const errors: Record<string, string> = {};
  const accountId = campoInteiro(input.accountId ?? null, "account_id", errors, true, 1);
  const categoryId = campoInteiro(input.categoryId ?? null, "category_id", errors, true, 1);
  const paymentMethodId = campoInteiro(input.paymentMethodId ?? null, "payment_method_id", errors, false, 1);
  const type = campoEnum(input.type, "type", ["income", "expense"] as const, errors, true);
  const description = campoString(input.description, "description", errors, true, 255);
  const amount = campoDecimal(input.amount, "amount", errors, true, 0.01);
  const transactionDate = campoData(input.transactionDate, "transaction_date", errors, true);
  const referenceMonth = campoInteiro(input.referenceMonth ?? null, "reference_month", errors, false, 1);
  const referenceYear = campoInteiro(input.referenceYear ?? null, "reference_year", errors, false, 2000);
  const notes = campoTextoOpcional(input.notes ?? null);

  if (accountId && !(await buscarContaFinanceira(conexao, accountId, lojaId))) errors.account_id = "Conta inválida para este tenant.";

  if (categoryId) {
    const categoria = (await conexao.select().from(financialCategories).where(and(eq(financialCategories.id, categoryId), eq(financialCategories.tenant_id, lojaId))).limit(1))[0];
    if (!categoria) errors.category_id = "Categoria inválida para este tenant.";
    else if (type && categoria.type !== type) errors.category_id = "A categoria deve ter o mesmo tipo do lançamento.";
  }

  if (paymentMethodId && !(await buscarFormaPagamento(conexao, paymentMethodId, lojaId))) errors.payment_method_id = "Forma de pagamento inválida para este tenant.";

  if (Object.keys(errors).length > 0) falha(errors);

  const { mes, ano } = timestampMesAnoFortaleza(transactionDate);

  return {
    orderId: input.orderId ?? null,
    accountId: accountId as number,
    categoryId: categoryId as number,
    paymentMethodId: paymentMethodId ?? null,
    type: type as "income" | "expense",
    description,
    amount: amount as number,
    transactionDate,
    referenceMonth: referenceMonth ?? mes,
    referenceYear: referenceYear ?? ano,
    notes,
  };
}

export async function criarLancamento(lojaId: number, input: SalvarLancamentoInput): Promise<Lancamento> {
  return withTransaction(async (tx) => {
    const data = await validarPayloadLancamento(tx, lojaId, input);
    const [inserido] = await tx
      .insert(financialTransactions)
      .values({ tenant_id: lojaId, order_id: data.orderId, account_id: data.accountId, category_id: data.categoryId, payment_method_id: data.paymentMethodId, type: data.type, description: data.description, amount: data.amount, transaction_date: data.transactionDate, reference_month: data.referenceMonth, reference_year: data.referenceYear, notes: data.notes })
      .returning();
    await aplicarImpactoConta(tx, data.accountId, lojaId, data.type, data.amount);
    return mapLancamento(inserido);
  });
}

export async function atualizarLancamento(lojaId: number, id: number, input: SalvarLancamentoInput): Promise<Lancamento> {
  return withTransaction(async (tx) => {
    const [atual] = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.tenant_id, lojaId))).limit(1);
    if (!atual) throw new Error("Transação financeira não encontrada para este tenant.");

    const data = await validarPayloadLancamento(tx, lojaId, input);

    await reverterImpactoConta(tx, atual.account_id, lojaId, atual.type, atual.amount);
    const [atualizado] = await tx
      .update(financialTransactions)
      .set({ order_id: data.orderId, account_id: data.accountId, category_id: data.categoryId, payment_method_id: data.paymentMethodId, type: data.type, description: data.description, amount: data.amount, transaction_date: data.transactionDate, reference_month: data.referenceMonth, reference_year: data.referenceYear, notes: data.notes, updated_at: sql`now()` })
      .where(and(eq(financialTransactions.id, id), eq(financialTransactions.tenant_id, lojaId)))
      .returning();
    await aplicarImpactoConta(tx, data.accountId, lojaId, data.type, data.amount);
    return mapLancamento(atualizado);
  });
}

export async function excluirLancamento(lojaId: number, id: number): Promise<boolean> {
  return withTransaction(async (tx) => {
    const [atual] = await tx.select().from(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.tenant_id, lojaId))).limit(1);
    if (!atual) return false;
    await tx.delete(financialTransactions).where(and(eq(financialTransactions.id, id), eq(financialTransactions.tenant_id, lojaId)));
    await reverterImpactoConta(tx, atual.account_id, lojaId, atual.type, atual.amount);
    return true;
  });
}

export async function lancamentosPorPedido(lojaId: number, orderId: number, tipo?: "income" | "expense"): Promise<Lancamento[]> {
  return listarLancamentosFiltrados(lojaId, { orderId, type: tipo });
}
