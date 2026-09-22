import "server-only";
import { and, eq, gt, ilike, or, sql, desc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { clientes, fiadoLancamentos, pedidos, admins } from "@/db/schema";
import { apenasDigitos, telefoneSemMascara } from "@/db/queries/telefone";
import { recordFiadoPayment } from "@/db/queries/financeiroSync";
import { dataFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/fiado_clientes.php, fiado_clientes_busca.php,
 * fiado_detalhe.php, fiado_registrar.php e fiado_pagamento.php: tela de
 * Controle de Fiado (/storecredittracking).
 *
 * O SHOW COLUMNS/SHOW TABLES defensivos do PHP (saldo_fiado, fiado_lancamentos,
 * operador_id, forma_pagamento podem nao existir em instalacoes antigas) foram
 * omitidos: o schema Neon ja garante tudo isso.
 */

const LIMIAR_SALDO = 0.009;

export type ClienteFiado = { id: number; nome: string | null; telefone: string | null; saldoFiado: number };
export type ListarFiadoResultado = { totalDebitos: number; totalClientes: number; clientes: ClienteFiado[]; pagina: number; paginas: number; total: number };

export async function listarClientesFiado(lojaId: number, busca: string, pagina: number, limite: number): Promise<ListarFiadoResultado> {
  const limiteValido = [10, 25, 50].includes(limite) ? limite : 10;
  const buscaLimpa = busca.trim();
  const buscaTel = apenasDigitos(buscaLimpa);

  let condicao = and(eq(clientes.loja_id, lojaId), gt(clientes.saldo_fiado, LIMIAR_SALDO))!;
  if (buscaLimpa !== "") {
    const partes = [ilike(clientes.nome, `%${buscaLimpa}%`)];
    if (buscaTel !== "") partes.push(ilike(telefoneSemMascara, `%${buscaTel}%`));
    condicao = and(eq(clientes.loja_id, lojaId), gt(clientes.saldo_fiado, LIMIAR_SALDO), or(...partes))!;
  }

  const [resumo] = await db
    .select({ totalDebitos: sql<string>`coalesce(sum(${clientes.saldo_fiado}), 0)`, totalClientes: sql<string>`count(*)` })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), gt(clientes.saldo_fiado, LIMIAR_SALDO)));

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(clientes).where(condicao);
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limiteValido));
  const paginaAtual = Math.min(Math.max(1, pagina), paginas);
  const offset = (paginaAtual - 1) * limiteValido;

  const linhas = await db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, saldoFiado: clientes.saldo_fiado })
    .from(clientes)
    .where(condicao)
    .orderBy(desc(clientes.saldo_fiado))
    .limit(limiteValido)
    .offset(offset);

  return {
    totalDebitos: Number(resumo?.totalDebitos ?? 0),
    totalClientes: Number(resumo?.totalClientes ?? 0),
    clientes: linhas,
    pagina: paginaAtual,
    paginas,
    total: totalNum,
  };
}

export type ClienteFiadoBusca = { id: number; nome: string | null; telefone: string | null };

export async function buscarClientesFiado(lojaId: number, busca: string): Promise<ClienteFiadoBusca[]> {
  const buscaLimpa = busca.trim();
  let condicao = eq(clientes.loja_id, lojaId);
  if (buscaLimpa !== "") {
    const buscaTel = apenasDigitos(buscaLimpa);
    const partes = [ilike(clientes.nome, `%${buscaLimpa}%`)];
    if (buscaTel !== "") partes.push(ilike(telefoneSemMascara, `%${buscaTel}%`));
    condicao = and(eq(clientes.loja_id, lojaId), or(...partes))!;
  }

  return db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone })
    .from(clientes)
    .where(condicao)
    .orderBy(clientes.nome)
    .limit(10);
}

export type LancamentoFiado = {
  id: number;
  tipo: "venda" | "pagamento";
  valor: number;
  saldoAntes: number;
  saldoDepois: number;
  observacao: string | null;
  criadoEm: string;
  pedidoId: number | null;
  pedidoCodigo: string | null;
  formaPagamento: string | null;
  operadorNome: string | null;
};

export type DetalheFiadoResultado = {
  cliente: { id: number; nome: string | null; telefone: string | null; saldoFiado: number };
  lancamentos: LancamentoFiado[];
  pagina: number;
  paginas: number;
  total: number;
};

