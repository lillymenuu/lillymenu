import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarOrcamento } from "@/db/queries/orcamentos";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const itens = Array.isArray(body.itens)
    ? body.itens.map((i: Record<string, unknown>) => ({ produtoId: i.produto_id, nome: i.nome, preco: i.preco, qtd: i.qtd, observacoes: i.observacoes }))
    : [];

  const resultado = await salvarOrcamento(sessao.lojaId, sessao.id, {
    id: Number(body.id ?? 0) > 0 ? Number(body.id) : undefined,
    clienteNome: typeof body.cliente_nome === "string" ? body.cliente_nome : "",
    clienteTipoDocumento: typeof body.cliente_tipo_documento === "string" ? body.cliente_tipo_documento : undefined,
    clienteDocumento: typeof body.cliente_documento === "string" ? body.cliente_documento : undefined,
    clienteWhatsapp: typeof body.cliente_whatsapp === "string" ? body.cliente_whatsapp : undefined,
    clienteEndereco: typeof body.cliente_endereco === "string" ? body.cliente_endereco : undefined,
    descontoTipo: typeof body.desconto_tipo === "string" ? body.desconto_tipo : undefined,
    descontoValor: body.desconto_valor,
    itens,
  });

  return NextResponse.json(resultado);
}
