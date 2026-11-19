import "server-only";
import webpush from "web-push";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, clientes, mesas, pedidos, pushInscricoes } from "@/db/schema";
import { codigoDisplay, pedidoCodigoBase } from "@/db/queries/pedidosAdmin";

/*
 * Web Push (notificacao no celular quando chega pedido). Chaves VAPID nas variaveis de ambiente
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (gerar com `npx web-push generate-vapid-keys`).
 * Sem as chaves o envio vira no-op — o resto do sistema segue funcionando.
 */

let configurado: boolean | null = null;

function configurar(): boolean {
  if (configurado !== null) return configurado;
  const publica = process.env.VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) {
    configurado = false;
    return false;
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://lillymenu.com/", publica, privada);
  configurado = true;
  return true;
}

export function chavePublicaVapid(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export type PayloadPush = {
  titulo: string;
  corpo: string;
  /** Pagina aberta ao tocar na notificacao. */
  url: string;
  /** Notificacoes com a mesma tag se substituem (ex.: uma por pedido). */
  tag?: string;
};

type Inscricao = typeof pushInscricoes.$inferSelect;

async function enviarPara(inscricoes: Inscricao[], payload: PayloadPush): Promise<number> {
  if (!configurar() || inscricoes.length === 0) return 0;
  const json = JSON.stringify(payload);
  const expiradas: number[] = [];
  const enviadas: number[] = [];

  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, json, {
          TTL: 60 * 60,
          urgency: "high",
          topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
        });
        enviadas.push(i.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        /* 404/410: o navegador cancelou a inscricao (app removido, permissao revogada...). */
        if (status === 404 || status === 410) expiradas.push(i.id);
        else console.error("[webPush] falha ao enviar", status, (e as Error).message);
      }
    })
  );

  if (expiradas.length) await db.delete(pushInscricoes).where(inArray(pushInscricoes.id, expiradas));
  if (enviadas.length) await db.update(pushInscricoes).set({ ultimo_envio_em: sql`now()` }).where(inArray(pushInscricoes.id, enviadas));
  return enviadas.length;
}

/** Envia para todos os aparelhos inscritos da loja (so de usuarios ativos). */
export async function enviarPushLoja(lojaId: number, payload: PayloadPush): Promise<number> {
  if (!configurar()) return 0;
  const linhas = await db
    .select({ inscricao: pushInscricoes })
    .from(pushInscricoes)
    .innerJoin(admins, eq(admins.id, pushInscricoes.admin_id))
    .where(and(eq(pushInscricoes.loja_id, lojaId), eq(admins.ativo, true)));
  return enviarPara(linhas.map((l) => l.inscricao), payload);
}

/** Envia so para uma inscricao (botao "Enviar teste"). */
export async function enviarPushEndpoint(lojaId: number, endpoint: string, payload: PayloadPush): Promise<number> {
  if (!configurar()) return 0;
  const linhas = await db
    .select()
    .from(pushInscricoes)
    .where(and(eq(pushInscricoes.loja_id, lojaId), eq(pushInscricoes.endpoint, endpoint)));
  return enviarPara(linhas, payload);
}

const TIPOS: Record<string, string> = { entrega: "Entrega", retirada: "Retirada", mesa: "Mesa" };

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Avisa os aparelhos da loja que chegou um pedido. Nunca lanca erro: chamado dentro de after(),
 * depois da resposta ao cliente, e uma falha de push nao pode afetar o pedido.
 */
export async function notificarPedidoNovo(lojaId: number, pedidoId: number, origem: "loja" | "garcom" = "loja"): Promise<void> {
  try {
    if (!configurar()) return;
    const [p] = await db
      .select({ tipo: pedidos.tipo, total: pedidos.total, agendamento: pedidos.agendamento, cliente: clientes.nome, mesa: mesas.nome })
      .from(pedidos)
      .leftJoin(clientes, eq(clientes.id, pedidos.cliente_id))
      .leftJoin(mesas, eq(mesas.id, pedidos.mesa_id))
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)))
      .limit(1);
    if (!p) return;

    const codigo = codigoDisplay(pedidoId, await pedidoCodigoBase(lojaId));
    const tipo = p.tipo === "mesa" && p.mesa ? p.mesa : TIPOS[p.tipo ?? ""] ?? "Pedido";
    const partes = [origem === "garcom" ? "Garçom" : p.cliente || "Cliente", tipo];
    if (p.agendamento) partes.push("Agendado");
    partes.push(brl(Number(p.total ?? 0)));

    await enviarPushLoja(lojaId, {
      titulo: `Novo pedido #${codigo}`,
      corpo: partes.join(" · "),
      url: `/ordermanager?pedido=${pedidoId}`,
      tag: `pedido-${pedidoId}`,
    });
  } catch (e) {
    console.error("[webPush] notificarPedidoNovo", (e as Error).message);
  }
}
