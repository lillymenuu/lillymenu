import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { getConfig } from "@/db/queries/config";
import { timestampFortaleza, adicionarHorasFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de admin/api/v1/verificacao_enviar.php, verificacao_confirmar.php
 * e verificacao_remover.php: confirmacao do numero de WhatsApp da loja via
 * codigo de 6 digitos, enviado pelo gateway ja configurado (Evolution API ou
 * Z-API — mesmas duas integracoes usadas pelo legado, nao o WhatsLilly).
 */

async function upsertConfig(lojaId: number, chave: string, valor: string): Promise<void> {
  await db.insert(configuracoes).values({ loja_id: lojaId, chave, valor }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
}

function normalizarNumero(n: string): string {
  return n.replace(/\D/g, "").replace(/^0+/, "");
}

/** Config escopada pela loja, com fallback pra config global (loja_id=0) se a loja nao tiver essa chave — mesma prioridade do PHP original. */
async function configGlobalOuLoja(lojaId: number, chave: string): Promise<string> {
  const [porLoja] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), eq(configuracoes.chave, chave))).limit(1);
  if (porLoja?.valor) return porLoja.valor;
  const [global] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, 0), eq(configuracoes.chave, chave))).limit(1);
  return global?.valor ?? "";
}

async function enviarWhatsapp(lojaId: number, destinatario: string, mensagem: string): Promise<boolean> {
  const evolutionUrl = await configGlobalOuLoja(lojaId, "evolution_url");
  const evolutionToken = await configGlobalOuLoja(lojaId, "evolution_token");
  const evolutionInstance = await configGlobalOuLoja(lojaId, "evolution_instance");

  if (evolutionUrl && evolutionToken && evolutionInstance) {
    try {
      const resp = await fetch(`${evolutionUrl.replace(/\/+$/, "")}/message/sendText/${evolutionInstance}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evolutionToken },
        body: JSON.stringify({ number: destinatario, textMessage: { text: mensagem } }),
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) return true;
    } catch {
      // tenta o proximo gateway
    }
  }

  const zapiInstance = await configGlobalOuLoja(lojaId, "zapi_instance");
  const zapiToken = await configGlobalOuLoja(lojaId, "zapi_token");
  const zapiClient = await configGlobalOuLoja(lojaId, "zapi_client_token");

  if (zapiInstance && zapiToken) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (zapiClient) headers["Client-Token"] = zapiClient;
      const resp = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: destinatario, message: mensagem }),
        signal: AbortSignal.timeout(10_000),
      });
      if (resp.ok) return true;
    } catch {
      // segue pra checagem de status abaixo
    }
  }

  return false;
}

async function zapiConectada(lojaId: number): Promise<boolean> {
  const zapiInstance = await configGlobalOuLoja(lojaId, "zapi_instance");
  const zapiToken = await configGlobalOuLoja(lojaId, "zapi_token");
  const zapiClient = await configGlobalOuLoja(lojaId, "zapi_client_token");
  if (!zapiInstance || !zapiToken) return false;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (zapiClient) headers["Client-Token"] = zapiClient;
    const resp = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/status`, { headers, signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => null);
    return Boolean(data?.connected);
  } catch {
    return false;
  }
}

export type EnviarCodigoResultado = { ok: true; enviado: boolean; instanciaOff?: boolean; codigoManual?: string; msgAviso?: string } | { ok: false; msg: string };

export async function enviarCodigoVerificacao(lojaId: number, whatsappInput: string): Promise<EnviarCodigoResultado> {
  const numero = whatsappInput.replace(/\D/g, "").trim();
  if (numero.length < 10 || numero.length > 13) return { ok: false, msg: "Número inválido." };

  const numeroNorm = normalizarNumero(numero).slice(-11);

  const lojaContato = await getConfig(lojaId, "loja_contato", "");
  const whatsappNumero = await getConfig(lojaId, "whatsapp_numero", "");
  const cadastrado = lojaContato || whatsappNumero;
  const cadastradoNorm = normalizarNumero(cadastrado).slice(-11);

  if (cadastradoNorm === "" || numeroNorm !== cadastradoNorm) return { ok: false, msg: "O número não corresponde ao cadastrado na loja." };

  const codigo = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const expira = adicionarHorasFortaleza(4 / 60);

  await upsertConfig(lojaId, "verificacao_codigo", codigo);
  await upsertConfig(lojaId, "verificacao_expira", expira);
  await upsertConfig(lojaId, "verificacao_whatsapp", numero);

  const destinatario = numero.length <= 11 ? `55${numero}` : numero;
  const mensagem = `Seu código de verificação de loja é: *${codigo}*\n\nEste código expira em 4 minutos. Não compartilhe com ninguém.`;

  const enviado = await enviarWhatsapp(lojaId, destinatario, mensagem);

  if (!enviado) {
    const conectada = await zapiConectada(lojaId);
    if (!conectada) {
      return { ok: true, enviado: false, instanciaOff: true, codigoManual: codigo, msgAviso: "WhatsApp desconectado na Z-API. Conecte em app.z-api.io ou use o código abaixo." };
    }
  }

  return { ok: true, enviado };
}

export async function confirmarCodigoVerificacao(lojaId: number, codigoInput: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const codigo = codigoInput.trim();
  if (!/^\d{6}$/.test(codigo)) return { ok: false, msg: "Código inválido." };

  const codigoSalvo = await getConfig(lojaId, "verificacao_codigo", "");
  const expira = await getConfig(lojaId, "verificacao_expira", "");
  if (!codigoSalvo || !expira) return { ok: false, msg: "Nenhum código pendente. Solicite um novo." };

  if (timestampFortaleza() > expira) return { ok: false, msg: "Código expirado. Solicite um novo." };
  if (codigoSalvo !== codigo) return { ok: false, msg: "Código incorreto. Verifique e tente novamente." };

  await upsertConfig(lojaId, "loja_verificada", "1");
  await db.delete(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), inArray(configuracoes.chave, ["verificacao_codigo", "verificacao_expira"])));

  return { ok: true };
}

export async function removerVerificacao(lojaId: number): Promise<{ ok: true }> {
  await db.delete(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), inArray(configuracoes.chave, ["loja_verificada", "verificacao_codigo", "verificacao_expira", "verificacao_whatsapp"])));
  return { ok: true };
}
