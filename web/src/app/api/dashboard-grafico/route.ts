import { NextRequest, NextResponse } from "next/server";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";

function erroResposta(e: unknown) {
  const status = e instanceof PhpApiError ? e.status : 500;
  const erro = e instanceof PhpApiError ? e.message : "Erro ao falar com a API.";
  return NextResponse.json({ ok: false, msg: erro }, { status });
}

type DashboardResponse = {
  ok: true;
  periodo: 7 | 15 | 30;
  grafico: {
    labels: string[];
    serie_pedidos: number[];
    serie_valores: number[];
  };
};

export async function GET(request: NextRequest) {
  const periodo = request.nextUrl.searchParams.get("periodo") ?? "7";
  try {
    const data = await phpApiFetch<DashboardResponse>(
      `/admin/api/v1/dashboard.php?periodo=${encodeURIComponent(periodo)}`
    );
    return NextResponse.json({ ok: true, periodo: data.periodo, grafico: data.grafico });
  } catch (e) {
    return erroResposta(e);
  }
}
