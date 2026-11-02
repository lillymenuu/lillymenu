import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarItemComplemento, alterarAtivoItemComplemento, excluirItemComplemento } from "@/db/queries/complementos";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarItemComplemento(sessao.lojaId, {
    id: Number(body.id) > 0 ? Number(body.id) : undefined,
    grupoId: Number(body.grupo_id ?? 0),
    nome: typeof body.nome === "string" ? body.nome : "",
    descricao: typeof body.descricao === "string" ? body.descricao : "",
    preco: Number(body.preco ?? 0),
    podeRepetir: body.pode_repetir !== false,
    controlaEstoque: body.controla_estoque === true,
    estoqueQuantidade: Number(body.estoque_quantidade ?? 0),
    pontosGanho: Number(body.pontos_ganho ?? 0),
    pontosCusto: Number(body.pontos_custo ?? 0),
    imagemBase64: typeof body.imagem_base64 === "string" && body.imagem_base64 ? body.imagem_base64 : undefined,
    imagemRemover: body.imagem_remover === true,
  });
  return NextResponse.json(resultado);
}

export async function PATCH(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  return NextResponse.json(await alterarAtivoItemComplemento(sessao.lojaId, Number(body?.id ?? 0), body?.ativo === true));
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  return NextResponse.json(await excluirItemComplemento(sessao.lojaId, Number(body?.id ?? 0)));
}
