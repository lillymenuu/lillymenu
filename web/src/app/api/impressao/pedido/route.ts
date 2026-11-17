import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db";
import { cashbackMovimentacoes, pedidos, pontosMovimentacoes, produtos } from "@/db/schema";
import { getSessaoAdmin } from "@/lib/session";
import { detalhePedido } from "@/db/queries/pedidosAdmin";
import { getConfigs } from "@/db/queries/config";

/*
 * Dados do cupom pra impressao termica (QZ Tray) — mesmo formato que o
 * admin/api/pdv_detalhe.php devolve, pra que src/lib/impressao-qz.ts monte o
 * cupom igual ao do painel PHP.
 */
export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const pedidoId = Number(request.nextUrl.searchParams.get("pedido_id") ?? "0");
  if (!pedidoId) return NextResponse.json({ ok: false, msg: "Pedido invalido." });

  const lojaId = sessao.lojaId;
  const detalhe = await detalhePedido(lojaId, pedidoId);
  if (!detalhe.ok) return NextResponse.json(detalhe);

  const produtoIds = [...new Set(detalhe.itens.map((i) => i.produtoId).filter((id): id is number => !!id))];
  const [pontosProdutos, pontosMov, cashbackMov, cfg] = await Promise.all([
    produtoIds.length
      ? db
          .select({ id: produtos.id, pontos: produtos.pontos_ganho })
          .from(produtos)
          .where(and(inArray(produtos.id, produtoIds), eq(produtos.loja_id, lojaId)))
      : Promise.resolve([] as { id: number; pontos: number }[]),
    db
      .select({ total: sql<string>`coalesce(sum(${pontosMovimentacoes.pontos}), 0)` })
      .from(pontosMovimentacoes)
      .where(and(eq(pontosMovimentacoes.pedido_id, pedidoId), eq(pontosMovimentacoes.loja_id, lojaId), inArray(pontosMovimentacoes.tipo, ["ganho", "pendente"]))),
    db
      .select({ tipo: cashbackMovimentacoes.tipo, valor: cashbackMovimentacoes.valor })
      .from(cashbackMovimentacoes)
      .where(and(eq(cashbackMovimentacoes.pedido_id, pedidoId), eq(cashbackMovimentacoes.loja_id, lojaId))),
    getConfigs(lojaId, ["nome_loja", "loja_cnpj"]),
  ]);

  const pedido = detalhe.pedido as Record<string, unknown> & { codigo: number; cliente_id?: number | null; criado_em?: string | null };

  let pedidosNaLoja = 0;
  if (pedido.cliente_id) {
    const [linha] = await db
      .select({ total: sql<string>`count(*)` })
      .from(pedidos)
      .where(and(eq(pedidos.cliente_id, pedido.cliente_id), eq(pedidos.loja_id, lojaId), eq(pedidos.status, "finalizado")));
    pedidosNaLoja = Number(linha?.total ?? 0);
  }

  const pontosPorProduto = new Map(pontosProdutos.map((p) => [p.id, p.pontos]));

  let cashbackGanho = 0;
  let cashbackUsado = 0;
  for (const mov of cashbackMov) {
    if (mov.tipo === "entrada" || mov.tipo === "pendente") cashbackGanho += Number(mov.valor);
    else if (mov.tipo === "uso") cashbackUsado += Number(mov.valor);
  }

  const idCurto = `${String(pedido.codigo).padStart(4, "0")}-${createHash("md5").update(`${pedidoId}${pedido.criado_em ?? ""}`).digest("hex").slice(0, 8)}`;

  return NextResponse.json({
    ok: true,
    pedido: { ...pedido, editadoPor: undefined },
    itens: detalhe.itens.map((i) => ({
      produto_nome: i.produtoNome,
      quantidade: i.quantidade,
      preco: i.preco,
      observacoes: i.observacoes,
      pontos: (pontosPorProduto.get(i.produtoId ?? 0) ?? 0) * (i.quantidade ?? 1),
      opcoes: i.opcoes.map((o) => ({ titulo: o.titulo, nome: o.nome, quantidade: o.quantidade ?? 1 })),
    })),
    pagamentos: detalhe.pagamentos.map((p) => ({ forma: p.forma, valor: p.valor, taxa_maquininha: p.taxaMaquininha })),
    pontos_a_receber: Number(pontosMov[0]?.total ?? 0),
    pedidos_na_loja: pedidosNaLoja,
    cashback_ganho: cashbackGanho,
    cashback_usado: cashbackUsado,
    id_curto: idCurto,
    loja_nome: cfg.nome_loja || "Minha loja",
    loja_cnpj: cfg.loja_cnpj || "",
  });
}
