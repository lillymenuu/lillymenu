import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalhePedido } from "@/db/queries/pedidosAdmin";
import { getConfig } from "@/db/queries/config";
import { gerarPdfPedido } from "@/lib/pedidoPdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const id = Number(request.nextUrl.searchParams.get("id") ?? "0");
  const resultado = await detalhePedido(sessao.lojaId, id);
  if (!resultado.ok) return NextResponse.json(resultado, { status: 404 });

  const [nomeLoja, logoUrl] = await Promise.all([
    getConfig(sessao.lojaId, "nome_loja", "Loja"),
    getConfig(sessao.lojaId, "loja_perfil", ""),
  ]);

  const p = resultado.pedido as Record<string, unknown>;
  const pdf = await gerarPdfPedido({
    loja: { nome: nomeLoja, logoUrl },
    pedido: {
      codigo: Number(p.codigo ?? 0),
      status: String(p.status ?? ""),
      tipo: String(p.tipo ?? ""),
      origem: (p.origem as string | null) ?? null,
      criadoEm: String(p.criado_em ?? ""),
      agendamento: (p.agendamento as string | null) ?? null,
      nome: String(p.nome ?? ""),
      telefone: String(p.telefone ?? ""),
      enderecoEntrega: (p.endereco_entrega as string | null) ?? null,
      observacoesCliente: (p.observacoes_cliente as string | null) ?? null,
      motoboyNome: (p.motoboy_nome as string | null) ?? null,
      subtotal: Number(p.subtotal ?? 0),
      desconto: Number(p.desconto ?? 0),
      taxaEntrega: Number(p.taxa_entrega ?? 0),
      taxaMaquininha: Number(p.taxa_maquininha ?? 0),
      cashbackValor: Number(p.cashback_valor ?? 0),
      cashbackUsado: Number(p.cashback_usado ?? 0),
      total: Number(p.total ?? 0),
    },
    itens: resultado.itens.map((i) => ({
      nome: i.produtoNome ?? "",
      quantidade: i.quantidade ?? 0,
      preco: i.preco ?? 0,
      observacoes: i.observacoes,
      opcoes: i.opcoes.map((o) => ({ titulo: o.titulo, nome: o.nome })),
    })),
    pagamentos: resultado.pagamentos.map((pg) => ({ forma: pg.forma, valor: pg.valor })),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=pedido-${p.codigo ?? id}.pdf`,
      "Cache-Control": "private, no-store",
    },
  });
}
