import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarProdutosAdmin, salvarProduto, alterarAtivoDestaque, excluirProduto } from "@/db/queries/produtosAdmin";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const produtos = await listarProdutosAdmin(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    produtos: produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo,
      preco_base: p.precoBase,
      preco: p.preco,
      ativo: p.ativo ? 1 : 0,
      categoria_id: p.categoriaId,
      categoria: p.categoria,
      estoque_quantidade: p.estoqueQuantidade,
      preco_promocional: p.precoPromocional,
      promo_desativado: p.promoDesativado ? 1 : 0,
      imagem: p.imagem,
      descricao: p.descricao,
      apenas_agendamento: p.apenasAgendamento ? 1 : 0,
      quantidade_minima: p.quantidadeMinima,
      pontos_ganho: p.pontosGanho,
      pontos_custo: p.pontosCusto,
      disponivel_catalogo: p.disponivelCatalogo ? 1 : 0,
      disponivel_mesa: p.disponivelMesa ? 1 : 0,
      dias_semana: p.diasSemana,
      horario_ini: p.horarioIni,
      horario_fim: p.horarioFim,
      data_fabricacao: p.dataFabricacao,
      data_validade: p.dataValidade,
      tem_variacoes: p.temVariacoes ? 1 : 0,
      destaque: p.destaque ? 1 : 0,
    })),
  });
}

export async function PATCH(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const ativo = body?.ativo === 0 || body?.ativo === 1 ? Boolean(body.ativo) : undefined;
  const destaque = body?.destaque === 0 || body?.destaque === 1 ? Boolean(body.destaque) : undefined;

  const resultado = await alterarAtivoDestaque(sessao.lojaId, id, ativo, destaque);
  return NextResponse.json(resultado);
}

export async function DELETE(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number(body?.id ?? 0);
  const resultado = await excluirProduto(sessao.lojaId, id);
  return NextResponse.json(resultado);
}

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const idRaw = body.id;
  const categoriaIdRaw = body.categoria_id;
  const precoPromoRaw = body.preco_promocional;

  const resultado = await salvarProduto(sessao.lojaId, {
    id: idRaw && Number(idRaw) > 0 ? Number(idRaw) : undefined,
    nome: typeof body.nome === "string" ? body.nome : "",
    codigo: typeof body.codigo === "string" ? body.codigo : undefined,
    preco: Number(body.preco ?? 0),
    categoriaId: categoriaIdRaw !== null && categoriaIdRaw !== undefined && categoriaIdRaw !== "" ? Number(categoriaIdRaw) : null,
    descricao: typeof body.descricao === "string" ? body.descricao : undefined,
    precoPromocional: precoPromoRaw !== "" && precoPromoRaw !== null && precoPromoRaw !== undefined ? Number(precoPromoRaw) : null,
    promoDesativado: Boolean(body.promo_desativado),
    ativo: Boolean(body.ativo),
    imagemBase64: typeof body.imagem_base64 === "string" ? body.imagem_base64 : undefined,
    imagemRemover: Boolean(body.imagem_remover),
    apenasAgendamento: Boolean(body.apenas_agendamento),
    quantidadeMinima: Number(body.quantidade_minima ?? 0),
    pontosGanho: Number(body.pontos_ganho ?? 0),
    pontosCusto: Number(body.pontos_custo ?? 0),
    disponivelCatalogo: Boolean(body.disponivel_catalogo),
    disponivelMesa: Boolean(body.disponivel_mesa),
    diasSemana: Array.isArray(body.dias_semana) ? body.dias_semana : [],
    horarioIni: typeof body.horario_ini === "string" ? body.horario_ini : undefined,
    horarioFim: typeof body.horario_fim === "string" ? body.horario_fim : undefined,
    dataFabricacao: typeof body.data_fabricacao === "string" ? body.data_fabricacao : undefined,
    dataValidade: typeof body.data_validade === "string" ? body.data_validade : undefined,
    temVariacoes: Boolean(body.tem_variacoes),
    variacoes: Array.isArray(body.variacoes) ? body.variacoes : [],
    extras: Array.isArray(body.extras) ? body.extras : [],
    complementosItens: Array.isArray(body.complementos_itens) ? body.complementos_itens : [],
  });

  return NextResponse.json(resultado);
}
