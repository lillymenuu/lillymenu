import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { gruposDoProduto, vincularGrupoProduto, desvincularGrupoProduto } from "@/db/queries/complementos";

/* Aba Complementos do modal de produto. GET ?produto_id= */
export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const produtoId = Number(new URL(request.url).searchParams.get("produto_id") ?? 0);
  if (produtoId <= 0) return NextResponse.json({ ok: false, msg: "Produto invalido." }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await gruposDoProduto(sessao.lojaId, produtoId)) });
}

/* POST { acao: "vincular" | "desvincular", produto_id, grupo_id } */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const produtoId = Number(body?.produto_id ?? 0);
  const grupoId = Number(body?.grupo_id ?? 0);
  if (produtoId <= 0 || grupoId <= 0) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  if (body.acao === "vincular") return NextResponse.json(await vincularGrupoProduto(sessao.lojaId, produtoId, grupoId));
  if (body.acao === "desvincular") return NextResponse.json(await desvincularGrupoProduto(sessao.lojaId, produtoId, grupoId));
  return NextResponse.json({ ok: false, msg: "Acao invalida." }, { status: 400 });
}
