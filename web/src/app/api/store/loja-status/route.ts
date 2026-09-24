import { NextResponse } from "next/server";
import { montarPerfilLoja } from "@/db/queries/lojaPerfil";
import { categoriasBloqueadas } from "@/db/queries/catalogo";
import { getConfig } from "@/db/queries/config";

/**
 * Equivalente de public/api/loja_status.php — usado pelo polling da Store pra
 * detectar mudancas de horario/pausa/catalogo sem precisar de F5 manual.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = Number(url.searchParams.get("loja_id") ?? "0");

  if (lojaId <= 0) {
    return NextResponse.json({ ok: false });
  }

  const baseUrl = `${url.protocol}//${url.host}/`;
  const [perfil, receberPedidosAtivo, bloqueadas] = await Promise.all([montarPerfilLoja(lojaId, { baseUrl }), getConfig(lojaId, "receber_pedidos_ativo", "1"), categoriasBloqueadas(lojaId)]);

  return NextResponse.json({
    ok: true,
    aberto: perfil.lojaAberta,
    receberPedidosAtivo: receberPedidosAtivo !== "0",
    pausaTitulo: perfil.pausaAtivaTitulo,
    pausaFim: perfil.pausaAtivaFim,
    proximoHorario: perfil.proximoHorario,
    entAtiva: perfil.entAtiva,
    retAtiva: perfil.retAtiva,
    semana: perfil.semanaHorarios,
    catalogoVersao: perfil.catalogoVersao,
    categoriasBloqueadas: bloqueadas,
  });
}
