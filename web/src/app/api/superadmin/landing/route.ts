import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessaoSuperadmin } from "@/lib/session";
import { getLandingConfig } from "@/db/queries/landingConfig";
import { salvarLandingConfig, salvarImagensLanding } from "@/db/queries/landingConfigAdmin";

export async function GET() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const config = await getLandingConfig();
  return NextResponse.json({ ok: true, config });
}

export async function POST(request: Request) {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.valores !== "object") return NextResponse.json({ ok: false, msg: "Dados inválidos." }, { status: 400 });

  const valores: Record<string, string> = { ...body.valores };

  const imagens: { chave: string; dataUri: string }[] = Array.isArray(body.imagens) ? body.imagens : [];
  const urlsImagens = await salvarImagensLanding(imagens);
  Object.assign(valores, urlsImagens);

  await salvarLandingConfig(valores);

  /* A home usa ISR (revalidate=300 em app/page.tsx) — sem isso, o site no ar so refletiria a
     edicao depois de ate 5min (e so na proxima visita apos a janela expirar), o que parecia pro
     usuario que o editor "nao tinha nada a ver" com a pagina publica. */
  revalidatePath("/");

  return NextResponse.json({ ok: true, config: valores });
}
