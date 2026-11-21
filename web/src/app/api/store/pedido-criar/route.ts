import { NextResponse, after } from "next/server";
import { notificarPedidoNovo } from "@/lib/webPush";
import { criarPedidoLoja, type EnderecoPartes, type ItemCarrinho } from "@/db/queries/pedidoCriar";
import { recalcularPedidoLoja } from "@/db/queries/pedidoRecalculo";
import { tokenPedido } from "@/db/queries/tokenPublico";

type ItemPayload = {
  id?: number;
  tipo?: string;
  nome?: string;
  preco?: number;
  qtd?: number;
  obs?: string;
  combosels?: { id: number; qtd?: number }[] | null;
  crossSell?: boolean;
  pontosPendente?: boolean;
  variacao_id?: number | null;
  selecoes_grupos?: Record<string, number[]> | null;
  complementos?: { id: number; qtd?: number }[] | null;
};

function lerEnderecoPartes(v: unknown): EnderecoPartes | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const txt = (k: string, max: number) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
  return { cep: txt("cep", 20), rua: txt("rua", 255), numero: txt("numero", 20), bairro: txt("bairro", 100), complemento: txt("complemento", 255), cidade: txt("cidade", 100), estado: txt("estado", 50) };
}

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
    tipo: i.tipo === "combo" ? "combo" : "produto",
    nome: String(i.nome ?? ""),
    preco: Number(i.preco ?? 0),
    qtd: Number(i.qtd ?? 1),
    obs: i.obs,
    combosels: i.combosels ?? null,
    crossSell: Boolean(i.crossSell),
    pontosPendente: Boolean(i.pontosPendente),
    variacaoId: i.variacao_id ?? null,
    selecoesGrupos: i.selecoes_grupos ?? null,
    complementos: Array.isArray(i.complementos)
      ? i.complementos.map((c) => ({ id: Number(c.id), qtd: Number(c.qtd ?? 1) })).filter((c) => c.id > 0 && c.qtd > 0)
      : null,
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

  const recalculo = await recalcularPedidoLoja({
    lojaId: Number(b.loja_id),
    clienteNome: String(b.cliente_nome ?? ""),
    clienteTelefone: String(b.cliente_telefone ?? ""),
    tipo: b.tipo === "mesa" ? "mesa" : b.tipo === "entrega" ? "entrega" : "retirada",
    mesaId: b.mesa_id !== undefined ? Number(b.mesa_id) : undefined,
    formaPagamento: String(b.forma_pagamento ?? ""),
    endereco: typeof b.endereco === "string" ? b.endereco : undefined,
    enderecoPartes: lerEnderecoPartes(b.endereco_partes),
    subtotal: Number(b.subtotal ?? 0),
    taxaEntrega: b.taxa_entrega !== undefined ? Number(b.taxa_entrega) : undefined,
    taxaServico: b.taxa_servico !== undefined ? Number(b.taxa_servico) : undefined,
    taxaMaquininha: b.taxa_maquininha !== undefined ? Number(b.taxa_maquininha) : undefined,
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
    clienteAniversario: typeof b.cliente_aniversario === "string" ? b.cliente_aniversario : undefined,
    clienteCpfCnpj: typeof b.cliente_cpf_cnpj === "string" ? b.cliente_cpf_cnpj : undefined,
  });

  /* Precos, taxas, cupom e total sao refeitos no servidor (ver pedidoRecalculo.ts). */
  if (!recalculo.ok) return NextResponse.json(recalculo);

  const resultado = await criarPedidoLoja(recalculo.input);
  if (!resultado.ok) return NextResponse.json(resultado);
  /* Push no celular de quem ativou as notificacoes no Gestor de pedidos — depois da resposta. */
  const lojaId = Number(b.loja_id);
  const pedidoId = resultado.id;
  after(() => notificarPedidoNovo(lojaId, pedidoId, "loja"));
  return NextResponse.json({ ok: true, id: resultado.id, codigo: resultado.codigo, token: tokenPedido(resultado.id) });
}
