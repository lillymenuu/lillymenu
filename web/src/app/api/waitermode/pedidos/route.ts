import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { pedidosMesas } from "@/db/queries/modoGarcom";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const pedidos = await pedidosMesas(sessao.lojaId);
  return NextResponse.json({
    ok: true,
    pedidos: pedidos.map((p) => ({ id: p.id, codigo: p.codigo, status: p.status, total: p.total, criado_em: p.criadoEm, mesa_id: p.mesaId, mesa_nome: p.mesaNome, garcom_id: p.garcomId, garcom_nome: p.garcomNome })),
  });
}
