import "server-only";
import { and, eq, ne, inArray, isNotNull, notInArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, withTransaction, type NeonTx } from "@/db";
import { mesas, garcons, pedidos, pedidoItens, produtos, estoque, clientes } from "@/db/schema";
import { getConfig, getConfigs } from "@/db/queries/config";
import { fixImgPath } from "@/db/queries/lojaPerfil";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";
import { dataFortaleza, timestampFortaleza } from "@/db/queries/tempo";
import { reservaMapaPdv, aplicarReservaPdv } from "@/db/queries/pdvReservas";
import { baixarEstoque, registrarComponentesCombo } from "@/db/queries/estoqueVinculo";

/*
 * Equivalente de admin/api/v1/modo_garcom_detalhe.php, modo_garcom_stats.php,
 * mesas_salvar.php, mesas_excluir.php, mesas_toggle.php, mesas_pedidos.php,
 * garcons_salvar.php, garcons_gerar_codigo.php, garcons_excluir.php e
 * garcons_toggle.php: gestao de Mesas e Garcons pelo lojista (/waitermode).
 *
 * So o lado ADMIN (dono da loja gerenciando mesas/garcons) — o app do
 * garcom em si (public/garcom.php, login e lancamento de pedidos) fica fora
 * do escopo desta migracao, que cobre o painel administrativo.
 *
 * O DDL condicional de garcomEnsureModule (colunas pedidos.mesa_id/garcom_id,
 * ENUM de pedidos.tipo com 'mesa') foi omitido: o schema Neon ja garante
 * tudo isso. A migracao pontual de permissoes ("quem tinha menu.motoboys
 * ganha menu.modo_garcom") tambem foi omitida por ser um backfill de
 * instalacoes antigas, nao logica de um endpoint.
 */

const ALFABETO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function gerarCodigoAcesso(): string {
  let codigo = "";
  for (let i = 0; i < 5; i++) codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  return codigo;
}

/** Cliente-placeholder da mesa (cria se ainda nao existir) — pedidos_kanban usa INNER JOIN com clientes. */
export async function clienteDaMesa(mesaId: number, nomeMesa: string, lojaId: number): Promise<number> {
  const [linha] = await db.select({ clienteId: mesas.cliente_id }).from(mesas).where(and(eq(mesas.id, mesaId), eq(mesas.loja_id, lojaId))).limit(1);
  if (linha?.clienteId) return linha.clienteId;

  const [novoCliente] = await db.insert(clientes).values({ nome: nomeMesa, telefone: "", loja_id: lojaId }).returning({ id: clientes.id });
  await db.update(mesas).set({ cliente_id: novoCliente.id }).where(and(eq(mesas.id, mesaId), eq(mesas.loja_id, lojaId)));
  return novoCliente.id;
}

