import "server-only";
import { and, eq, ne, gte, ilike, or, sql, desc } from "drizzle-orm";
import { db, withTransaction } from "@/db";
import { clientes, pedidos, avaliacoes, cashbackMovimentacoes, pontosMovimentacoes, fiadoLancamentos, mesas, listasTransmissaoMembros } from "@/db/schema";
import { apenasDigitos, formatarTelefoneBR, telefoneSemMascara } from "@/db/queries/telefone";
import { dataLoja, timestampLoja } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/clientes_listar.php, cliente_detalhe.php,
 * cliente_criar.php, cliente_atualizar.php e cliente_stats.php: CRM de
 * clientes (grid, modal de cadastro/edicao e perfil no Gestor de Pedidos).
 */

function montarEndereco(input: { rua: string; numero: string; bairro: string; cidade: string; estado: string; cep: string; complemento: string; enderecoInput: string }): string {
  const partes: string[] = [];
  if (input.rua !== "") partes.push(input.numero !== "" ? `${input.rua}, ${input.numero}` : input.rua);
  if (input.bairro !== "") partes.push(input.bairro);
  const cidadeEstado = `${input.cidade}${input.estado ? ` / ${input.estado}` : ""}`.trim();
  if (cidadeEstado !== "") partes.push(cidadeEstado);
  if (input.cep !== "") partes.push(input.cep);
  if (input.complemento !== "") partes.push(input.complemento);
  const texto = partes.join(" - ").trim();
  return texto !== "" ? texto : input.enderecoInput;
}

async function clienteTelefoneExiste(telefone: string, lojaId: number, excluirId = 0): Promise<number> {
  const digitos = apenasDigitos(telefone);
  if (digitos.length < 8) return 0;
  const condBase = and(eq(clientes.loja_id, lojaId), or(eq(telefoneSemMascara, digitos), eq(clientes.telefone, telefone)));
  const cond = excluirId > 0 ? and(condBase, ne(clientes.id, excluirId)) : condBase;
  const [linha] = await db.select({ id: clientes.id }).from(clientes).where(cond).limit(1);
  return linha?.id ?? 0;
}

export type ClienteListagem = {
  id: number;
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
  aniversario: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  complemento: string | null;
  criadoEm: string | null;
  cashbackSaldo: number;
  pontosSaldo: number;
  saldoFiado: number;
  totalPedidos: number;
  totalGasto: number;
  enderecoTexto: string;
};

export type ListarClientesResultado = { clientes: ClienteListagem[]; total: number; paginas: number; pagina: number };

function enderecoTexto(c: { rua: string | null; numero: string | null; bairro: string | null; cidade: string | null; estado: string | null; cep: string | null; complemento: string | null; endereco: string | null }): string {
  const rua = (c.rua ?? "").trim();
  const numero = (c.numero ?? "").trim();
  const bairro = (c.bairro ?? "").trim();
  const cidade = (c.cidade ?? "").trim();
  const estado = (c.estado ?? "").trim();
  const cep = (c.cep ?? "").trim();
  const complemento = (c.complemento ?? "").trim();

  const partes: string[] = [];
  if (rua !== "") partes.push(numero !== "" ? `${rua}, ${numero}` : rua);
  if (bairro !== "") partes.push(bairro);
  const cidadeEstado = `${cidade}${estado ? ` / ${estado}` : ""}`.trim();
  if (cidadeEstado !== "") partes.push(cidadeEstado);
  if (cep !== "") partes.push(cep);
  if (complemento !== "") partes.push(complemento);

  const texto = partes.join(" - ");
  return texto !== "" ? texto : (c.endereco ?? "-");
}