export async function detalheFiado(lojaId: number, clienteId: number, pagina: number): Promise<{ ok: true } & DetalheFiadoResultado | { ok: false; msg: string }> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };

  const [cliente] = await db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone, saldoFiado: clientes.saldo_fiado })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)))
    .limit(1);
  if (!cliente) return { ok: false, msg: "Cliente nao encontrado." };

  const limite = 5;
  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(fiadoLancamentos).where(and(eq(fiadoLancamentos.cliente_id, clienteId), eq(fiadoLancamentos.loja_id, lojaId)));
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));
  const paginaAtual = Math.min(Math.max(1, pagina), paginas);
  const offset = (paginaAtual - 1) * limite;

  const pedidoCodigoExp = sql<string | null>`coalesce(nullif(${pedidos.codigo}, ''), ${pedidos.id}::text)`;

  const linhas = await db
    .select({
      id: fiadoLancamentos.id,
      tipo: fiadoLancamentos.tipo,
      valor: fiadoLancamentos.valor,
      saldoAntes: fiadoLancamentos.saldo_antes,
      saldoDepois: fiadoLancamentos.saldo_depois,
      observacao: fiadoLancamentos.observacao,
      criadoEm: fiadoLancamentos.criado_em,
      pedidoId: fiadoLancamentos.pedido_id,
      pedidoCodigo: pedidoCodigoExp,
      formaPagamento: fiadoLancamentos.forma_pagamento,
      operadorNome: admins.nome,
    })
    .from(fiadoLancamentos)
    .leftJoin(pedidos, and(eq(pedidos.id, fiadoLancamentos.pedido_id), eq(pedidos.loja_id, fiadoLancamentos.loja_id)))
    .leftJoin(admins, eq(admins.id, fiadoLancamentos.operador_id))
    .where(and(eq(fiadoLancamentos.cliente_id, clienteId), eq(fiadoLancamentos.loja_id, lojaId)))
    .orderBy(desc(fiadoLancamentos.id))
    .limit(limite)
    .offset(offset);

  return {
    ok: true,
    cliente,
    lancamentos: linhas,
    pagina: paginaAtual,
    paginas,
    total: totalNum,
  };
}

export async function registrarFiado(lojaId: number, operadorId: number, clienteId: number, valorInput: number, observacaoInput: string): Promise<{ ok: true; saldoFiado: number } | { ok: false; msg: string }> {
  const valor = Math.round(valorInput * 100) / 100;
  const observacao = observacaoInput.trim();

  if (clienteId <= 0) return { ok: false, msg: "Selecione um cliente." };
  if (valor <= 0) return { ok: false, msg: "Informe um valor valido." };

  const [cliente] = await db.select({ saldoFiado: clientes.saldo_fiado }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!cliente) return { ok: false, msg: "Cliente nao encontrado." };

  const saldoAntes = cliente.saldoFiado;
  const saldoDepois = saldoAntes + valor;

  await withTransaction(async (tx) => {
    await tx.update(clientes).set({ saldo_fiado: saldoDepois }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
    await tx.insert(fiadoLancamentos).values({
      loja_id: lojaId,
      cliente_id: clienteId,
      pedido_id: null,
      operador_id: operadorId,
      tipo: "venda",
      valor,
      saldo_antes: saldoAntes,
      saldo_depois: saldoDepois,
      observacao: observacao !== "" ? observacao : null,
    });
  });

  return { ok: true, saldoFiado: saldoDepois };
}

export async function registrarPagamentoFiado(lojaId: number, operadorId: number, clienteId: number, valorInput: number, formaPagamentoInput: string, observacaoInput: string): Promise<{ ok: true; saldoFiado: number } | { ok: false; msg: string }> {
  const valor = Math.round(valorInput * 100) / 100;
  const formaPagamento = formaPagamentoInput.trim();
  const observacao = observacaoInput.trim();

  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };
  if (valor <= 0) return { ok: false, msg: "Informe um valor valido." };

  const [cliente] = await db.select({ saldoFiado: clientes.saldo_fiado, nome: clientes.nome }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!cliente) return { ok: false, msg: "Cliente nao encontrado." };

  const saldoAntes = cliente.saldoFiado;
  if (valor > saldoAntes + LIMIAR_SALDO) return { ok: false, msg: "O valor do pagamento nao pode ser maior que o saldo devedor." };

  const saldoDepois = Math.max(0, saldoAntes - valor);
  const formaFinal = formaPagamento !== "" ? formaPagamento : "outro";

  let fiadoLancamentoId = 0;
  await withTransaction(async (tx) => {
    await tx.update(clientes).set({ saldo_fiado: saldoDepois }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
    const [nova] = await tx
      .insert(fiadoLancamentos)
      .values({
        loja_id: lojaId,
        cliente_id: clienteId,
        pedido_id: null,
        operador_id: operadorId,
        tipo: "pagamento",
        forma_pagamento: formaFinal,
        valor,
        saldo_antes: saldoAntes,
        saldo_depois: saldoDepois,
        observacao: observacao !== "" ? observacao : null,
      })
      .returning({ id: fiadoLancamentos.id });
    fiadoLancamentoId = nova.id;
  });

  try {
    await recordFiadoPayment(lojaId, {
      forma: formaFinal,
      valor,
      data: dataFortaleza(),
      clienteNome: cliente.nome ?? "",
      fiadoLancamentoId,
    });
  } catch {
    // best-effort, igual ao PHP: erro na integracao financeira nao desfaz o pagamento
  }

  return { ok: true, saldoFiado: saldoDepois };
}