function resolverSlugLoja(linkLojaCfg: string, nomeLojaCfg: string): string {
  let slug = "";
  if (linkLojaCfg) {
    const mParam = linkLojaCfg.match(/[?&]loja=([^&]+)/);
    const mPath = linkLojaCfg.match(/\/([^/?]+)\/?$/);
    if (mParam) slug = decodeURIComponent(mParam[1]);
    else if (mPath) slug = mPath[1];
    else slug = linkLojaCfg.replace(/^\/+|\/+$/g, "");
    slug = slug.replace(/\.php$/i, "");
  }
  if (slug === "") {
    slug = nomeLojaCfg
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return slug;
}

export type MesaDetalhe = { id: number; nome: string; ativo: boolean; criadoEm: string; temPedidoAberto: boolean };
export type GarcomDetalhe = { id: number; nome: string; email: string; ativo: boolean; criadoEm: string };

export type DetalheModoGarcomResultado = {
  mesas: MesaDetalhe[];
  garcons: GarcomDetalhe[];
  pedidosPendentes: number;
  mesasAtivas: number;
  garconsAtivos: number;
  garcomLoginUrl: string;
  cardapioUrl: string;
};

export async function detalheModoGarcom(lojaId: number, protocoloHost: string): Promise<DetalheModoGarcomResultado> {
  const mesasRaw = await db.select({ id: mesas.id, nome: mesas.nome, ativo: mesas.ativo, criadoEm: mesas.criado_em }).from(mesas).where(eq(mesas.loja_id, lojaId)).orderBy(mesas.nome);

  const pedidosAbertosPorMesa = await db
    .select({ mesaId: pedidos.mesa_id, qtd: sql<string>`count(*)` })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), notInArray(pedidos.status, ["finalizado", "cancelado"])))
    .groupBy(pedidos.mesa_id);
  const mapaAbertos = new Map(pedidosAbertosPorMesa.map((p) => [p.mesaId, Number(p.qtd)]));

  const garconsRaw = await db.select({ id: garcons.id, nome: garcons.nome, email: garcons.email, ativo: garcons.ativo, criadoEm: garcons.criado_em }).from(garcons).where(eq(garcons.loja_id, lojaId)).orderBy(garcons.nome);

  const [{ n: pedidosPendentesCount }] = await db
    .select({ n: sql<string>`count(*)` })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), eq(pedidos.status, "pendente")));

  const mesasAtivasCount = mesasRaw.filter((m) => m.ativo).length;
  const garconsAtivosCount = garconsRaw.filter((g) => g.ativo).length;

  const nomeLojaCfg = await getConfig(lojaId, "nome_loja", "");
  const linkLojaCfg = await getConfig(lojaId, "link_loja", "");
  const slug = resolverSlugLoja(linkLojaCfg, nomeLojaCfg);

  const garcomLoginUrl = slug !== "" ? `${protocoloHost}/${encodeURIComponent(slug)}/garcom_login` : `${protocoloHost}/public/garcom_login.php?loja_id=${lojaId}`;
  const cardapioUrl = slug !== "" ? `${protocoloHost}/${encodeURIComponent(slug)}` : `${protocoloHost}/public/loja.php?loja_id=${lojaId}`;

  return {
    mesas: mesasRaw.map((m) => ({ id: m.id, nome: m.nome, ativo: m.ativo, criadoEm: m.criadoEm, temPedidoAberto: (mapaAbertos.get(m.id) ?? 0) > 0 })),
    garcons: garconsRaw,
    pedidosPendentes: Number(pedidosPendentesCount),
    mesasAtivas: mesasAtivasCount,
    garconsAtivos: garconsAtivosCount,
    garcomLoginUrl,
    cardapioUrl,
  };
}

export type StatsModoGarcomResultado = { pedidosPendentes: number; mesasAtivas: number; garconsAtivos: number };

export async function statsModoGarcom(lojaId: number): Promise<StatsModoGarcomResultado> {
  const hoje = dataFortaleza();

  const [{ n: pedidosPendentes }] = await db
    .select({ n: sql<string>`count(*)` })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), eq(pedidos.status, "pendente"), sql`${pedidos.criado_em}::date = ${hoje}::date`));

  const [{ n: mesasAtivas }] = await db.select({ n: sql<string>`count(*)` }).from(mesas).where(and(eq(mesas.loja_id, lojaId), eq(mesas.ativo, true)));
  const [{ n: garconsAtivos }] = await db.select({ n: sql<string>`count(*)` }).from(garcons).where(and(eq(garcons.loja_id, lojaId), eq(garcons.ativo, true)));

  return { pedidosPendentes: Number(pedidosPendentes), mesasAtivas: Number(mesasAtivas), garconsAtivos: Number(garconsAtivos) };
}

export async function salvarMesa(lojaId: number, id: number, nomeInput: string): Promise<{ ok: true; id: number } | { ok: false; msg: string }> {
  const nome = nomeInput.trim();
  if (nome === "") return { ok: false, msg: "Informe o nome da mesa." };

  if (id > 0) {
    await db.update(mesas).set({ nome }).where(and(eq(mesas.id, id), eq(mesas.loja_id, lojaId)));
    return { ok: true, id };
  }

  const [nova] = await db.insert(mesas).values({ loja_id: lojaId, nome, ativo: true }).returning({ id: mesas.id });
  await clienteDaMesa(nova.id, nome, lojaId);

  return { ok: true, id: nova.id };
}

export async function excluirMesa(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Mesa inválida." };

  const [{ n: abertos }] = await db.select({ n: sql<string>`count(*)` }).from(pedidos).where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.mesa_id, id), notInArray(pedidos.status, ["finalizado", "cancelado"])));
  if (Number(abertos) > 0) return { ok: false, msg: "Essa mesa tem um pedido em aberto e não pode ser excluída." };

  await db.delete(mesas).where(and(eq(mesas.id, id), eq(mesas.loja_id, lojaId)));
  return { ok: true };
}

export async function toggleMesa(lojaId: number, id: number, ativo: boolean | null): Promise<{ ok: boolean }> {
  if (id <= 0 || ativo === null) return { ok: false };
  await db.update(mesas).set({ ativo }).where(and(eq(mesas.id, id), eq(mesas.loja_id, lojaId)));
  return { ok: true };
}

