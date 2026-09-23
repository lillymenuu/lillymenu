import "server-only";
import { and, eq, gt, sql, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { suporteMensagens, suporteDigitando, lojas } from "@/db/schema";
import { storageSaveArquivoBase64, storageDelete } from "@/db/queries/storage";
import { timestampFortaleza, adicionarHorasFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/suporte_mensagens.php, suporte_enviar.php,
 * suporte_digitando.php, suporte_unread.php (lado da loja) e
 * superadmin_suporte.php (lado do superadmin, acoes conversas/mensagens/
 * digitando/unread/enviar num unico endpoint): chat de suporte lojista <->
 * superadmin.
 */

const EXTENSOES_IMAGEM = ["jpg", "jpeg", "png", "webp"];
const TAMANHO_MAXIMO_ANEXO = 5 * 1024 * 1024;

/** Mensagens (e anexos) com mais de 2 dias somem — mesma regra do chat legado. Roda global, nao escopada por loja. */
export async function limparMensagensExpiradas(): Promise<void> {
  try {
    const limite = adicionarHorasFortaleza(-48);
    const antigas = await db.select({ anexoArquivo: suporteMensagens.anexo_arquivo }).from(suporteMensagens).where(sql`${suporteMensagens.criado_em} < ${limite}`);
    for (const m of antigas) {
      if (m.anexoArquivo) await storageDelete(m.anexoArquivo);
    }
    await db.delete(suporteMensagens).where(sql`${suporteMensagens.criado_em} < ${limite}`);
  } catch {
    // best-effort, igual ao PHP (nunca interrompe o fluxo principal)
  }
}

async function salvarAnexo(lojaId: number, base64: string, ext: string): Promise<{ ok: true; anexo: string | null } | { ok: false; msg: string }> {
  if (base64 === "") return { ok: true, anexo: null };
  if (!EXTENSOES_IMAGEM.includes(ext)) return { ok: false, msg: "Imagem inválida (use JPG, PNG ou WebP)." };

  const anexo = await storageSaveArquivoBase64(base64, ext, "suporte", "suporte", lojaId, TAMANHO_MAXIMO_ANEXO);
  if (anexo === null) return { ok: false, msg: "Erro ao salvar a imagem." };
  return { ok: true, anexo };
}

export type MensagemSuporte = { id: number; remetente: string; mensagem: string; anexoArquivo: string | null; criadoEm: string };

/* ==================== Lado da loja ==================== */

export async function mensagensLoja(lojaId: number, afterId: number): Promise<{ ok: true; mensagens: MensagemSuporte[] } | { ok: false; erro: string }> {
  try {
    const linhas = await db
      .select({ id: suporteMensagens.id, remetente: suporteMensagens.remetente, mensagem: suporteMensagens.mensagem, anexoArquivo: suporteMensagens.anexo_arquivo, criadoEm: suporteMensagens.criado_em })
      .from(suporteMensagens)
      .where(and(eq(suporteMensagens.loja_id, lojaId), gt(suporteMensagens.id, Math.max(0, afterId))))
      .orderBy(asc(suporteMensagens.id));

    await db.update(suporteMensagens).set({ lida_loja: true }).where(and(eq(suporteMensagens.loja_id, lojaId), eq(suporteMensagens.remetente, "suporte"), eq(suporteMensagens.lida_loja, false)));

    return { ok: true, mensagens: linhas };
  } catch {
    return { ok: false, erro: "Erro ao carregar mensagens." };
  }
}

export async function enviarMensagemLoja(lojaId: number, mensagemInput: string, base64Input: string, extInput: string): Promise<{ ok: true; mensagem: MensagemSuporte } | { ok: false; msg: string }> {
  const mensagem = mensagemInput.trim();
  if (mensagem.length > 2000) return { ok: false, msg: "Mensagem muito longa." };

  const anexoResultado = await salvarAnexo(lojaId, base64Input.trim(), extInput.trim().toLowerCase());
  if (!anexoResultado.ok) return anexoResultado;

  if (mensagem === "" && anexoResultado.anexo === null) return { ok: false, msg: "Informe uma mensagem ou anexe uma imagem." };

  const [nova] = await db
    .insert(suporteMensagens)
    .values({ loja_id: lojaId, remetente: "loja", mensagem, anexo_arquivo: anexoResultado.anexo, lida_loja: true, lida_suporte: false, criado_em: timestampFortaleza() })
    .returning({ id: suporteMensagens.id, remetente: suporteMensagens.remetente, mensagem: suporteMensagens.mensagem, anexoArquivo: suporteMensagens.anexo_arquivo, criadoEm: suporteMensagens.criado_em });

  return { ok: true, mensagem: nova };
}

export async function unreadLoja(lojaId: number): Promise<number> {
  try {
    const [{ n }] = await db.select({ n: sql<string>`count(*)` }).from(suporteMensagens).where(and(eq(suporteMensagens.loja_id, lojaId), eq(suporteMensagens.remetente, "suporte"), eq(suporteMensagens.lida_loja, false)));
    return Number(n);
  } catch {
    return 0;
  }
}

export async function digitandoLojaSet(lojaId: number, ativo: boolean): Promise<{ ok: true }> {
  if (ativo) {
    await db.insert(suporteDigitando).values({ loja_id: lojaId, quem: "loja", atualizado_em: timestampFortaleza() }).onConflictDoUpdate({ target: [suporteDigitando.loja_id, suporteDigitando.quem], set: { atualizado_em: timestampFortaleza() } });
  } else {
    await db.delete(suporteDigitando).where(and(eq(suporteDigitando.loja_id, lojaId), eq(suporteDigitando.quem, "loja")));
  }
  return { ok: true };
}

export async function digitandoSuporteGet(lojaId: number): Promise<boolean> {
  const limite = adicionarHorasFortaleza(-5 / 3600);
  const [linha] = await db
    .select({ um: sql<number>`1` })
    .from(suporteDigitando)
    .where(and(eq(suporteDigitando.loja_id, lojaId), eq(suporteDigitando.quem, "suporte"), gt(suporteDigitando.atualizado_em, limite)))
    .limit(1);
  return Boolean(linha);
}

/* ==================== Lado do superadmin ==================== */

export type ConversaSuporte = { lojaId: number; nome: string | null; logo: string | null; ultimaMensagem: string | null; ultimoAnexo: string | null; ultimaEm: string | null; naoLidas: number };

export async function conversasSuporte(apenasComMensagens: boolean): Promise<ConversaSuporte[]> {
  const ultimaMensagemExpr = sql<string | null>`(select mensagem from suporte_mensagens sm where sm.loja_id = lojas.id order by sm.id desc limit 1)`;
  const ultimoAnexoExpr = sql<string | null>`(select anexo_arquivo from suporte_mensagens sm where sm.loja_id = lojas.id order by sm.id desc limit 1)`;
  const ultimaEmExpr = sql<string | null>`(select criado_em from suporte_mensagens sm where sm.loja_id = lojas.id order by sm.id desc limit 1)`;
  const naoLidasExpr = sql<string>`(select count(*) from suporte_mensagens sm where sm.loja_id = lojas.id and sm.remetente = 'loja' and sm.lida_suporte = false)`;
  const logoExpr = sql<string | null>`(select valor from configuracoes c where c.loja_id = lojas.id and c.chave = 'loja_perfil' limit 1)`;

  const linhas = await db
    .select({ lojaId: lojas.id, nome: lojas.nome, logo: logoExpr, ultimaMensagem: ultimaMensagemExpr, ultimoAnexo: ultimoAnexoExpr, ultimaEm: ultimaEmExpr, naoLidas: naoLidasExpr })
    .from(lojas)
    .orderBy(desc(sql`(${naoLidasExpr} > 0)`), asc(sql`(${ultimaEmExpr} is null)`), desc(ultimaEmExpr), asc(lojas.nome));

  const resultado = linhas.map((l) => ({ ...l, naoLidas: Number(l.naoLidas) }));
  return apenasComMensagens ? resultado.filter((c) => c.ultimaEm !== null) : resultado;
}

export async function unreadSuporte(): Promise<number> {
  const [{ n }] = await db.select({ n: sql<string>`count(*)` }).from(suporteMensagens).where(and(eq(suporteMensagens.remetente, "loja"), eq(suporteMensagens.lida_suporte, false)));
  return Number(n);
}

export async function mensagensSuporte(lojaId: number, afterId: number): Promise<{ ok: true; mensagens: MensagemSuporte[] } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Loja invalida." };

  const linhas = await db
    .select({ id: suporteMensagens.id, remetente: suporteMensagens.remetente, mensagem: suporteMensagens.mensagem, anexoArquivo: suporteMensagens.anexo_arquivo, criadoEm: suporteMensagens.criado_em })
    .from(suporteMensagens)
    .where(and(eq(suporteMensagens.loja_id, lojaId), gt(suporteMensagens.id, Math.max(0, afterId))))
    .orderBy(asc(suporteMensagens.id));

  await db.update(suporteMensagens).set({ lida_suporte: true }).where(and(eq(suporteMensagens.loja_id, lojaId), eq(suporteMensagens.remetente, "loja"), eq(suporteMensagens.lida_suporte, false)));

  return { ok: true, mensagens: linhas };
}

export async function enviarMensagemSuporte(lojaId: number, mensagemInput: string, base64Input: string, extInput: string): Promise<{ ok: true; mensagem: MensagemSuporte } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Loja invalida." };

  const mensagem = mensagemInput.trim();
  if (mensagem.length > 2000) return { ok: false, msg: "Mensagem muito longa." };

  const anexoResultado = await salvarAnexo(lojaId, base64Input.trim(), extInput.trim().toLowerCase());
  if (!anexoResultado.ok) return anexoResultado;

  if (mensagem === "" && anexoResultado.anexo === null) return { ok: false, msg: "Informe uma mensagem ou anexe uma imagem." };

  const [nova] = await db
    .insert(suporteMensagens)
    .values({ loja_id: lojaId, remetente: "suporte", mensagem, anexo_arquivo: anexoResultado.anexo, lida_loja: false, lida_suporte: true, criado_em: timestampFortaleza() })
    .returning({ id: suporteMensagens.id, remetente: suporteMensagens.remetente, mensagem: suporteMensagens.mensagem, anexoArquivo: suporteMensagens.anexo_arquivo, criadoEm: suporteMensagens.criado_em });

  return { ok: true, mensagem: nova };
}

export async function digitandoSuporteSet(lojaId: number, ativo: boolean): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Loja invalida." };
  if (ativo) {
    await db.insert(suporteDigitando).values({ loja_id: lojaId, quem: "suporte", atualizado_em: timestampFortaleza() }).onConflictDoUpdate({ target: [suporteDigitando.loja_id, suporteDigitando.quem], set: { atualizado_em: timestampFortaleza() } });
  } else {
    await db.delete(suporteDigitando).where(and(eq(suporteDigitando.loja_id, lojaId), eq(suporteDigitando.quem, "suporte")));
  }
  return { ok: true };
}

export async function digitandoLojaGet(lojaId: number): Promise<boolean> {
  const limite = adicionarHorasFortaleza(-5 / 3600);
  const [linha] = await db
    .select({ um: sql<number>`1` })
    .from(suporteDigitando)
    .where(and(eq(suporteDigitando.loja_id, lojaId), eq(suporteDigitando.quem, "loja"), gt(suporteDigitando.atualizado_em, limite)))
    .limit(1);
  return Boolean(linha);
}
