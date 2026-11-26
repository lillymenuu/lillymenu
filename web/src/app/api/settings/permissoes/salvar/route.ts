import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarNivelAcesso } from "@/db/queries/permissoesNiveis";

/** Cria ou edita um nivel de acesso personalizado da loja. Body: { id?, nome, permissoes: string[] }. */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarNivelAcesso(sessao.lojaId, sessao.id, sessao.perfil, {
    id: Number(body.id ?? 0),
    nome: typeof body.nome === "string" ? body.nome : "",
    permissoes: Array.isArray(body.permissoes) ? body.permissoes.map(String) : [],
  });
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
