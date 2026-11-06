import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfig } from "@/db/queries/config";
import { listarDesperdicios } from "@/db/queries/desperdicios";
import { filtrosDaUrl } from "@/lib/desperdicios";
import { gerarExcelDesperdicio } from "@/lib/desperdiciosExcel";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const filtros = filtrosDaUrl(new URL(request.url).searchParams);
  const [itens, nomeLoja] = await Promise.all([listarDesperdicios(sessao.lojaId, filtros), getConfig(sessao.lojaId, "nome_loja", "Loja")]);

  const excel = await gerarExcelDesperdicio({ loja: { nome: nomeLoja }, filtros, itens });

  return new Response(new Uint8Array(excel), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=desperdicios-${filtros.de}${filtros.ate !== filtros.de ? `-a-${filtros.ate}` : ""}.xlsx`,
      "Cache-Control": "private, no-store",
    },
  });
}
