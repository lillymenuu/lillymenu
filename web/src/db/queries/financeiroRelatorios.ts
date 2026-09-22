import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { financialTransactions, financialCategories, financialAccounts, paymentMethods, configuracoes } from "@/db/schema";
import { syncFinalizedOrdersForPeriod } from "@/db/queries/financeiroSync";
import { listarCategoriasFinanceiras, listarContasFinanceiras, listarFormasPagamento, listarLancamentosFiltrados, type FiltrosLancamentos } from "@/db/queries/financeiroCore";

/*
 * Equivalente de services/FinancialReportService.php + trechos de
 * admin/helpers/financial_module.php (financialYearOptions,
 * financialSyncCurrentMonthSalesIfNeeded) + admin/api/v1/
 * financeiro_dashboard_detalhe.php, financeiro_dre_detalhe.php,
 * financeiro_lancamentos_detalhe.php e financeiro_sync_pedidos.php.
 */

function hojeFortalezaISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

function mesAnoAtualFortaleza(): { mes: number; ano: number } {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const mapa: Record<string, string> = {};
  for (const p of partes) mapa[p.type] = p.value;
  return { mes: Number(mapa.month), ano: Number(mapa.year) };
}

export type FiltrosRelatorio = { type?: "income" | "expense"; accountId?: number; categoryId?: number; paymentMethodId?: number; referenceMonth?: number; referenceYear?: number; dateFrom?: string; dateTo?: string };

function condicoesRelatorio(lojaId: number, filtros: FiltrosRelatorio) {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();
  const condicoes = [eq(financialTransactions.tenant_id, lojaId)];
  if (filtros.type) condicoes.push(eq(financialTransactions.type, filtros.type));
  if (filtros.accountId) condicoes.push(eq(financialTransactions.account_id, filtros.accountId));
  if (filtros.categoryId) condicoes.push(eq(financialTransactions.category_id, filtros.categoryId));
  if (filtros.paymentMethodId) condicoes.push(eq(financialTransactions.payment_method_id, filtros.paymentMethodId));
  if (filtros.referenceMonth) condicoes.push(eq(financialTransactions.reference_month, filtros.referenceMonth));
  if (filtros.referenceYear) condicoes.push(eq(financialTransactions.reference_year, filtros.referenceYear));

  /* mesmo do PHP: sem date_to explicito, olhando o mes/ano corrente, nao conta lancamentos "futuros" do proprio mes. */
  if (!filtros.dateTo && filtros.referenceMonth === mesAtual && filtros.referenceYear === anoAtual) {
    condicoes.push(sql`${financialTransactions.transaction_date} <= ${hojeFortalezaISO()}`);
  }
  if (filtros.dateFrom) condicoes.push(sql`${financialTransactions.transaction_date} >= ${filtros.dateFrom}`);
  if (filtros.dateTo) condicoes.push(sql`${financialTransactions.transaction_date} <= ${filtros.dateTo}`);

  return and(...condicoes);
}

export type ResumoFinanceiro = { totalIncome: number; totalExpense: number; balance: number };

