import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { pnConsultarCep } from "@/db/queries/plugnotas";

/* Preenche o endereco da loja (Informacoes da loja) a partir do CEP, incluindo o codigo IBGE
   exigido pro cadastro fiscal da NFCe. Usa o ViaCEP (gratuito, ja traz o IBGE); o PlugNotas fica
   so de reserva, porque nem toda loja tem a API key configurada. */
async function consultarViaCep(cep: string) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d || d.erro) return null;
    return {
      logradouro: String(d.logradouro ?? ""),
      bairro: String(d.bairro ?? ""),
      municipio: String(d.localidade ?? ""),
      uf: String(d.uf ?? ""),
      ibge: String(d.ibge ?? ""),
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Não autenticado." }, { status: 401 });

  const cep = (request.nextUrl.searchParams.get("cep") ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return NextResponse.json({ ok: false, msg: "CEP inválido." }, { status: 400 });

  const viaCep = await consultarViaCep(cep);
  if (viaCep) return NextResponse.json({ ok: true, endereco: viaCep });

  const resultado = await pnConsultarCep(cep, false);
  if (!resultado.ok) return NextResponse.json({ ok: false, msg: "CEP não encontrado." }, { status: 400 });
  return NextResponse.json({ ok: true, endereco: resultado.dados });
}