export async function listarClientes(lojaId: number, busca: string, pagina: number): Promise<ListarClientesResultado> {
  const buscaLimpa = busca.trim();
  const paginaAtual = Math.max(1, pagina);
  const limite = 10;
  const offset = (paginaAtual - 1) * limite;

  const buscaTel = apenasDigitos(buscaLimpa);
  let condicao = eq(clientes.loja_id, lojaId);
  if (buscaLimpa !== "") {
    const partes = [ilike(clientes.nome, `%${buscaLimpa}%`)];
    if (buscaTel !== "") partes.push(ilike(telefoneSemMascara, `%${buscaTel}%`));
    condicao = and(eq(clientes.loja_id, lojaId), or(...partes))!;
  }

  const [{ total }] = await db.select({ total: sql<string>`count(*)` }).from(clientes).where(condicao);
  const totalNum = Number(total);
  const paginas = Math.max(1, Math.ceil(totalNum / limite));

  const totalGastoExp = sql<string>`coalesce(sum(${pedidos.total}) filter (where ${pedidos.status} = 'finalizado'), 0)`;
  const totalPedidosExp = sql<string>`count(${pedidos.id}) filter (where ${pedidos.status} = 'finalizado')`;

  const linhas = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      endereco: clientes.endereco,
      aniversario: clientes.aniversario,
      cep: clientes.cep,
      rua: clientes.rua,
      numero: clientes.numero,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      estado: clientes.estado,
      complemento: clientes.complemento,
      criadoEm: clientes.criado_em,
      cashbackSaldo: clientes.cashback_saldo,
      pontosSaldo: clientes.pontos_saldo,
      saldoFiado: clientes.saldo_fiado,
      totalPedidos: totalPedidosExp,
      totalGasto: totalGastoExp,
    })
    .from(clientes)
    .leftJoin(pedidos, and(eq(pedidos.cliente_id, clientes.id), eq(pedidos.loja_id, clientes.loja_id)))
    .where(condicao)
    .groupBy(clientes.id)
    .orderBy(desc(totalGastoExp))
    .limit(limite)
    .offset(offset);

  const clientesResultado: ClienteListagem[] = linhas.map((l) => ({
    ...l,
    totalPedidos: Number(l.totalPedidos),
    totalGasto: Number(l.totalGasto),
    enderecoTexto: enderecoTexto(l),
  }));

  return { clientes: clientesResultado, total: totalNum, paginas, pagina: paginaAtual };
}

export type ClienteDetalhe = {
  id: number;
  nome: string | null;
  telefone: string | null;
  endereco: string | null;
  aniversario: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  complemento: string | null;
};

export async function clienteDetalhe(lojaId: number, clienteId: number): Promise<{ ok: true; cliente: ClienteDetalhe } | { ok: false; msg: string }> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };
  const [linha] = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      endereco: clientes.endereco,
      aniversario: clientes.aniversario,
      cep: clientes.cep,
      rua: clientes.rua,
      numero: clientes.numero,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      estado: clientes.estado,
      complemento: clientes.complemento,
    })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)))
    .limit(1);
  if (!linha) return { ok: false, msg: "Cliente nao encontrado." };
  return { ok: true, cliente: linha };
}

export type ClienteInput = {
  nome: string;
  telefone: string;
  aniversario?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  endereco?: string;
};

export async function criarCliente(lojaId: number, input: ClienteInput): Promise<{ ok: true; id: number } | { ok: false; msg: string; clienteId?: number }> {
  const nome = input.nome.trim();
  const telefone = formatarTelefoneBR(input.telefone.trim());
  const aniversario = (input.aniversario ?? "").trim();
  const cep = (input.cep ?? "").trim();
  const rua = (input.rua ?? "").trim();
  const numero = (input.numero ?? "").trim();
  const bairro = (input.bairro ?? "").trim();
  const cidade = (input.cidade ?? "").trim();
  const estado = (input.estado ?? "").trim();
  const complemento = (input.complemento ?? "").trim();
  const enderecoInput = (input.endereco ?? "").trim();

  if (nome === "") return { ok: false, msg: "Nome e obrigatorio." };

  const endereco = montarEndereco({ rua, numero, bairro, cidade, estado, cep, complemento, enderecoInput });

  const duplicado = await clienteTelefoneExiste(telefone, lojaId);
  if (duplicado > 0) return { ok: false, msg: "Ja existe um cliente cadastrado com esse numero de telefone.", clienteId: duplicado };

  const [nova] = await db
    .insert(clientes)
    .values({ criado_em: await timestampLoja(lojaId),
      nome,
      telefone,
      endereco: endereco || null,
      aniversario: aniversario !== "" ? aniversario : null,
      cep: cep !== "" ? cep : null,
      rua: rua !== "" ? rua : null,
      numero: numero !== "" ? numero : null,
      bairro: bairro !== "" ? bairro : null,
      cidade: cidade !== "" ? cidade : null,
      estado: estado !== "" ? estado : null,
      complemento: complemento !== "" ? complemento : null,
      loja_id: lojaId,
    })
    .returning({ id: clientes.id });

  return { ok: true, id: nova.id };
}

