import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { getDadosFiscaisLoja, salvarDadosFiscaisLoja } from "@/db/queries/nfce";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const dados = await getDadosFiscaisLoja(sessao.lojaId);
  return NextResponse.json({ ok: true, dados });
}

export async function POST(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.razaoSocial !== "string" || body.razaoSocial.trim() === "") {
    return NextResponse.json({ ok: false, msg: "Razão social é obrigatória." }, { status: 400 });
  }

  const resultado = await salvarDadosFiscaisLoja(sessao.lojaId, {
    razaoSocial: body.razaoSocial,
    inscricaoEstadual: body.inscricaoEstadual || undefined,
    inscricaoMunicipal: body.inscricaoMunicipal || undefined,
    regimeTributario: Number(body.regimeTributario) || 1,
    regimeTributarioEspecial: Number(body.regimeTributarioEspecial) || 0,
    simplesNacional: Boolean(body.simplesNacional),
    ambienteProducao: Boolean(body.ambienteProducao),
    serieNfce: Number(body.serieNfce) || 1,
    numeroInicialNfce: Number(body.numeroInicialNfce) || 1,
    numeracaoAutomatica: body.numeracaoAutomatica !== false,
    idCodigoSegurancaContribuinte: body.idCodigoSegurancaContribuinte || undefined,
    codigoSegurancaContribuinte: body.codigoSegurancaContribuinte || undefined,
  });

  if (!resultado.ok) return NextResponse.json({ ok: false, msg: resultado.erro }, { status: 400 });
  return NextResponse.json({ ok: true });
}
