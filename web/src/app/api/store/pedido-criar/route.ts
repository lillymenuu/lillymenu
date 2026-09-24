import { NextResponse } from "next/server";
import { criarPedidoLoja, type ItemCarrinho } from "@/db/queries/pedidoCriar";

type ItemPayload = { id?: number; nome?: string; preco?: number; qtd?: number; obs?: string; combosels?: { id: number; qtd?: number }[] | null; crossSell?: boolean; pontosPendente?: boolean };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, msg: "Corpo invalido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (!b.loja_id || !b.itens) {
    return NextResponse.json({ ok: false, msg: "Parametros invalidos" }, { status: 400 });
  }

  const itensRaw = Array.isArray(b.itens) ? (b.itens as ItemPayload[]) : [];
  const itens: ItemCarrinho[] = itensRaw.map((i) => ({
    id: i.id,
    nome: String(i.nome ?? ""),
    preco: Number(i.preco ?? 0),
    qtd: Number(i.qtd ?? 1),
    obs: i.obs,
    combosels: i.combosels ?? null,
    crossSell: Boolean(i.crossSell),
    pontosPendente: Boolean(i.pontosPendente),
  }));

  let agendamento: { data: string; slot: string } | null = null;
  if (typeof b.agendamento === "string" && b.agendamento.trim() !== "") {
    try {
      const parsed = JSON.parse(b.agendamento) as { data?: string; slot?: string };
      if (parsed.data) agendamento = { data: parsed.data, slot: parsed.slot ?? "" };
    } catch {
      /* ignora agendamento invalido */
    }
  }

  const resultado = await criarPedidoLoja({
    lojaId: Number(b.loja_id),
    clienteNome: String(b.cliente_nome ?? ""),
    clienteTelefone: String(b.cliente_telefone ?? ""),
    tipo: b.tipo === "entrega" ? "entrega" : "retirada",
    formaPagamento: String(b.forma_pagamento ?? ""),
    endereco: typeof b.endereco === "string" ? b.endereco : undefined,
    subtotal: Number(b.subtotal ?? 0),
    taxaEntrega: b.taxa_entrega !== undefined ? Number(b.taxa_entrega) : undefined,
    total: Number(b.total ?? 0),
    itens,
    trocoSolicitado: Boolean(b.troco_solicitado),
    trocoValor: b.troco_valor !== undefined ? Number(b.troco_valor) : undefined,
    cashbackUsar: Boolean(b.cashback_usar),
    cashbackValor: b.cashback_valor !== undefined ? Number(b.cashback_valor) : undefined,
    tipoAgendamento: typeof b.tipo_agendamento === "string" ? b.tipo_agendamento : undefined,
    agendamento,
    cupomCodigo: typeof b.cupom_codigo === "string" ? b.cupom_codigo : undefined,
    cupomDesconto: b.cupom_desconto !== undefined ? Number(b.cupom_desconto) : undefined,
  });

  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, id: resultado.id, codigo: resultado.codigo, token: String(resultado.id) });
}
