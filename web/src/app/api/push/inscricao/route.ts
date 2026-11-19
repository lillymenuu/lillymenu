import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushInscricoes } from "@/db/schema";
import { getSessaoAdmin } from "@/lib/session";
import { chavePublicaVapid } from "@/lib/webPush";

/* Web Push do Gestor de pedidos: GET = chave publica VAPID, POST = salva a inscricao do aparelho,
   DELETE = remove (botao "Desativar"). */

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false }, { status: 401 });
  const chave = chavePublicaVapid();
  if (!chave) return NextResponse.json({ ok: false, msg: "Notificações não configuradas no servidor." });
  return NextResponse.json({ ok: true, chave });
}

type InscricaoPayload = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão expirada." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as InscricaoPayload | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint.startsWith("https://") || !p256dh || !auth || p256dh.length > 255 || auth.length > 255 || endpoint.length > 2000) {
    return NextResponse.json({ ok: false, msg: "Inscrição inválida." }, { status: 400 });
  }

  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255) || null;
  await db
    .insert(pushInscricoes)
    .values({ loja_id: sessao.lojaId, admin_id: sessao.id, endpoint, p256dh, auth, user_agent: userAgent })
    .onConflictDoUpdate({
      target: pushInscricoes.endpoint,
      set: { loja_id: sessao.lojaId, admin_id: sessao.id, p256dh, auth, user_agent: userAgent },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão expirada." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await db.delete(pushInscricoes).where(and(eq(pushInscricoes.loja_id, sessao.lojaId), eq(pushInscricoes.endpoint, endpoint)));
  }
  return NextResponse.json({ ok: true });
}
