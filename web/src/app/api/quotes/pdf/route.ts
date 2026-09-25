import { NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { getConfigs } from "@/db/queries/config";
import { detalheOrcamento } from "@/db/queries/orcamentos";
import { gerarPdfOrcamento } from "@/lib/orcamentoPdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") ?? 0);
  const tipo = searchParams.get("tipo") === "recibo" ? "recibo" : "orcamento";

  const [detalhe, cfg] = await Promise.all([
    detalheOrcamento(sessao.lojaId, id),
    getConfigs(sessao.lojaId, ["nome_loja", "loja_contato", "loja_perfil", "loja_capa", "loja_rua", "loja_numero", "loja_bairro", "loja_cidade", "loja_estado", "loja_cep"]),
  ]);
  if (!detalhe.ok) return NextResponse.json({ ok: false, msg: detalhe.msg }, { status: 404 });

  const { orcamento: o, itens } = detalhe;
  const cidadeUf = [cfg.loja_cidade, cfg.loja_estado].filter(Boolean).join("/");
  const endereco = [
    [cfg.loja_rua, cfg.loja_numero].filter(Boolean).join(", "),
    cfg.loja_bairro,
    cidadeUf,
  ]
    .filter(Boolean)
    .join(" - ") + (cfg.loja_cep ? ` - CEP: ${cfg.loja_cep}` : "");

  const juridica = o.clienteTipoDocumento === "juridica";
  const pdf = await gerarPdfOrcamento({
    tipo,
    loja: {
      nome: cfg.nome_loja || "Loja",
      contato: cfg.loja_contato,
      endereco,
      logoUrl: cfg.loja_perfil,
      capaUrl: cfg.loja_capa,
    },
    cliente: {
      nome: o.clienteNome,
      whatsapp: o.clienteWhatsapp ?? "",
      endereco: o.clienteEndereco ?? "",
      documentoLabel: juridica ? "CNPJ" : "CPF",
      documento: o.clienteDocumento ?? "",
    },
    descontoTipo: o.descontoTipo,
    descontoValor: o.descontoValor,
    itens: itens.map((i) => ({ nome: i.nome, obs: i.observacoes ?? "", qtd: i.qtd, preco: i.preco })),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=${tipo}.pdf`,
      "Cache-Control": "private, no-store",
    },
  });
}
