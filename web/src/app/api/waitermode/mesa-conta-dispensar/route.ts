import { NextResponse } from "next/server";
import { getSessaoAdmin, getSessaoGarcom } from "@/lib/session";
import { dispensarContaMesa } from "@/db/queries/modoGarcom";

/* Usado tanto pelo lojista (Modo Garcom/Gestor de Pedidos) quanto pelo proprio garcom logado
   no app de mesa — qualquer um dos dois pode confirmar que ja levou a conta. */
export async function POST(request: Request) {
  const admin = await getSessaoAdmin();
  const garcom = admin ? null : await getSessaoGarcom();
  const lojaId = admin?.lojaId ?? garcom?.lojaId;
  if (!lojaId) return NextResponse.json({ ok: false, msg: "Sessão expirada." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = Number((body as Record<string, unknown> | null)?.id ?? 0);

  const resultado = await dispensarContaMesa(lojaId, id);
  return NextResponse.json(resultado);
}