export type PedidoMesa = { id: number; codigo: number; status: string; total: number; criadoEm: string | null; mesaId: number | null; mesaNome: string | null; garcomId: number | null; garcomNome: string | null };

export async function pedidosMesas(lojaId: number): Promise<PedidoMesa[]> {
  const hoje = dataFortaleza();

  const linhas = await db
    .select({ id: pedidos.id, status: pedidos.status, total: pedidos.total, criadoEm: pedidos.criado_em, mesaId: pedidos.mesa_id, mesaNome: mesas.nome, garcomId: pedidos.garcom_id, garcomNome: garcons.nome })
    .from(pedidos)
    .leftJoin(mesas, and(eq(mesas.id, pedidos.mesa_id), eq(mesas.loja_id, pedidos.loja_id)))
    .leftJoin(garcons, and(eq(garcons.id, pedidos.garcom_id), eq(garcons.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), sql`${pedidos.criado_em}::date = ${hoje}::date`))
    .orderBy(sql`${pedidos.id} desc`)
    .limit(200);

  const base = await pedidoCodigoBase(lojaId);

  return linhas.map((p) => ({ id: p.id, codigo: codigoDisplay(p.id, base), status: p.status, total: Number(p.total ?? 0), criadoEm: p.criadoEm, mesaId: p.mesaId, mesaNome: p.mesaNome, garcomId: p.garcomId, garcomNome: p.garcomNome }));
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function salvarGarcom(lojaId: number, id: number, nomeInput: string, emailInput: string): Promise<{ ok: true; id: number; codigoAcesso?: string } | { ok: false; msg: string }> {
  const nome = nomeInput.trim();
  const email = emailInput.trim();

  if (nome === "") return { ok: false, msg: "Informe o nome do garçom." };
  if (email === "" || !RE_EMAIL.test(email)) return { ok: false, msg: "Informe um e-mail válido." };

  const condDup = id > 0 ? and(eq(garcons.loja_id, lojaId), eq(garcons.email, email), ne(garcons.id, id)) : and(eq(garcons.loja_id, lojaId), eq(garcons.email, email));
  const [dup] = await db.select({ id: garcons.id }).from(garcons).where(condDup).limit(1);
  if (dup) return { ok: false, msg: "Já existe um garçom com esse e-mail." };

  if (id > 0) {
    await db.update(garcons).set({ nome, email }).where(and(eq(garcons.id, id), eq(garcons.loja_id, lojaId)));
    return { ok: true, id };
  }

  const codigo = gerarCodigoAcesso();
  const hash = await bcrypt.hash(codigo, 10);

  const [novo] = await db.insert(garcons).values({ loja_id: lojaId, nome, email, codigo_acesso_hash: hash, ativo: true }).returning({ id: garcons.id });

  return { ok: true, id: novo.id, codigoAcesso: codigo };
}

export async function gerarCodigoGarcom(lojaId: number, id: number): Promise<{ ok: true; codigoAcesso: string } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Garçom inválido." };

  const [existe] = await db.select({ id: garcons.id }).from(garcons).where(and(eq(garcons.id, id), eq(garcons.loja_id, lojaId))).limit(1);
  if (!existe) return { ok: false, msg: "Garçom não encontrado." };

  const codigo = gerarCodigoAcesso();
  const hash = await bcrypt.hash(codigo, 10);
  await db.update(garcons).set({ codigo_acesso_hash: hash }).where(and(eq(garcons.id, id), eq(garcons.loja_id, lojaId)));

  return { ok: true, codigoAcesso: codigo };
}

export async function excluirGarcom(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Garçom inválido." };
  await db.delete(garcons).where(and(eq(garcons.id, id), eq(garcons.loja_id, lojaId)));
  return { ok: true };
}

export async function toggleGarcom(lojaId: number, id: number, ativo: boolean | null): Promise<{ ok: boolean }> {
  if (id <= 0 || ativo === null) return { ok: false };
  await db.update(garcons).set({ ativo }).where(and(eq(garcons.id, id), eq(garcons.loja_id, lojaId)));
  return { ok: true };
}

/*
 * A partir daqui: o app do garcom em si (public/garcom_login.php,
 * public/garcom.php e as APIs public/api/garcom_*.php) — a parte que ficou
 * de fora do escopo original desta migracao (ver comentario no topo do
 * arquivo) e que precisou ser portada quando o PHP saiu do ar.
 */

export type PerfilGarcomLoja = { nomeLoja: string; logoUrl: string; temaCorMenu: string; dinAtivo: boolean; pixAtivo: boolean; credAtivo: boolean; debAtivo: boolean };

