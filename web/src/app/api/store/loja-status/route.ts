import { NextResponse } from "next/server";
import { storePhpFetch, StoreApiError } from "@/lib/store/api";
import type { StoreHorarioDia } from "@/lib/store/types";

type LojaStatusResposta = {
  ok: boolean;
  aberto: boolean;
  receberPedidosAtivo: boolean;
  pausaTitulo: string;
  pausaFim: string;
  proximoHorario: string;
  entAtiva: boolean;
  retAtiva: boolean;
  semana: StoreHorarioDia[];
  catalogoVersao: string;
  categoriasBloqueadas: number[];
};

/**
 * Proxy pro loja_status.php legado — usado pelo polling da Store pra
 * detectar mudancas de horario/pausa/catalogo sem precisar de F5 manual
 * (mesmo mecanismo que o loja.js legado ja usa, so implementado em React).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lojaId = url.searchParams.get("loja_id");

  if (!lojaId) {
    return NextResponse.json({ ok: false });
  }

  try {
    const data = await storePhpFetch<LojaStatusResposta>(`/public/api/loja_status.php?loja_id=${encodeURIComponent(lojaId)}`);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof StoreApiError ? e.status : 500;
    return NextResponse.json({ ok: false }, { status });
  }
}
