import { NextResponse } from "next/server";
import { getSessaoGarcom } from "@/lib/session";
import { criarPedidoMesa, type ItemPedidoMesa } from "@/db/queries/modoGarcom";

type ItemPayload = { id?: number; nome?: string; preco?: number; qtd?: number; obs?: string; combosels?: { id: number; qtd?: number }[] | null };

/* Equivalente de public/api/garcom_pedido_criar.php. */
export async function POST(request: Request) {
  const sessao = await getSessaoGarcom();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Sessão do garçom expirada. Faça login novamente." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, msg: "Requisição inválida" }, { status: 400 });

  const b = body as Record<string, unknown>;
  const itensRaw = Array.isArray(b.itens) ? (b.itens as ItemPayload[]) : [];
  const itens: ItemPedidoMesa[] = itensRaw.map((i) => ({
    id: i.id,
    nome: String(i.nome ?? ""),
    preco: Number(i.preco ?? 0),
    qtd: Number(i.qtd ?? 1),
    obs: i.obs,
    combosels: i.combosels ?? null,
  }));

  const resultado = await criarPedidoMesa({
    lojaId: sessao.lojaId,
    garcomId: sessao.id,
    mesaId: Number(b.mesa_id ?? 0),
    itens,
    formaPagamento: String(b.forma_pagamento ?? ""),
    trocoSolicitado: Boolean(b.troco_solicitado),
    trocoValor: b.troco_valor !== undefined ? Number(b.troco_valor) : undefined,
  });

  return NextResponse.json(resultado);
}
