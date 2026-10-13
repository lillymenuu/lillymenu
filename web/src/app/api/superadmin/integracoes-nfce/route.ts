import { NextResponse } from "next/server";
import { getSessaoSuperadmin } from "@/lib/session";
import { getProvedorNfceAtivo, salvarProvedorNfceAtivo, type ProvedorNfce } from "@/db/queries/nfce";

function statusCredenciais() {
  return {
    plugnotas: {
      sandbox: Boolean((process.env.PLUGNOTAS_API_KEY_SANDBOX ?? "").trim()),
      producao: Boolean((process.env.PLUGNOTAS_API_KEY_PRODUCAO ?? "").trim()),
    },
    focusnfe: {
      sandbox: Boolean((process.env.FOCUSNFE_TOKEN_SANDBOX ?? "").trim()),
      producao: Boolean((process.env.FOCUSNFE_TOKEN_PRODUCAO ?? "").trim()),
    },
  };
}

export async function GET() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const provedorAtivo = await getProvedorNfceAtivo();
  return NextResponse.json({ ok: true, provedorAtivo, credenciais: statusCredenciais() });
}

export async function POST(request: Request) {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const provedor = body?.provedor as ProvedorNfce;
  if (provedor !== "plugnotas" && provedor !== "focusnfe") {
    return NextResponse.json({ ok: false, msg: "Provedor inválido." }, { status: 400 });
  }

  await salvarProvedorNfceAtivo(provedor);
  return NextResponse.json({ ok: true });
}