/** Equivalente ao SELECT de configuracoes no topo de public/garcom.php. */
export async function perfilGarcomLoja(lojaId: number, baseUrl: string): Promise<PerfilGarcomLoja> {
  const cfg = await getConfigs(lojaId, ["nome_loja", "loja_perfil", "tema_cor_menu", "pagamento_dinheiro_ativo", "pagamento_pix_ativo", "pagamento_credito_ativo", "pagamento_debito_ativo"]);
  return {
    nomeLoja: cfg.nome_loja || "Loja",
    logoUrl: fixImgPath(cfg.loja_perfil, baseUrl),
    temaCorMenu: cfg.tema_cor_menu || "#e63770",
    dinAtivo: cfg.pagamento_dinheiro_ativo !== "0",
    pixAtivo: cfg.pagamento_pix_ativo !== "0",
    credAtivo: cfg.pagamento_credito_ativo !== "0",
    debAtivo: cfg.pagamento_debito_ativo !== "0",
  };
}

export type MesaGarcom = { id: number; nome: string };

/** Mesas ativas pro seletor do garcom (public/garcom.php: "SELECT id, nome FROM mesas WHERE ativo=1"). */
export async function mesasAtivasGarcom(lojaId: number): Promise<MesaGarcom[]> {
  return db.select({ id: mesas.id, nome: mesas.nome }).from(mesas).where(and(eq(mesas.loja_id, lojaId), eq(mesas.ativo, true))).orderBy(mesas.nome);
}

export type PedidoAbertoGarcom = { id: number; codigo: number; status: string; total: number; criadoEm: string | null; mesaNome: string | null; itensResumo: string };

/** Equivalente de public/api/garcom_pedidos_abertos.php — pedidos de mesa ainda nao finalizados/cancelados. */
export async function pedidosAbertosGarcom(lojaId: number): Promise<PedidoAbertoGarcom[]> {
  const linhas = await db
    .select({ id: pedidos.id, status: pedidos.status, total: pedidos.total, criadoEm: pedidos.criado_em, mesaNome: mesas.nome })
    .from(pedidos)
    .leftJoin(mesas, and(eq(mesas.id, pedidos.mesa_id), eq(mesas.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), isNotNull(pedidos.mesa_id), notInArray(pedidos.status, ["finalizado", "cancelado"])))
    .orderBy(sql`${pedidos.id} desc`)
    .limit(100);

  if (linhas.length === 0) return [];

  const base = await pedidoCodigoBase(lojaId);
  const ids = linhas.map((l) => l.id);
  const itensRaw = await db.select({ pedidoId: pedidoItens.pedido_id, nome: pedidoItens.produto_nome, qtd: pedidoItens.quantidade }).from(pedidoItens).where(inArray(pedidoItens.pedido_id, ids));

  const itensPorPedido = new Map<number, string[]>();
  for (const item of itensRaw) {
    if (item.pedidoId === null) continue;
    const qtd = item.qtd ?? 1;
    const lista = itensPorPedido.get(item.pedidoId) ?? [];
    lista.push(`${qtd > 1 ? `${qtd}x ` : ""}${item.nome}`);
    itensPorPedido.set(item.pedidoId, lista);
  }

  return linhas.map((p) => ({
    id: p.id,
    codigo: codigoDisplay(p.id, base),
    status: p.status,
    total: Number(p.total ?? 0),
    criadoEm: p.criadoEm,
    mesaNome: p.mesaNome,
    itensResumo: (itensPorPedido.get(p.id) ?? []).join(", "),
  }));
}

export type ItemPedidoMesa = { id?: number; nome: string; preco: number; qtd: number; obs?: string; combosels?: { id: number; qtd?: number }[] | null };

export type CriarPedidoMesaInput = {
  lojaId: number;
  garcomId: number;
  mesaId: number;
  itens: ItemPedidoMesa[];
  formaPagamento: string;
  trocoSolicitado?: boolean;
  trocoValor?: number;
};

const FORMAS_PAGAMENTO_VALIDAS = ["dinheiro", "pix", "credito", "debito"];

