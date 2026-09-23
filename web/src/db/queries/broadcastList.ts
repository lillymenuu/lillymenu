import "server-only";
import { and, eq, inArray, sql, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { listasTransmissao, listasTransmissaoMembros, listasTransmissaoEnvios, clientes, configuracoes } from "@/db/schema";
import { timestampFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/broadcastlist_listar.php, broadcastlist_detalhe.php,
 * broadcastlist_salvar.php, broadcastlist_excluir.php, broadcastlist_clientes.php,
 * broadcastlist_envio_iniciar.php, broadcastlist_envio_item.php e
 * broadcastlist_envio_finalizar.php (todos versoes Bearer de
 * admin/api/lista_transmissao_api.php?action=...): Lista de Transmissao —
 * grupos de clientes pra disparo de mensagem via Evolution API (WhatsApp).
 */

async function configEvolucao(lojaId: number, chave: string): Promise<string> {
  const [porLoja] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), eq(configuracoes.chave, chave))).limit(1);
  if (porLoja?.valor) return porLoja.valor;
  const [global] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, 0), eq(configuracoes.chave, chave))).limit(1);
  return global?.valor ?? "";
}

async function evolutionConfigurada(lojaId: number): Promise<boolean> {
  const [url, token, inst] = await Promise.all([configEvolucao(lojaId, "evolution_url"), configEvolucao(lojaId, "evolution_token"), configEvolucao(lojaId, "evolution_instance")]);
  return url !== "" && token !== "" && inst !== "";
}

