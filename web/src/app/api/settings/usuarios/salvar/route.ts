import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarUsuario } from "@/db/queries/usuariosAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarUsuario(sessao.lojaId, sessao.id, sessao.perfil, {
    id: body.id ? Number(body.id) : undefined,
    nome: String(body.nome ?? ""),
    email: String(body.email ?? ""),
    permissaoId: Number(body.permissao_id ?? 0),
  });

  if (!resultado.ok) return NextResponse.json(resultado);
  return NextResponse.json({ ok: true, id: resultado.id, nome: resultado.nome, codigo_acesso: resultado.codigoAcesso });
}