export async function atualizarCliente(lojaId: number, id: number, input: ClienteInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const nome = input.nome.trim();
  const telefone = formatarTelefoneBR(input.telefone.trim());
  const aniversario = (input.aniversario ?? "").trim();
  const cep = (input.cep ?? "").trim();
  const rua = (input.rua ?? "").trim();
  const numero = (input.numero ?? "").trim();
  const bairro = (input.bairro ?? "").trim();
  const cidade = (input.cidade ?? "").trim();
  const estado = (input.estado ?? "").trim();
  const complemento = (input.complemento ?? "").trim();
  const enderecoInput = (input.endereco ?? "").trim();

  if (!id || nome === "" || telefone === "") return { ok: false, msg: "Dados invalidos." };

  const endereco = montarEndereco({ rua, numero, bairro, cidade, estado, cep, complemento, enderecoInput });

  const duplicado = await clienteTelefoneExiste(telefone, lojaId, id);
  if (duplicado > 0) return { ok: false, msg: "Ja existe outro cliente com esse numero de telefone." };

  await db
    .update(clientes)
    .set({
      nome,
      telefone,
      endereco: endereco || null,
      aniversario: aniversario !== "" ? aniversario : null,
      cep: cep !== "" ? cep : null,
      rua: rua !== "" ? rua : null,
      numero: numero !== "" ? numero : null,
      bairro: bairro !== "" ? bairro : null,
      cidade: cidade !== "" ? cidade : null,
      estado: estado !== "" ? estado : null,
      complemento: complemento !== "" ? complemento : null,
    })
    .where(and(eq(clientes.id, id), eq(clientes.loja_id, lojaId)));

  return { ok: true };
}

/** Atualiza so o endereco do cliente (usado ao confirmar a entrega no PDV). Mantem o estado ja cadastrado. */
export async function salvarEnderecoCliente(
  lojaId: number,
  clienteId: number,
  e: { rua: string; numero: string; bairro: string; cidade: string; cep: string; complemento: string }
): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (!clienteId) return { ok: false, msg: "Cliente invalido." };
  const rua = (e.rua ?? "").trim();
  if (rua === "") return { ok: false, msg: "Informe a rua." };
  const [atual] = await db.select({ estado: clientes.estado }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!atual) return { ok: false, msg: "Cliente nao encontrado." };
  const numero = (e.numero ?? "").trim();
  const bairro = (e.bairro ?? "").trim();
  const cidade = (e.cidade ?? "").trim();
  const cep = (e.cep ?? "").trim();
  const complemento = (e.complemento ?? "").trim();
  const estado = (atual.estado ?? "").trim();
  const endereco = montarEndereco({ rua, numero, bairro, cidade, estado, cep, complemento, enderecoInput: "" });
  await db
    .update(clientes)
    .set({
      endereco: endereco || null,
      rua,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
      cep: cep || null,
      complemento: complemento || null,
    })
    .where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
  return { ok: true };
}

export type ClienteStats = {
  nome: string;
  telefone: string;
  email: string;
  nivel: string;
  endereco: { rua: string; numero: string; bairro: string; cidade: string; estado: string; complemento: string; cep: string };
  aniversario: string;
  criadoEm: string;
  cashback: number;
  pontos: number;
  saldoFiado: number;
  ticketMedio: number;
  ultimoPedido: string | null;
  pedidosFeitos: number;
  avaliacaoMedia: number | null;
  cashbackValidoAte: string | null;
  bloqueado: boolean;
};

