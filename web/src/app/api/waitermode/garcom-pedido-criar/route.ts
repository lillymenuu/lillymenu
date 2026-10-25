import { NextResponse } from "next/server";
import { getSessaoGarcom } from "@/lib/session";
import { criarPedidoMesa, type ItemPedidoMesa, type PagamentoMesaInput } from "@/db/queries/modoGarcom";

type ItemPayload = {
  id?: number;
  nome?: string;
  preco?: number;
  qtd?: number;
  obs?: string;
  combosels?: { id: number; qtd?: number }[] | null;
  variacao_id?: number | null;
  selecoes_grupos?: Record<string, number[]> | null;
};

type PagamentoPayload = { forma?: string; valor?: number };

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
    variacaoId: i.variacao_id ?? null,
    selecoesGrupos: i.selecoes_grupos ?? null,
  }));

  const pagamentosRaw = Array.isArray(b.pagamentos) ? (b.pagamentos as PagamentoPayload[]) : [];
  const pagamentos: PagamentoMesaInput[] = pagamentosRaw.map((p) => ({ forma: String(p.forma ?? ""), valor: Number(p.valor ?? 0) }));

  const resultado = await criarPedidoMesa({
    lojaId: sessao.lojaId,
    garcomId: sessao.id,
    mesaId: Number(b.mesa_id ?? 0),
    itens,
    pagamentos,
    valorPago: b.valor_pago !== undefined ? Number(b.valor_pago) : undefined,
    descontoTipo: b.desconto_tipo === "percent" ? "percent" : "valor",
    descontoValor: b.desconto_valor !== undefined ? Number(b.desconto_valor) : undefined,
    clienteNome: typeof b.cliente_nome === "string" ? b.cliente_nome : undefined,
  });

  return NextResponse.json(resultado);
}
