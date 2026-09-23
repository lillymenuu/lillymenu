import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { reordenarPassosCombo } from "@/db/queries/combosAdmin";

export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const comboId = Number(body?.combo_id ?? 0);
  const passoIdsRaw = body?.passo_ids;
  const passoIds =
    typeof passoIdsRaw === "string"
      ? passoIdsRaw.split(",").map((s: string) => Number(s.trim()))
      : Array.isArray(passoIdsRaw)
        ? passoIdsRaw.map((n: unknown) => Number(n))
        : [];

  const resultado = await reordenarPassosCombo(sessao.lojaId, comboId, passoIds);
  return NextResponse.json(resultado);
}