export async function clienteStats(lojaId: number, clienteId: number): Promise<{ ok: true; stats: ClienteStats } | { ok: false; msg: string }> {
  if (clienteId <= 0) return { ok: false, msg: "Cliente invalido." };

  const [cliente] = await db
    .select({
      nome: clientes.nome,
      telefone: clientes.telefone,
      email: clientes.email,
      nivel: clientes.nivel,
      rua: clientes.rua,
      numero: clientes.numero,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      estado: clientes.estado,
      complemento: clientes.complemento,
      cep: clientes.cep,
      endereco: clientes.endereco,
      aniversario: clientes.aniversario,
      criadoEm: clientes.criado_em,
      cashbackSaldo: clientes.cashback_saldo,
      pontosSaldo: clientes.pontos_saldo,
      saldoFiado: clientes.saldo_fiado,
      bloqueadoEm: clientes.bloqueado_em,
    })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)))
    .limit(1);
  if (!cliente) return { ok: false, msg: "Cliente nao encontrado." };

  const [statsPedidos] = await db
    .select({
      total: sql<string>`count(*)`,
      gasto: sql<string>`coalesce(sum(${pedidos.total}), 0)`,
      ultimo: sql<string | null>`max(${pedidos.criado_em})`,
    })
    .from(pedidos)
    .where(and(eq(pedidos.cliente_id, clienteId), eq(pedidos.loja_id, lojaId), ne(pedidos.status, "cancelado")));

  const totalPed = Number(statsPedidos?.total ?? 0);
  const totalGasto = Number(statsPedidos?.gasto ?? 0);
  const ticketMedio = totalPed > 0 ? totalGasto / totalPed : 0;
  const ultimoPedido = statsPedidos?.ultimo ?? null;

  const [avRow] = await db.select({ media: sql<string | null>`avg(${avaliacoes.nota})` }).from(avaliacoes).where(and(eq(avaliacoes.cliente_id, clienteId), eq(avaliacoes.loja_id, lojaId)));
  const avaliacaoMedia = avRow?.media !== null && avRow?.media !== undefined ? Math.round(Number(avRow.media) * 10) / 10 : null;

  // Data de expiracao mais proxima entre as entradas de cashback ainda validas — so uma
  // estimativa pra exibir ao operador (nao rastreia qual parcela especifica compoe o saldo
  // atual), mas e a mesma logica "mais proximo vence primeiro" usada no resto do sistema.
  let cashbackValidoAte: string | null = null;
  if (cliente.cashbackSaldo > 0) {
    const [proximaExpiracao] = await db
      .select({ expiraEm: sql<string | null>`min(${cashbackMovimentacoes.expira_em})` })
      .from(cashbackMovimentacoes)
      .where(
        and(
          eq(cashbackMovimentacoes.cliente_id, clienteId),
          eq(cashbackMovimentacoes.loja_id, lojaId),
          eq(cashbackMovimentacoes.tipo, "entrada"),
          gte(cashbackMovimentacoes.expira_em, (await dataLoja(lojaId)))
        )
      );
    cashbackValidoAte = proximaExpiracao?.expiraEm ?? null;
  }

  return {
    ok: true,
    stats: {
      nome: cliente.nome ?? "",
      telefone: cliente.telefone ?? "",
      email: cliente.email ?? "",
      nivel: cliente.nivel ?? "",
      endereco: {
        rua: (cliente.rua ?? cliente.endereco ?? "").trim(),
        numero: (cliente.numero ?? "").trim(),
        bairro: (cliente.bairro ?? "").trim(),
        cidade: (cliente.cidade ?? "").trim(),
        estado: (cliente.estado ?? "").trim(),
        complemento: (cliente.complemento ?? "").trim(),
        cep: (cliente.cep ?? "").trim(),
      },
      aniversario: cliente.aniversario ?? "",
      criadoEm: cliente.criadoEm ?? "",
      cashback: Math.round(cliente.cashbackSaldo * 100) / 100,
      pontos: cliente.pontosSaldo,
      saldoFiado: cliente.saldoFiado,
      ticketMedio: Math.round(ticketMedio * 100) / 100,
      ultimoPedido,
      pedidosFeitos: totalPed,
      avaliacaoMedia,
      cashbackValidoAte,
      bloqueado: cliente.bloqueadoEm !== null,
    },
  };
}