/** Equivalente de public/api/garcom_pedido_criar.php — pedido de mesa lancado pelo garcom. */
export async function criarPedidoMesa(input: CriarPedidoMesaInput): Promise<{ ok: true; id: number; codigo: number } | { ok: false; msg: string }> {
  const { lojaId, garcomId, mesaId } = input;
  if (mesaId <= 0 || !input.itens || input.itens.length === 0) return { ok: false, msg: "Selecione a mesa e adicione ao menos um item." };
  if (!FORMAS_PAGAMENTO_VALIDAS.includes(input.formaPagamento)) return { ok: false, msg: "Escolha a forma de pagamento." };

  const [mesa] = await db.select({ id: mesas.id, nome: mesas.nome }).from(mesas).where(and(eq(mesas.id, mesaId), eq(mesas.loja_id, lojaId), eq(mesas.ativo, true))).limit(1);
  if (!mesa) return { ok: false, msg: "Mesa inválida ou desativada." };

  /* estoque: soma por produto (avulso ou dentro de combo) e bloqueia o pedido
     inteiro se faltar — mesma checagem de public/api/pedido_criar.php, ja
     considerando reservas simultaneas do PDV. */
  const necessario = new Map<number, number>();
  for (const item of input.itens) {
    const qtdItem = Math.max(1, item.qtd || 1);
    if (item.combosels && item.combosels.length > 0) {
      for (const sel of item.combosels) {
        const selQtd = (sel.qtd ?? 1) * qtdItem;
        if (sel.id > 0 && selQtd > 0) necessario.set(sel.id, (necessario.get(sel.id) ?? 0) + selQtd);
      }
    } else if (item.id && item.id > 0) {
      necessario.set(item.id, (necessario.get(item.id) ?? 0) + qtdItem);
    }
  }
  if (necessario.size > 0) {
    const ids = [...necessario.keys()];
    const linhas = await db
      .select({ id: produtos.id, nome: produtos.nome, estoqueQtd: estoque.quantidade })
      .from(produtos)
      .leftJoin(estoque, and(eq(estoque.produto_id, produtos.id), eq(estoque.loja_id, produtos.loja_id)))
      .where(and(inArray(produtos.id, ids), eq(produtos.loja_id, lojaId)));
    const reservasPdv = await reservaMapaPdv(lojaId);
    for (const p of linhas) {
      const preciso = necessario.get(p.id) ?? 0;
      if (preciso > 0 && aplicarReservaPdv(p.estoqueQtd ?? 0, p.id, reservasPdv) < preciso) {
        return { ok: false, msg: `"${p.nome}" está sem estoque suficiente no momento.` };
      }
    }
  }

  const subtotal = input.itens.reduce((soma, item) => soma + item.preco * Math.max(1, item.qtd || 1), 0);

  let pedidoId = 0;
  try {
    await withTransaction(async (tx: NeonTx) => {
      const clienteId = await clienteDaMesa(mesaId, mesa.nome, lojaId);

      const [novoPedido] = await tx
        .insert(pedidos)
        .values({
          cliente_id: clienteId,
          mesa_id: mesaId,
          garcom_id: garcomId,
          forma_pagamento: input.formaPagamento,
          total: subtotal,
          subtotal,
          status: "pendente",
          loja_id: lojaId,
          tipo: "mesa",
          origem: "garcom",
          criado_em: timestampFortaleza(),
          troco: input.formaPagamento === "dinheiro" && input.trocoSolicitado && (input.trocoValor ?? 0) > 0 ? input.trocoValor : null,
        })
        .returning({ id: pedidos.id });
      pedidoId = novoPedido.id;

      for (const item of input.itens) {
        const qtd = Math.max(1, item.qtd || 1);
        const isCombo = Boolean(item.combosels && item.combosels.length > 0);

        const [novoItem] = await tx
          .insert(pedidoItens)
          .values({ pedido_id: pedidoId, produto_nome: item.nome.trim(), quantidade: qtd, preco: item.preco, loja_id: lojaId, produto_id: item.id ?? null, observacoes: item.obs?.trim() ?? "" })
          .returning({ id: pedidoItens.id });

        if (!isCombo && item.id) {
          await baixarEstoque(tx, item.id, lojaId, qtd, "pedido", pedidoId);
        }
        if (isCombo && item.combosels) {
          for (const sel of item.combosels) {
            const selQtd = (sel.qtd ?? 1) * qtd;
            if (sel.id > 0 && selQtd > 0) await baixarEstoque(tx, sel.id, lojaId, selQtd, "pedido", pedidoId);
          }
          await registrarComponentesCombo(tx, pedidoId, novoItem.id, item.combosels, qtd, lojaId);
        }
      }
    });
  } catch {
    return { ok: false, msg: "Erro ao enviar o pedido." };
  }

  const base = await pedidoCodigoBase(lojaId);
  return { ok: true, id: pedidoId, codigo: codigoDisplay(pedidoId, base) };
}