/** Equivalente de admin/helpers/whats_send.php (whatsEnviarMensagem) — nao grava em whats_mensagens/whats_conversas, so envia. */
async function enviarViaEvolution(lojaId: number, numeroInput: string, mensagem: string): Promise<{ ok: true; whatsMsgId: string | null } | { ok: false; erro: string }> {
  let numero = numeroInput.replace(/\D/g, "");
  if (numero.length <= 11) numero = `55${numero}`;

  const evolutionUrl = await configEvolucao(lojaId, "evolution_url");
  const evolutionToken = await configEvolucao(lojaId, "evolution_token");
  const evolutionInst = await configEvolucao(lojaId, "evolution_instance");

  if (!evolutionUrl || !evolutionToken || !evolutionInst) return { ok: false, erro: "WhatsApp não configurado para esta loja." };
  if (numero === "" || numero === "55") return { ok: false, erro: "Número de telefone inválido." };

  try {
    const resp = await fetch(`${evolutionUrl.replace(/\/+$/, "")}/message/sendText/${evolutionInst}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionToken },
      body: JSON.stringify({ number: numero, text: mensagem }),
      signal: AbortSignal.timeout(10_000),
    });
    const respData = await resp.json().catch(() => null);
    if (resp.ok) return { ok: true, whatsMsgId: respData?.key?.id ?? null };

    const motivoBruto = respData?.message ?? respData?.error ?? (await resp.text().catch(() => ""));
    return { ok: false, erro: `Evolution API retornou HTTP ${resp.status}: ${typeof motivoBruto === "string" ? motivoBruto : JSON.stringify(motivoBruto)}` };
  } catch (e) {
    return { ok: false, erro: `Erro de conexão com a Evolution API: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export type ListaTransmissaoResumo = { id: number; nome: string; criadoEm: string; totalMembros: number };

export async function listarListas(lojaId: number): Promise<ListaTransmissaoResumo[]> {
  const linhas = await db
    .select({ id: listasTransmissao.id, nome: listasTransmissao.nome, criadoEm: listasTransmissao.criado_em, totalMembros: sql<string>`count(${listasTransmissaoMembros.id})` })
    .from(listasTransmissao)
    .leftJoin(listasTransmissaoMembros, eq(listasTransmissaoMembros.lista_id, listasTransmissao.id))
    .where(eq(listasTransmissao.loja_id, lojaId))
    .groupBy(listasTransmissao.id)
    .orderBy(listasTransmissao.nome);

  return linhas.map((l) => ({ ...l, totalMembros: Number(l.totalMembros) }));
}

export async function detalheLista(lojaId: number, id: number): Promise<{ ok: true; lista: { id: number; nome: string }; membros: number[] } | { ok: false; msg: string }> {
  const [lista] = await db.select({ id: listasTransmissao.id, nome: listasTransmissao.nome }).from(listasTransmissao).where(and(eq(listasTransmissao.id, id), eq(listasTransmissao.loja_id, lojaId))).limit(1);
  if (!lista) return { ok: false, msg: "Lista não encontrada." };

  const membrosRaw = await db.select({ clienteId: listasTransmissaoMembros.cliente_id }).from(listasTransmissaoMembros).where(and(eq(listasTransmissaoMembros.lista_id, id), eq(listasTransmissaoMembros.loja_id, lojaId)));

  return { ok: true, lista, membros: membrosRaw.map((m) => m.clienteId) };
}

export async function salvarLista(lojaId: number, idInput: number, nomeInput: string, clientesIdsInput: number[]): Promise<{ ok: true; id: number } | { ok: false; msg: string }> {
  const nome = nomeInput.trim();
  if (nome === "") return { ok: false, msg: "Informe o nome da lista." };

  const clientesIds = [...new Set(clientesIdsInput.filter((id) => Number.isInteger(id)))];

  try {
    let id = idInput;

    if (id > 0) {
      const [existe] = await db.select({ id: listasTransmissao.id }).from(listasTransmissao).where(and(eq(listasTransmissao.id, id), eq(listasTransmissao.loja_id, lojaId))).limit(1);
      if (!existe) return { ok: false, msg: "Lista não encontrada." };
      await db.update(listasTransmissao).set({ nome, atualizado_em: timestampFortaleza() }).where(and(eq(listasTransmissao.id, id), eq(listasTransmissao.loja_id, lojaId)));
    } else {
      const [nova] = await db.insert(listasTransmissao).values({ loja_id: lojaId, nome }).returning({ id: listasTransmissao.id });
      id = nova.id;
    }

    await db.delete(listasTransmissaoMembros).where(and(eq(listasTransmissaoMembros.lista_id, id), eq(listasTransmissaoMembros.loja_id, lojaId)));

    if (clientesIds.length > 0) {
      const validos = await db.select({ id: clientes.id }).from(clientes).where(and(eq(clientes.loja_id, lojaId), inArray(clientes.id, clientesIds)));
      if (validos.length > 0) {
        await db.insert(listasTransmissaoMembros).values(validos.map((v) => ({ lista_id: id, cliente_id: v.id, loja_id: lojaId })));
      }
    }

    return { ok: true, id };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : "Erro ao salvar a lista." };
  }
}

export async function excluirLista(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  const apagadas = await db.delete(listasTransmissao).where(and(eq(listasTransmissao.id, id), eq(listasTransmissao.loja_id, lojaId))).returning({ id: listasTransmissao.id });
  if (apagadas.length === 0) return { ok: false, msg: "Lista não encontrada." };
  return { ok: true };
}

export type ClienteElegivel = { id: number; nome: string | null; telefone: string | null };

export async function clientesElegiveis(lojaId: number): Promise<ClienteElegivel[]> {
  return db
    .select({ id: clientes.id, nome: clientes.nome, telefone: clientes.telefone })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), isNotNull(clientes.telefone), ne(clientes.telefone, "")))
    .orderBy(clientes.nome);
}

export type DestinatarioEnvio = { clienteId: number; nome: string | null; telefone: string | null };

