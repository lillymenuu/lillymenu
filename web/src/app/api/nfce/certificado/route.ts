import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { salvarCertificadoFiscal } from "@/db/queries/nfce";

export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  const senha = form?.get("senha");
  if (!form || !(arquivo instanceof File) || typeof senha !== "string" || senha === "") {
    return NextResponse.json({ ok: false, msg: "Envie o arquivo do certificado e a senha." }, { status: 400 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const resultado = await salvarCertificadoFiscal(sessao.lojaId, buffer, arquivo.name, senha);
  if (!resultado.ok) return NextResponse.json({ ok: false, msg: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