export async function resumoFinanceiro(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<ResumoFinanceiro> {
  const [linha] = await db
    .select({
      totalIncome: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else 0 end), 0)`,
      totalExpense: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'expense' then ${financialTransactions.amount} else 0 end), 0)`,
      balance: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else -${financialTransactions.amount} end), 0)`,
    })
    .from(financialTransactions)
    .where(condicoesRelatorio(lojaId, filtros));
  return { totalIncome: Number(linha.totalIncome), totalExpense: Number(linha.totalExpense), balance: Number(linha.balance) };
}

export type ResumoMensal = { referenceMonth: number; referenceYear: number; totalIncome: number; totalExpense: number; profitOrLoss: number; marginPercent: number };

export async function resumoMensal(lojaId: number, referenceMonth: number, referenceYear: number, filtros: FiltrosRelatorio = {}): Promise<ResumoMensal> {
  const resumo = await resumoFinanceiro(lojaId, { ...filtros, referenceMonth, referenceYear });
  const profit = resumo.totalIncome - resumo.totalExpense;
  const margin = resumo.totalIncome > 0 ? (profit / resumo.totalIncome) * 100 : 0;
  return { referenceMonth, referenceYear, totalIncome: resumo.totalIncome, totalExpense: resumo.totalExpense, profitOrLoss: profit, marginPercent: Math.round(margin * 100) / 100 };
}

export type PontoFluxoCaixa = { transactionDate: string; incomeTotal: number; expenseTotal: number; dayBalance: number };

export async function fluxoCaixa(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<PontoFluxoCaixa[]> {
  const linhas = await db
    .select({
      transactionDate: financialTransactions.transaction_date,
      incomeTotal: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else 0 end), 0)`,
      expenseTotal: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'expense' then ${financialTransactions.amount} else 0 end), 0)`,
      dayBalance: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else -${financialTransactions.amount} end), 0)`,
    })
    .from(financialTransactions)
    .where(condicoesRelatorio(lojaId, filtros))
    .groupBy(financialTransactions.transaction_date)
    .orderBy(financialTransactions.transaction_date);
  return linhas.map((l) => ({ transactionDate: l.transactionDate, incomeTotal: Number(l.incomeTotal), expenseTotal: Number(l.expenseTotal), dayBalance: Number(l.dayBalance) }));
}

export type LinhaDre = { type: "income" | "expense"; categoryName: string; groupName: string; total: number };
export type Dre = { grossRevenue: number; totalExpenses: number; netProfit: number; marginPercent: number; lines: LinhaDre[] };

