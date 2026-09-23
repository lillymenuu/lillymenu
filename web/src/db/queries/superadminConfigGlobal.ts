import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes, planos } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/superadmin_config_salvar.php: configuracoes
 * globais do SaaS (loja_id=0, sentinela sem FK) — Pix/WhatsApp de
 * recebimento, Nominatim e recursos liberados por plano.
 */

async function salvarConfigGlobal(configs: Record<string, string>): Promise<void> {
  for (const [chave, valor] of Object.entries(configs)) {
    await db.insert(configuracoes).values({ loja_id: 0, chave, valor }).onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
  }
}

export async function salvarConfigPix(pixChave: string, pixNome: string, whatsNumero: string): Promise<{ ok: true }> {
  await salvarConfigGlobal({ saas_pix_chave: pixChave.trim(), saas_pix_nome: pixNome.trim(), saas_whatsapp_numero: whatsNumero.trim() });
  return { ok: true };
}

export async function salvarConfigNominatim(ativo: boolean): Promise<{ ok: true }> {
  await salvarConfigGlobal({ saas_nominatim_ativo: ativo ? "1" : "0" });
  return { ok: true };
}

export async function salvarRecursosPlano(planoId: number, recursosInput: string[], semRestricao: boolean): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (planoId <= 0) return { ok: false, msg: "Plano inválido." };

  const recursos = recursosInput.filter((v) => typeof v === "string" && v.startsWith("menu."));
  const valor = semRestricao ? null : JSON.stringify(recursos);

  await db.update(planos).set({ recursos_json: valor }).where(eq(planos.id, planoId));
  return { ok: true };
}
