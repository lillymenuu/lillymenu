import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { atualizarStatusPedido } from "@/db/queries/pedidosStatus";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id ?? 0);
  const status = String(body.status ?? "");
  /* "de": status que a tela mostrava — recusa se o pedido ja mudou em outro aparelho. */
  const de = typeof body.de === "string" && body.de ? body.de : undefined;
  const resultado = await atualizarStatusPedido(sessao.lojaId, sessao.id, id, status, de);
  return NextResponse.json(resultado);
}