export async function dre(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<Dre> {
  const resumo = await resumoFinanceiro(lojaId, filtros);
  const netProfit = resumo.totalIncome - resumo.totalExpense;
  const margin = resumo.totalIncome > 0 ? (netProfit / resumo.totalIncome) * 100 : 0;

  const categoriaPai = { id: financialCategories.id, name: sql<string>`p.name` };
  const linhas = await db
    .select({
      type: financialCategories.type,
      categoryName: financialCategories.name,
      groupName: sql<string>`coalesce(p.name, ${financialCategories.name})`,
      total: sql<string>`sum(${financialTransactions.amount})`,
    })
    .from(financialTransactions)
    .innerJoin(financialCategories, and(eq(financialCategories.id, financialTransactions.category_id), eq(financialCategories.tenant_id, financialTransactions.tenant_id)))
    .leftJoin(sql`financial_categories p`, sql`p.id = ${financialCategories.parent_id} and p.tenant_id = ${financialCategories.tenant_id}`)
    .where(condicoesRelatorio(lojaId, filtros))
    .groupBy(financialCategories.type, financialCategories.name, sql`coalesce(p.name, ${financialCategories.name})`)
    .orderBy(financialCategories.type, sql`coalesce(p.name, ${financialCategories.name})`, financialCategories.name);
  void categoriaPai;

  return {
    grossRevenue: resumo.totalIncome,
    totalExpenses: resumo.totalExpense,
    netProfit,
    marginPercent: Math.round(margin * 100) / 100,
    lines: linhas.map((l) => ({ type: l.type, categoryName: l.categoryName, groupName: l.groupName, total: Number(l.total) })),
  };
}

export type LinhaDespesaCategoria = { categoryGroup: string; categoryName: string; total: number };

export async function despesasPorCategoria(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<LinhaDespesaCategoria[]> {
  const linhas = await db
    .select({
      categoryGroup: sql<string>`coalesce(p.name, ${financialCategories.name})`,
      categoryName: financialCategories.name,
      total: sql<string>`sum(${financialTransactions.amount})`,
    })
    .from(financialTransactions)
    .innerJoin(financialCategories, and(eq(financialCategories.id, financialTransactions.category_id), eq(financialCategories.tenant_id, financialTransactions.tenant_id)))
    .leftJoin(sql`financial_categories p`, sql`p.id = ${financialCategories.parent_id} and p.tenant_id = ${financialCategories.tenant_id}`)
    .where(condicoesRelatorio(lojaId, { ...filtros, type: "expense" }))
    .groupBy(sql`coalesce(p.name, ${financialCategories.name})`, financialCategories.name)
    .orderBy(desc(sql`sum(${financialTransactions.amount})`), financialCategories.name);
  return linhas.map((l) => ({ categoryGroup: l.categoryGroup, categoryName: l.categoryName, total: Number(l.total) }));
}

export type LinhaReceitaFormaPagamento = { paymentMethod: string; total: number };

export async function receitasPorFormaPagamento(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<LinhaReceitaFormaPagamento[]> {
  const linhas = await db
    .select({ paymentMethod: sql<string>`coalesce(${paymentMethods.name}, 'Não informado')`, total: sql<string>`sum(${financialTransactions.amount})` })
    .from(financialTransactions)
    .leftJoin(paymentMethods, and(eq(paymentMethods.id, financialTransactions.payment_method_id), eq(paymentMethods.tenant_id, financialTransactions.tenant_id)))
    .where(condicoesRelatorio(lojaId, { ...filtros, type: "income" }))
    .groupBy(sql`coalesce(${paymentMethods.name}, 'Não informado')`)
    .orderBy(desc(sql`sum(${financialTransactions.amount})`), sql`coalesce(${paymentMethods.name}, 'Não informado')`);
  return linhas.map((l) => ({ paymentMethod: l.paymentMethod, total: Number(l.total) }));
}

export type ContaDashboard = { id: number; name: string; initialBalance: number; active: boolean; monthlyIncome: number; monthlyExpense: number; monthlyBalance: number };

export type DashboardFinanceiro = {
  summary: ResumoFinanceiro;
  cashFlow: PontoFluxoCaixa[];
  accounts: ContaDashboard[];
  expenseByCategory: LinhaDespesaCategoria[];
  incomeByPaymentMethod: LinhaReceitaFormaPagamento[];
};

export async function dashboardFinanceiro(lojaId: number, filtros: FiltrosRelatorio = {}): Promise<DashboardFinanceiro> {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();
  const refMonth = filtros.referenceMonth ?? mesAtual;
  const refYear = filtros.referenceYear ?? anoAtual;

  const [summary, cashFlow, contasLinhas, expenseByCategory, incomeByPaymentMethod] = await Promise.all([
    resumoFinanceiro(lojaId, filtros),
    fluxoCaixa(lojaId, filtros),
    db
      .select({
        id: financialAccounts.id,
        name: financialAccounts.name,
        initialBalance: financialAccounts.initial_balance,
        active: financialAccounts.active,
        monthlyIncome: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else 0 end), 0)`,
        monthlyExpense: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'expense' then ${financialTransactions.amount} else 0 end), 0)`,
        monthlyBalance: sql<string>`coalesce(sum(case when ${financialTransactions.type} = 'income' then ${financialTransactions.amount} else -${financialTransactions.amount} end), 0)`,
      })
      .from(financialAccounts)
      .leftJoin(financialTransactions, and(eq(financialTransactions.account_id, financialAccounts.id), eq(financialTransactions.tenant_id, financialAccounts.tenant_id), eq(financialTransactions.reference_month, refMonth), eq(financialTransactions.reference_year, refYear)))
      .where(eq(financialAccounts.tenant_id, lojaId))
      .groupBy(financialAccounts.id, financialAccounts.name, financialAccounts.initial_balance, financialAccounts.active)
      .orderBy(financialAccounts.name),
    despesasPorCategoria(lojaId, filtros),
    receitasPorFormaPagamento(lojaId, filtros),
  ]);

  return {
    summary,
    cashFlow,
    accounts: contasLinhas.map((c) => ({ id: c.id, name: c.name, initialBalance: c.initialBalance, active: Boolean(c.active), monthlyIncome: Number(c.monthlyIncome), monthlyExpense: Number(c.monthlyExpense), monthlyBalance: Number(c.monthlyBalance) })),
    expenseByCategory,
    incomeByPaymentMethod,
  };
}

/* ==================== Anos disponiveis + sync throttle ==================== */

export async function anosDisponiveis(lojaId: number): Promise<number[]> {
  const linhas = await db.selectDistinct({ ano: financialTransactions.reference_year }).from(financialTransactions).where(eq(financialTransactions.tenant_id, lojaId));
  const { ano: anoAtual } = mesAnoAtualFortaleza();
  const anos = new Set<number>(linhas.map((l) => l.ano));
  if (anos.size === 0) anos.add(anoAtual);
  for (let ano = anoAtual; ano <= 2030; ano++) anos.add(ano);
  return Array.from(anos).sort((a, b) => b - a);
}

/** financialSyncCurrentMonthSalesIfNeeded: so sincroniza o mes atual, no maximo a cada 5 minutos por loja (throttle persistido em configuracoes). */
async function sincronizarMesAtualSeNecessario(lojaId: number, referenceMonth: number, referenceYear: number): Promise<void> {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();
  if (referenceMonth !== mesAtual || referenceYear !== anoAtual) return;

  const chave = `fin_sync_last_${referenceMonth}_${referenceYear}`;
  const [linha] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.chave, chave), eq(configuracoes.loja_id, lojaId))).limit(1);
  const ultimoSync = linha ? Number(linha.valor) : null;
  const agora = Math.floor(Date.now() / 1000);
  if (ultimoSync !== null && agora - ultimoSync < 300) return;

  try {
    await syncFinalizedOrdersForPeriod(lojaId, referenceMonth, referenceYear);
    await db
      .insert(configuracoes)
      .values({ loja_id: lojaId, chave, valor: String(agora) })
      .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: String(agora) } });
  } catch (e) {
    console.error("Erro ao reconciliar vendas finalizadas no financeiro:", e);
  }
}

