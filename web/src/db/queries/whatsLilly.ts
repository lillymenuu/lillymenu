import "server-only";
import { and, eq, or, ilike, gt, inArray, asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { whatsConversas, whatsMensagens, configuracoes, pedidos, clientes } from "@/db/schema";
import { telefoneSemMascara } from "@/db/queries/telefone";
import { timestampFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/whatslilly_conversas.php, whatslilly_mensagens.php,
 * whatslilly_enviar.php, whatslilly_excluir_conversas.php,
 * whatslilly_excluir_mensagens.php, whatslilly_nao_lidas.php,
 * whatslilly_nova_conversa.php e whatslilly_poll.php (todos versoes Bearer
 * de admin/api/whats_api.php?action=...): chat WhatsApp integrado via
 * Evolution API (WhatsLilly), lado admin.
 */

/** Config escopada pela loja, com fallback pra config global (loja_id=0) — mesma prioridade do PHP original. */
async function configGlobalOuLoja(lojaId: number, chave: string): Promise<string> {
  const [porLoja] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), eq(configuracoes.chave, chave))).limit(1);
  if (porLoja?.valor) return porLoja.valor;
  const [global] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, 0), eq(configuracoes.chave, chave))).limit(1);
  return global?.valor ?? "";
}

function formatarHoraData(iso: string | null): { hora: string; dataFmt: string } {
  if (!iso) return { hora: "", dataFmt: "" };
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return { hora: "", dataFmt: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return { hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`, dataFmt: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` };
}

export type ConversaWhatsLilly = { id: number; numero: string; nome: string; ultimoMsg: string | null; ultimoMsgEm: string | null; naoLidas: number };

export async function listarConversas(lojaId: number, buscaInput: string): Promise<{ conversas: ConversaWhatsLilly[]; totalNaoLidas: number }> {
  const busca = buscaInput.trim();
  const condicao = busca !== "" ? and(eq(whatsConversas.loja_id, lojaId), or(ilike(whatsConversas.numero, `%${busca}%`), ilike(whatsConversas.nome, `%${busca}%`)))! : eq(whatsConversas.loja_id, lojaId);

  const linhas = await db
    .select({ id: whatsConversas.id, numero: whatsConversas.numero, nome: sql<string>`coalesce(${whatsConversas.nome}, ${whatsConversas.numero})`, ultimoMsg: whatsConversas.ultimo_msg, ultimoMsgEm: whatsConversas.ultimo_msg_em, naoLidas: whatsConversas.nao_lidas })
    .from(whatsConversas)
    .where(condicao)
    .orderBy(desc(whatsConversas.ultimo_msg_em))
    .limit(60);

  const [{ total }] = await db.select({ total: sql<string>`coalesce(sum(${whatsConversas.nao_lidas}), 0)` }).from(whatsConversas).where(eq(whatsConversas.loja_id, lojaId));

  return { conversas: linhas.map((l) => ({ ...l, naoLidas: l.naoLidas ?? 0 })), totalNaoLidas: Number(total) };
}

export type MensagemWhatsLilly = { id: number; direcao: string; tipo: string | null; mensagem: string; pedidoId: number | null; hora: string; dataFmt: string; falhou: boolean };
export type PedidoWhatsLilly = { id: number; total: number; status: string; criadoFmt: string };

export type DetalheConversaResultado = { ok: true; conversa: { id: number; numero: string; nome: string }; mensagens: MensagemWhatsLilly[]; pedidos: PedidoWhatsLilly[] } | { ok: false; msg: string };

export async function detalheConversa(lojaId: number, conversaId: number): Promise<DetalheConversaResultado> {
  const [conversa] = await db.select({ id: whatsConversas.id, numero: whatsConversas.numero, nome: sql<string>`coalesce(${whatsConversas.nome}, ${whatsConversas.numero})` }).from(whatsConversas).where(and(eq(whatsConversas.id, conversaId), eq(whatsConversas.loja_id, lojaId))).limit(1);
  if (!conversa) return { ok: false, msg: "Conversa não encontrada." };

  const msgsRaw = await db
    .select({ id: whatsMensagens.id, direcao: whatsMensagens.direcao, tipo: whatsMensagens.tipo, mensagem: whatsMensagens.mensagem, pedidoId: whatsMensagens.pedido_id, whatsMsgId: whatsMensagens.whats_msg_id, createdAt: whatsMensagens.created_at })
    .from(whatsMensagens)
    .where(eq(whatsMensagens.conversa_id, conversaId))
    .orderBy(asc(whatsMensagens.id))
    .limit(200);

  const mensagens: MensagemWhatsLilly[] = msgsRaw.map((m) => {
    const { hora, dataFmt } = formatarHoraData(m.createdAt);
    return { id: m.id, direcao: m.direcao, tipo: m.tipo, mensagem: m.mensagem, pedidoId: m.pedidoId, hora, dataFmt, falhou: m.direcao === "saida" && !m.whatsMsgId };
  });

  await db.update(whatsConversas).set({ nao_lidas: 0 }).where(eq(whatsConversas.id, conversaId));

  const numSuffix = `%${conversa.numero.replace(/\D/g, "").slice(-9)}%`;
  const pedidosRaw = await db
    .select({ id: pedidos.id, total: pedidos.total, status: pedidos.status, criadoEm: pedidos.criado_em })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.loja_id, lojaId), ilike(telefoneSemMascara, numSuffix)))
    .orderBy(desc(pedidos.id))
    .limit(10);

  const pedidosResultado: PedidoWhatsLilly[] = pedidosRaw.map((p) => {
    const d = p.criadoEm ? new Date(p.criadoEm.replace(" ", "T")) : null;
    const pad = (n: number) => String(n).padStart(2, "0");
    const criadoFmt = d && !Number.isNaN(d.getTime()) ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
    return { id: p.id, total: Number(p.total ?? 0), status: p.status, criadoFmt };
  });

  return { ok: true, conversa, mensagens, pedidos: pedidosResultado };
}

