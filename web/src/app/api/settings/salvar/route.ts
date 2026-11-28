import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarConfiguracoes } from "@/db/queries/configuracoesLoja";
import { atualizarCadastroInicial } from "@/db/queries/cadastroLoja";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });

  const resultado = await salvarConfiguracoes(sessao.lojaId, body);
  if (!resultado.ok) return NextResponse.json(resultado);

  /* Primeiro acesso: o painel so e liberado quando Informacoes da loja chega a 100%. */
  const cadastroPendente = await atualizarCadastroInicial(sessao.lojaId);
  return NextResponse.json({ ...resultado, cadastroPendente });
}