/* ==================== Endpoints compostos ==================== */

export type DetalheDashboardFinanceiro = { mes: number; ano: number; anos: number[]; resumoMensal: ResumoMensal; dashboard: DashboardFinanceiro; dre: Dre };

export async function detalheDashboardFinanceiro(lojaId: number, mesInput?: number, anoInput?: number): Promise<DetalheDashboardFinanceiro> {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();
  const mes = Math.min(12, Math.max(1, mesInput ?? mesAtual));
  const ano = anoInput ?? anoAtual;

  await sincronizarMesAtualSeNecessario(lojaId, mes, ano);

  const anosSet = new Set(await anosDisponiveis(lojaId));
  anosSet.add(ano);
  const anos = Array.from(anosSet).sort((a, b) => b - a);

  const filtros = { referenceMonth: mes, referenceYear: ano };
  const [resumo, dash, dreResultado] = await Promise.all([resumoMensal(lojaId, mes, ano, filtros), dashboardFinanceiro(lojaId, filtros), dre(lojaId, filtros)]);

  return { mes, ano, anos, resumoMensal: resumo, dashboard: dash, dre: dreResultado };
}

export type DetalheDreFinanceiro = { ano: number; anos: number[]; meses: Record<number, ResumoMensal> };

export async function detalheDreFinanceiro(lojaId: number, anoInput?: number): Promise<DetalheDreFinanceiro> {
  const { ano: anoAtual } = mesAnoAtualFortaleza();
  const ano = anoInput ?? anoAtual;

  const anosSet = new Set(await anosDisponiveis(lojaId));
  anosSet.add(ano);
  const anos = Array.from(anosSet).sort((a, b) => b - a);

  const meses: Record<number, ResumoMensal> = {};
  for (let m = 1; m <= 12; m++) {
    meses[m] = await resumoMensal(lojaId, m, ano, { referenceMonth: m, referenceYear: ano });
  }

  return { ano, anos, meses };
}

