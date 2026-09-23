import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { detalheOrcamento } from "@/db/queries/orcamentos";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { id } = await params;
  const resultado = await detalheOrcamento(sessao.lojaId, Number(id));
  if (!resultado.ok) return NextResponse.json(resultado);

  const o = resultado.orcamento;
  return NextResponse.json({
    ok: true,
    orcamento: {
      id: o.id,
      status: o.status,
      cliente_nome: o.clienteNome,
      cliente_tipo_documento: o.clienteTipoDocumento,
      cliente_documento: o.clienteDocumento,
      cliente_whatsapp: o.clienteWhatsapp,
      cliente_endereco: o.clienteEndereco,
      desconto_tipo: o.descontoTipo,
      desconto_valor: o.descontoValor,
      subtotal: o.subtotal,
      total: o.total,
      criado_em: o.criadoEm,
      atualizado_em: o.atualizadoEm,
    },
    itens: resultado.itens.map((i) => ({ id: i.id, produto_id: i.produtoId, nome: i.nome, preco: i.preco, qtd: i.qtd, observacoes: i.observacoes })),
  });
}
