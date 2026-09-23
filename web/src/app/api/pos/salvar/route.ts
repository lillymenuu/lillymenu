import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarPedidoPdv, type ItemCarrinhoPdv, type PagamentoPdvInput } from "@/db/queries/pdvSalvar";

function toBool01(v: unknown): boolean {
  return v === "1" || v === 1 || v === true;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type ItemPayload = { id?: number | null; nome?: string; qtd?: number; preco?: number; observacoes?: string; usar_pontos?: number; combosels?: { id: number; qtd?: number }[] | null };
type PagamentoPayload = { forma?: string; valor?: number };

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  let itensRaw: ItemPayload[] = [];
  try {
    itensRaw = typeof body.itens === "string" ? JSON.parse(body.itens) : Array.isArray(body.itens) ? body.itens : [];
  } catch {
    itensRaw = [];
  }
  const itens: ItemCarrinhoPdv[] = itensRaw.map((i) => ({
    id: i.id ? Number(i.id) : undefined,
    nome: String(i.nome ?? ""),
    preco: toNum(i.preco),
    qtd: toNum(i.qtd),
    observacoes: i.observacoes ? String(i.observacoes) : undefined,
    combosels: Array.isArray(i.combosels) ? i.combosels.map((s) => ({ id: Number(s.id), qtd: s.qtd !== undefined ? Number(s.qtd) : undefined })) : null,
    usarPontos: toBool01(i.usar_pontos),
  }));

  let pagamentosRaw: PagamentoPayload[] = [];
  try {
    pagamentosRaw = typeof body.pagamentos === "string" ? JSON.parse(body.pagamentos) : Array.isArray(body.pagamentos) ? body.pagamentos : [];
  } catch {
    pagamentosRaw = [];
  }
  const pagamentos: PagamentoPdvInput[] = pagamentosRaw.map((p) => ({ forma: String(p.forma ?? ""), valor: p.valor !== undefined ? toNum(p.valor) : undefined }));

  const resultado = await salvarPedidoPdv({
    lojaId: sessao.lojaId,
    adminId: sessao.id,
    perfil: sessao.perfil,
    clienteId: toNum(body.cliente_id),
    tipo: body.tipo === "entrega" ? "entrega" : "retirada",
    endereco: body.endereco ? String(body.endereco) : undefined,
    distanciaKm: toNum(body.distancia_km),
    agendamento: body.agendamento ? String(body.agendamento) : undefined,
    itens,
    taxaEntregaPost: body.taxa_entrega !== undefined ? toNum(body.taxa_entrega) : undefined,
    taxaEditada: toBool01(body.taxa_editada),
    formaPagamentoPrincipal: body.pagamento ? String(body.pagamento) : undefined,
    valorPago: body.valor_pago !== undefined ? toNum(body.valor_pago) : undefined,
    cupomCodigo: body.cupom ? String(body.cupom) : undefined,
    descontoTipo: body.desconto_tipo === "percent" ? "percent" : "valor",
    descontoValor: toNum(body.desconto_valor),
    taxaMaquininhaPercent: toNum(body.taxa_maquininha_percent),
    cashbackAplicado: toBool01(body.cashback_aplicado),
    cashbackUsado: toNum(body.cashback_usado),
    pagamentos,
    pagamentoDividido: toBool01(body.pagamento_dividido),
    caixaIdPost: body.caixa_id ? Number(body.caixa_id) : undefined,
    offlineUuid: body.offline_uuid ? String(body.offline_uuid) : undefined,
    pedidoEdicaoId: body.pedido_edicao_id ? Number(body.pedido_edicao_id) : undefined,
    observacoesCliente: body.observacoes_cliente ? String(body.observacoes_cliente) : undefined,
  });

  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, pedido_id: resultado.pedidoId, tipo: resultado.tipo });
}