/** Bloqueia (ou desbloqueia) o cliente: bloqueado, ele nao consegue fazer pedidos pelo cardapio da loja. */
/*
 * Exclui o cliente da loja. Para nao quebrar relatorios nem o financeiro, so e permitido quando ele
 * nao tem pedidos, nao tem movimentacao de fiado e nao esta ligado a uma mesa (Modo Garcom). Nesses
 * casos a resposta sugere bloquear. Os registros que so existem por causa dele (cashback, pontos,
 * avaliacoes sem pedido, listas de transmissao) saem junto, na mesma transacao.
 */
export async function excluirCliente(lojaId: number, clienteId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (!clienteId) return { ok: false, msg: "Cliente invalido." };
  const doCliente = (col: typeof pedidos.cliente_id) => sql`${col} = ${clienteId}`;

  const [[existe], [ped], [fia], mesasDoCliente] = await Promise.all([
    db.select({ id: clientes.id, saldoFiado: clientes.saldo_fiado }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1),
    db.select({ n: sql<number>`count(*)::int` }).from(pedidos).where(and(eq(pedidos.loja_id, lojaId), doCliente(pedidos.cliente_id))),
    db.select({ n: sql<number>`count(*)::int` }).from(fiadoLancamentos).where(and(eq(fiadoLancamentos.loja_id, lojaId), eq(fiadoLancamentos.cliente_id, clienteId))),
    db.select({ nome: mesas.nome }).from(mesas).where(and(eq(mesas.loja_id, lojaId), eq(mesas.cliente_id, clienteId))),
  ]);
  if (!existe) return { ok: false, msg: "Cliente não encontrado." };

  const bloqueie = "Para impedir novos pedidos, use \"Bloquear cliente\".";
  if (mesasDoCliente.length > 0) return { ok: false, msg: `Este cadastro é usado pela ${mesasDoCliente.map((m) => m.nome).join(", ")} no Modo Garçom e não pode ser excluído.` };
  if (Number(ped?.n ?? 0) > 0) {
    const n = Number(ped.n);
    return { ok: false, msg: `Este cliente tem ${n} ${n === 1 ? "pedido" : "pedidos"} no histórico e não pode ser excluído, para manter os relatórios corretos. ${bloqueie}` };
  }
  if (Number(existe.saldoFiado ?? 0) > 0.009 || Number(fia?.n ?? 0) > 0) {
    return { ok: false, msg: `Este cliente tem movimentação de fiado e não pode ser excluído. ${bloqueie}` };
  }

  await withTransaction(async (tx) => {
    await tx.delete(cashbackMovimentacoes).where(and(eq(cashbackMovimentacoes.loja_id, lojaId), eq(cashbackMovimentacoes.cliente_id, clienteId)));
    await tx.delete(pontosMovimentacoes).where(and(eq(pontosMovimentacoes.loja_id, lojaId), eq(pontosMovimentacoes.cliente_id, clienteId)));
    await tx.delete(avaliacoes).where(and(eq(avaliacoes.loja_id, lojaId), eq(avaliacoes.cliente_id, clienteId)));
    await tx.delete(listasTransmissaoMembros).where(eq(listasTransmissaoMembros.cliente_id, clienteId));
    await tx.delete(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
  });
  return { ok: true };
}

export async function definirBloqueioCliente(
  lojaId: number,
  clienteId: number,
  bloquear: boolean
): Promise<{ ok: true; bloqueado: boolean } | { ok: false; msg: string }> {
  if (!clienteId) return { ok: false, msg: "Cliente invalido." };
  const linhas = await db
    .update(clientes)
    .set({ bloqueado_em: bloquear ? await timestampLoja(lojaId) : null })
    .where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)))
    .returning({ id: clientes.id });
  if (linhas.length === 0) return { ok: false, msg: "Cliente nao encontrado." };
  return { ok: true, bloqueado: bloquear };
}
