import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarOrcamentos } from "@/db/queries/orcamentos";

export async function GET() {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const orcamentos = await listarOrcamentos(sessao.lojaId, "");
  return NextResponse.json({
    ok: true,
    orcamentos: orcamentos.map((o) => ({ id: o.id, status: o.status, cliente_nome: o.clienteNome, total: o.total, itens_count: o.itensCount, criado_em: o.criadoEm, atualizado_em: o.atualizadoEm })),
  });
}
