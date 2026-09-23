import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarEntregasMotoboy } from "@/db/queries/motoboys";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const periodo = params.get("periodo") ?? "hoje";
  const dataInicio = params.get("data_inicio") ?? "";
  const dataFim = params.get("data_fim") ?? "";
  const page = Number(params.get("page") ?? "1");
  const perPage = Number(params.get("per_page") ?? "10");

  const resultado = await listarEntregasMotoboy(sessao.lojaId, periodo, dataInicio, dataFim, page, perPage);
  return NextResponse.json({
    ok: true,
    entregas: resultado.entregas.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      status: e.status,
      criado_em: e.criadoEm,
      endereco_entrega: e.enderecoEntrega,
      taxa_entrega: e.taxaEntrega,
      cliente_nome: e.clienteNome,
      cliente_telefone: e.clienteTelefone,
      motoboy_nome: e.motoboyNome,
      motoboy_whatsapp: e.motoboyWhatsapp,
    })),
    total: resultado.total,
    page: resultado.page,
    per_page: resultado.perPage,
    total_pages: resultado.totalPages,
    mostrando_de: resultado.mostrandoDe,
    mostrando_ate: resultado.mostrandoAte,
  });
}