export async function iniciarEnvio(lojaId: number, listaId: number, mensagemInput: string): Promise<{ ok: true; envioId: number; destinatarios: DestinatarioEnvio[] } | { ok: false; msg: string }> {
  const mensagem = mensagemInput.trim();
  if (mensagem === "") return { ok: false, msg: "Escreva uma mensagem antes de enviar." };
  if (!(await evolutionConfigurada(lojaId))) return { ok: false, msg: "WhatsApp não configurado para esta loja. Configure a integração antes de enviar." };

  const [lista] = await db.select({ id: listasTransmissao.id }).from(listasTransmissao).where(and(eq(listasTransmissao.id, listaId), eq(listasTransmissao.loja_id, lojaId))).limit(1);
  if (!lista) return { ok: false, msg: "Lista não encontrada." };

  const destinatarios = await db
    .select({ clienteId: clientes.id, nome: clientes.nome, telefone: clientes.telefone })
    .from(listasTransmissaoMembros)
    .innerJoin(clientes, and(eq(clientes.id, listasTransmissaoMembros.cliente_id), eq(clientes.loja_id, listasTransmissaoMembros.loja_id)))
    .where(and(eq(listasTransmissaoMembros.lista_id, listaId), eq(listasTransmissaoMembros.loja_id, lojaId), isNotNull(clientes.telefone), ne(clientes.telefone, "")))
    .orderBy(clientes.nome);

  if (destinatarios.length === 0) return { ok: false, msg: "Nenhum destinatário com WhatsApp válido neste grupo." };

  const [envio] = await db.insert(listasTransmissaoEnvios).values({ lista_id: listaId, loja_id: lojaId, mensagem, total_destinatarios: destinatarios.length }).returning({ id: listasTransmissaoEnvios.id });

  return { ok: true, envioId: envio.id, destinatarios };
}

export type EnvioItemResultado = { ok: true; enviado: boolean; erro: string | null };

export async function enviarItemEnvio(lojaId: number, envioId: number, clienteId: number): Promise<EnvioItemResultado> {
  const [envio] = await db.select({ mensagem: listasTransmissaoEnvios.mensagem }).from(listasTransmissaoEnvios).where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId))).limit(1);
  if (!envio) return { ok: true, enviado: false, erro: "Envio não encontrado." };

  const [cliente] = await db.select({ telefone: clientes.telefone }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!cliente?.telefone) {
    await db.update(listasTransmissaoEnvios).set({ total_falhas: sql`${listasTransmissaoEnvios.total_falhas} + 1` }).where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId)));
    return { ok: true, enviado: false, erro: "Cliente sem telefone cadastrado." };
  }

  const resultado = await enviarViaEvolution(lojaId, cliente.telefone, envio.mensagem);

  if (resultado.ok) {
    await db.update(listasTransmissaoEnvios).set({ total_enviados: sql`${listasTransmissaoEnvios.total_enviados} + 1` }).where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId)));
    return { ok: true, enviado: true, erro: null };
  }

  await db.update(listasTransmissaoEnvios).set({ total_falhas: sql`${listasTransmissaoEnvios.total_falhas} + 1` }).where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId)));
  return { ok: true, enviado: false, erro: resultado.erro };
}

export type ResumoEnvio = { totalDestinatarios: number; totalEnviados: number; totalFalhas: number };

export async function finalizarEnvio(lojaId: number, envioId: number): Promise<{ ok: true; resumo: ResumoEnvio } | { ok: false; msg: string }> {
  await db.update(listasTransmissaoEnvios).set({ status: "concluido", finalizado_em: timestampFortaleza() }).where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId)));

  const [resumo] = await db
    .select({ totalDestinatarios: listasTransmissaoEnvios.total_destinatarios, totalEnviados: listasTransmissaoEnvios.total_enviados, totalFalhas: listasTransmissaoEnvios.total_falhas })
    .from(listasTransmissaoEnvios)
    .where(and(eq(listasTransmissaoEnvios.id, envioId), eq(listasTransmissaoEnvios.loja_id, lojaId)))
    .limit(1);

  if (!resumo) return { ok: false, msg: "Envio não encontrado." };

  return { ok: true, resumo };
}
