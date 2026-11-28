import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { salvarEnderecoCliente } from "@/db/queries/clientesAdmin";

/** Guarda no cadastro do cliente o endereco informado na entrega do PDV. Body: { cliente_id, rua, numero, bairro, cidade, cep, complemento }. */
export async function POST(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, msg: "Dados invalidos." }, { status: 400 });
  const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");

  const resultado = await salvarEnderecoCliente(sessao.lojaId, Number(body.cliente_id ?? 0), {
    rua: texto(body.rua),
    numero: texto(body.numero),
    bairro: texto(body.bairro),
    cidade: texto(body.cidade),
    cep: texto(body.cep),
    complemento: texto(body.complemento),
  });
  return NextResponse.json(resultado);
}