export type ItemLancamentoDetalhado = {
  id: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  transactionDate: string;
  referenceMonth: number;
  referenceYear: number;
  notes: string | null;
  accountId: number;
  accountName: string | null;
  categoryId: number;
  categoryName: string | null;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  orderId: number | null;
};

export type DetalheLancamentosFinanceiro = {
  mes: number;
  ano: number;
  anos: number[];
  tipo: string;
  categoriaId: number;
  contaId: number;
  page: number;
  perPage: number;
  total: number;
  totalPaginas: number;
  lancamentos: ItemLancamentoDetalhado[];
  categorias: { id: number; name: string; type: string }[];
  contas: { id: number; name: string }[];
  formasPagamento: { id: number; name: string }[];
};

export type FiltrosDetalheLancamentos = { mes?: number; ano?: number; tipo?: string; categoriaId?: number; contaId?: number; pagina?: number };

/** financeiro_lancamentos_detalhe.php: paginacao feita em memoria sobre a lista ja filtrada, igual ao legado (per_page fixo em 5). */
export async function detalheLancamentosFinanceiro(lojaId: number, filtros: FiltrosDetalheLancamentos = {}): Promise<DetalheLancamentosFinanceiro> {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();
  const mes = Math.min(12, Math.max(1, filtros.mes ?? mesAtual));
  const ano = filtros.ano ?? anoAtual;
  const tipo = filtros.tipo?.trim() ?? "";
  const categoriaId = filtros.categoriaId ?? 0;
  const contaId = filtros.contaId ?? 0;
  const perPage = 5;
  let page = Math.max(1, filtros.pagina ?? 1);

  await sincronizarMesAtualSeNecessario(lojaId, mes, ano);

  const anosSet = new Set(await anosDisponiveis(lojaId));
  anosSet.add(ano);
  const anos = Array.from(anosSet).sort((a, b) => b - a);

  const filtrosLancamentos: FiltrosLancamentos = { referenceMonth: mes, referenceYear: ano };
  if (tipo === "income" || tipo === "expense") filtrosLancamentos.type = tipo;
  if (categoriaId > 0) filtrosLancamentos.categoryId = categoriaId;
  if (contaId > 0) filtrosLancamentos.accountId = contaId;

  const [categorias, contas, formasPagamento, transacoes] = await Promise.all([
    listarCategoriasFinanceiras(lojaId, undefined, true),
    listarContasFinanceiras(lojaId, true),
    listarFormasPagamento(lojaId, true),
    listarLancamentosFiltrados(lojaId, filtrosLancamentos),
  ]);

  const total = transacoes.length;
  const totalPaginas = Math.max(1, Math.ceil(total / perPage));
  if (page > totalPaginas) page = totalPaginas;
  const visiveis = transacoes.slice((page - 1) * perPage, page * perPage);

  const catIds = Array.from(new Set(visiveis.map((t) => t.categoryId)));
  const accIds = Array.from(new Set(visiveis.map((t) => t.accountId)));
  const pmIds = Array.from(new Set(visiveis.map((t) => t.paymentMethodId).filter((v): v is number => v !== null)));

  const [catMap, accMap, pmMap] = await Promise.all([
    catIds.length ? db.select().from(financialCategories).where(and(eq(financialCategories.tenant_id, lojaId), sql`${financialCategories.id} in ${catIds}`)) : Promise.resolve([]),
    accIds.length ? db.select().from(financialAccounts).where(and(eq(financialAccounts.tenant_id, lojaId), sql`${financialAccounts.id} in ${accIds}`)) : Promise.resolve([]),
    pmIds.length ? db.select().from(paymentMethods).where(and(eq(paymentMethods.tenant_id, lojaId), sql`${paymentMethods.id} in ${pmIds}`)) : Promise.resolve([]),
  ]);
  const catPorId = new Map(catMap.map((c) => [c.id, c]));
  const accPorId = new Map(accMap.map((a) => [a.id, a]));
  const pmPorId = new Map(pmMap.map((p) => [p.id, p]));

  const lancamentos: ItemLancamentoDetalhado[] = visiveis.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: t.amount,
    transactionDate: t.transactionDate,
    referenceMonth: t.referenceMonth,
    referenceYear: t.referenceYear,
    notes: t.notes,
    accountId: t.accountId,
    accountName: accPorId.get(t.accountId)?.name ?? null,
    categoryId: t.categoryId,
    categoryName: catPorId.get(t.categoryId)?.name ?? null,
    paymentMethodId: t.paymentMethodId,
    paymentMethodName: t.paymentMethodId ? (pmPorId.get(t.paymentMethodId)?.name ?? null) : null,
    orderId: t.orderId,
  }));

  return {
    mes,
    ano,
    anos,
    tipo,
    categoriaId,
    contaId,
    page,
    perPage,
    total,
    totalPaginas,
    lancamentos,
    categorias: categorias.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    contas: contas.map((c) => ({ id: c.id, name: c.name })),
    formasPagamento: formasPagamento.map((p) => ({ id: p.id, name: p.name })),
  };
}

