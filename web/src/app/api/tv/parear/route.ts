import { NextResponse } from "next/server";
import { criarPareamento } from "@/db/queries/midiaIndoor";

/* Player da TV (/tv, sem login): gera o codigo mostrado no QR e o segredo que so a TV conhece. */
export async function POST() {
  try {
    const p = await criarPareamento();
    return NextResponse.json({ ok: true, ...p });
  } catch {
    return NextResponse.json({ ok: false, msg: "Não foi possível gerar o código." }, { status: 500 });
  }
}
