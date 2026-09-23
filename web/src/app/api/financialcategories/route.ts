import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarCategoriasFinanceiras } from "@/db/queries/financeiroCore";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipoRaw = searchParams.get("tipo");
  const tipo = tipoRaw === "income" || tipoRaw === "expense" ? tipoRaw : "";

  const categorias = await listarCategoriasFinanceiras(sessao.lojaId, tipo || undefined, false);
  const nomesPorId = new Map(categorias.map((c) => [c.id, c.name]));

  return NextResponse.json({
    ok: true,
    tipo,
    categorias: categorias.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parent_id: c.parentId,
      parent_name: c.parentId !== null ? (nomesPorId.get(c.parentId) ?? null) : null,
      active: c.active,
    })),
  });
}