/* ==================== Sincronizacao manual de pedidos ==================== */

export type ResultadoSincronizacaoPedidos =
  | { ok: true; modo: "mes"; mes: number; ano: number; created: number; updated: number; orders: number; msg: string }
  | { ok: true; modo: "todos"; periodos: string[]; created: number; updated: number; orders: number; msg: string };

export async function sincronizarPedidosFinanceiro(lojaId: number, modo: "mes" | "todos", mesInput?: number, anoInput?: number): Promise<ResultadoSincronizacaoPedidos> {
  const { mes: mesAtual, ano: anoAtual } = mesAnoAtualFortaleza();

  if (modo === "todos") {
    const periodosLinhas = await db.execute<{ ano: number; mes: number }>(sql`
      select distinct extract(year from p.criado_em)::int as ano, extract(month from p.criado_em)::int as mes
      from pedidos p
      where p.loja_id = ${lojaId}
        and p.status = 'finalizado'
        and p.total > 0
        and not exists (
          select 1 from financial_transactions ft
          where ft.tenant_id = p.loja_id and ft.order_id = p.id and ft.type = 'income'
        )
      order by ano asc, mes asc
    `);

    let totalCriados = 0;
    let totalAtualizados = 0;
    let totalPedidos = 0;
    const periodos: string[] = [];
    for (const periodo of periodosLinhas.rows) {
      const resultado = await syncFinalizedOrdersForPeriod(lojaId, periodo.mes, periodo.ano);
      totalCriados += resultado.created;
      totalAtualizados += resultado.updated;
      totalPedidos += resultado.orders;
      periodos.push(`${periodo.mes}/${periodo.ano}`);
    }

    return { ok: true, modo: "todos", periodos, created: totalCriados, updated: totalAtualizados, orders: totalPedidos, msg: `Sincronizados ${totalPedidos} pedido(s) — ${totalCriados} lançamento(s) criado(s).` };
  }

  const mes = mesInput ?? mesAtual;
  const ano = anoInput ?? anoAtual;
  const resultado = await syncFinalizedOrdersForPeriod(lojaId, mes, ano);
  return { ok: true, modo: "mes", mes, ano, created: resultado.created, updated: resultado.updated, orders: resultado.orders, msg: `Sincronizados ${resultado.orders} pedido(s) de ${mes}/${ano} — ${resultado.created} lançamento(s) criado(s).` };
}
