import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { listarNotasFiscais } from "@/db/queries/nfce";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) return NextResponse.json({ ok: false, msg: "Recurso exclusivo do plano Essencial." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const periodo = params.get("periodo") || "30dias";
  const dataIni = params.get("data_ini") || undefined;
  const dataFim = params.get("data_fim") || undefined;

  const resultado = await listarNotasFiscais(sessao.lojaId, periodo, dataIni, dataFim);
  return NextResponse.json({ ok: true, ...resultado });
}
