import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfig } from "@/db/queries/config";
import { listarDesperdicios } from "@/db/queries/desperdicios";
import { filtrosDaUrl } from "@/lib/desperdicios";
import { gerarPdfDesperdicio } from "@/lib/desperdiciosPdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const filtros = filtrosDaUrl(new URL(request.url).searchParams);
  const [itens, nomeLoja, logoUrl] = await Promise.all([
    listarDesperdicios(sessao.lojaId, filtros),
    getConfig(sessao.lojaId, "nome_loja", "Loja"),
    getConfig(sessao.lojaId, "loja_perfil", ""),
  ]);

  const pdf = await gerarPdfDesperdicio({ loja: { nome: nomeLoja, logoUrl }, filtros, itens });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=desperdicios-${filtros.de}${filtros.ate !== filtros.de ? `-a-${filtros.ate}` : ""}.pdf`,
      "Cache-Control": "private, no-store",
    },
  });
}
