import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import {
  opcoesEstoqueComplemento,
  detalheEstoqueComplemento,
  vincularEstoqueItem,
  desvincularEstoqueItem,
  salvarEstoqueComplemento,
  apagarEstoqueComplemento,
  listarItensParaVinculo,
  type EstoqueTipo,
} from "@/db/queries/complementosEstoque";

function tipoValido(v: unknown): EstoqueTipo | null {
  return v === "produto" || v === "complemento" ? v : null;
}

/*
 * GET ?lista=opcoes -> estoques que um item pode usar
 * GET ?lista=itens  -> itens de complemento (para "vincular outros itens")
 * GET ?tipo=&id=    -> detalhe de um estoque (saldo + itens vinculados)
 */
export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const lista = url.searchParams.get("lista");
  if (lista === "opcoes") return NextResponse.json({ ok: true, opcoes: await opcoesEstoqueComplemento(sessao.lojaId) });
  if (lista === "itens") return NextResponse.json({ ok: true, itens: await listarItensParaVinculo(sessao.lojaId) });

  const tipo = tipoValido(url.searchParams.get("tipo"));
  const id = Number(url.searchParams.get("id") ?? 0);
  if (!tipo || id <= 0) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
  return NextResponse.json(await detalheEstoqueComplemento(sessao.lojaId, tipo, id));
}

/* POST { acao: "vincular" | "desvincular" | "salvar" | "apagar", ... } */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const lojaId = sessao.lojaId;
  const itemId = Number(body.item_id ?? 0);
  const id = Number(body.id ?? 0);
  const tipo = tipoValido(body.tipo);

  switch (body.acao) {
    case "vincular":
      if (!tipo) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
      return NextResponse.json(await vincularEstoqueItem(lojaId, itemId, tipo, id));
    case "desvincular":
      return NextResponse.json(await desvincularEstoqueItem(lojaId, itemId));
    case "salvar":
      return NextResponse.json(
        await salvarEstoqueComplemento(lojaId, {
          tipo: tipo ?? "complemento",
          id: id > 0 ? id : undefined,
          itemOrigemId: itemId > 0 ? itemId : undefined,
          quantidade: Number(body.quantidade ?? 0),
          quantidadeMinima: Number(body.quantidade_minima ?? 0),
          itemIds: Array.isArray(body.item_ids) ? body.item_ids.map(Number) : [],
        })
      );
    case "apagar":
      return NextResponse.json(await apagarEstoqueComplemento(lojaId, id));
    default:
      return NextResponse.json({ ok: false, msg: "Acao invalida." }, { status: 400 });
  }
}