export type EnviarMensagemResultado = { ok: true; enviado: boolean; erro: string | null; id: number; hora: string; dataFmt: string } | { ok: false; msg: string };

export async function enviarMensagem(lojaId: number, conversaId: number, mensagemInput: string): Promise<EnviarMensagemResultado> {
  const texto = mensagemInput.trim();
  if (!texto) return { ok: false, msg: "Mensagem vazia." };

  const [conversa] = await db.select({ id: whatsConversas.id, numero: whatsConversas.numero }).from(whatsConversas).where(and(eq(whatsConversas.id, conversaId), eq(whatsConversas.loja_id, lojaId))).limit(1);
  if (!conversa) return { ok: false, msg: "Conversa não encontrada." };

  let numero = conversa.numero;
  if (numero.length <= 11) numero = `55${numero}`;

  const evolutionUrl = await configGlobalOuLoja(lojaId, "evolution_url");
  const evolutionToken = await configGlobalOuLoja(lojaId, "evolution_token");
  const evolutionInst = await configGlobalOuLoja(lojaId, "evolution_instance");

  let whatsId: string | null = null;
  let enviado = false;
  let erroEnvio: string | null = null;

  if (evolutionUrl && evolutionToken && evolutionInst) {
    try {
      const resp = await fetch(`${evolutionUrl.replace(/\/+$/, "")}/message/sendText/${evolutionInst}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionToken },
        body: JSON.stringify({ number: numero, text: texto }),
        signal: AbortSignal.timeout(10_000),
      });
      const respData = await resp.json().catch(() => null);
      if (resp.ok) {
        enviado = true;
        whatsId = respData?.key?.id ?? null;
      } else {
        const motivoBruto = respData?.message ?? respData?.error ?? (await resp.text().catch(() => ""));
        erroEnvio = `Evolution API retornou HTTP ${resp.status}: ${typeof motivoBruto === "string" ? motivoBruto : JSON.stringify(motivoBruto)}`;
      }
    } catch (e) {
      erroEnvio = `Erro de conexão com a Evolution API: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    erroEnvio = "WhatsApp não configurado para esta loja.";
  }

  const agora = timestampFortaleza();
  const [nova] = await db.insert(whatsMensagens).values({ conversa_id: conversaId, loja_id: lojaId, direcao: "saida", mensagem: texto, whats_msg_id: whatsId, created_at: agora }).returning({ id: whatsMensagens.id });

  await db.update(whatsConversas).set({ ultimo_msg: texto.slice(0, 200), ultimo_msg_em: agora }).where(eq(whatsConversas.id, conversaId));

  const { hora, dataFmt } = formatarHoraData(agora);
  return { ok: true, enviado, erro: enviado ? null : erroEnvio, id: nova.id, hora, dataFmt };
}

export async function excluirConversas(lojaId: number, idsInput: number[]): Promise<{ ok: true; deletadas: number } | { ok: false; msg: string }> {
  const ids = idsInput.filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return { ok: false, msg: "Nenhuma conversa selecionada." };

  // whats_mensagens tem ON DELETE CASCADE de whats_conversas — apagar a conversa ja apaga as mensagens.
  const apagadas = await db.delete(whatsConversas).where(and(inArray(whatsConversas.id, ids), eq(whatsConversas.loja_id, lojaId))).returning({ id: whatsConversas.id });

  return { ok: true, deletadas: apagadas.length };
}

export async function excluirMensagens(lojaId: number, idsInput: number[]): Promise<{ ok: true; deletadas: number } | { ok: false; msg: string }> {
  const ids = idsInput.filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return { ok: false, msg: "Nenhuma mensagem selecionada." };

  const apagadas = await db
    .delete(whatsMensagens)
    .where(and(inArray(whatsMensagens.id, ids), eq(whatsMensagens.loja_id, lojaId)))
    .returning({ id: whatsMensagens.id });

  return { ok: true, deletadas: apagadas.length };
}

export async function totalNaoLidas(lojaId: number): Promise<number> {
  const [{ total }] = await db.select({ total: sql<string>`coalesce(sum(${whatsConversas.nao_lidas}), 0)` }).from(whatsConversas).where(eq(whatsConversas.loja_id, lojaId));
  return Number(total);
}

export async function novaConversa(lojaId: number, numeroInput: string, nomeInput: string): Promise<{ ok: true; conversaId: number; nome: string } | { ok: false; msg: string }> {
  const numero = numeroInput.replace(/\D/g, "");
  if (numero.length < 10) return { ok: false, msg: "Número inválido (mínimo 10 dígitos com DDD)." };

  let nome = nomeInput.trim();
  if (!nome) {
    const numSuffix = `%${numero.slice(-9)}%`;
    const [cliente] = await db.select({ nome: clientes.nome }).from(clientes).where(and(eq(clientes.loja_id, lojaId), ilike(telefoneSemMascara, numSuffix))).limit(1);
    nome = cliente?.nome ?? "";
  }

  await db
    .insert(whatsConversas)
    .values({ loja_id: lojaId, numero, nome: nome || null, created_at: timestampFortaleza() })
    .onConflictDoNothing({ target: [whatsConversas.loja_id, whatsConversas.numero] });

  const [conversa] = await db.select({ id: whatsConversas.id }).from(whatsConversas).where(and(eq(whatsConversas.loja_id, lojaId), eq(whatsConversas.numero, numero))).limit(1);

  return { ok: true, conversaId: conversa.id, nome: nome || numero };
}

export type PollResultado = { ok: true; mensagens: MensagemWhatsLilly[]; totalNaoLidas: number } | { ok: false; msg: string };

export async function pollMensagens(lojaId: number, conversaId: number, afterId: number): Promise<PollResultado> {
  const [existe] = await db.select({ id: whatsConversas.id }).from(whatsConversas).where(and(eq(whatsConversas.id, conversaId), eq(whatsConversas.loja_id, lojaId))).limit(1);
  if (!existe) return { ok: false, msg: "Conversa não encontrada." };

  const msgsRaw = await db
    .select({ id: whatsMensagens.id, direcao: whatsMensagens.direcao, tipo: whatsMensagens.tipo, mensagem: whatsMensagens.mensagem, whatsMsgId: whatsMensagens.whats_msg_id, createdAt: whatsMensagens.created_at })
    .from(whatsMensagens)
    .where(and(eq(whatsMensagens.conversa_id, conversaId), gt(whatsMensagens.id, afterId)))
    .orderBy(asc(whatsMensagens.id))
    .limit(50);

  const mensagens: MensagemWhatsLilly[] = msgsRaw.map((m) => {
    const { hora, dataFmt } = formatarHoraData(m.createdAt);
    return { id: m.id, direcao: m.direcao, tipo: m.tipo, mensagem: m.mensagem, pedidoId: null, hora, dataFmt, falhou: m.direcao === "saida" && !m.whatsMsgId };
  });

  if (mensagens.length > 0) {
    await db.update(whatsConversas).set({ nao_lidas: 0 }).where(eq(whatsConversas.id, conversaId));
  }

  return { ok: true, mensagens, totalNaoLidas: await totalNaoLidas(lojaId) };
}
