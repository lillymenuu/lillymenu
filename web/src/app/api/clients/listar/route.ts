import { NextRequest, NextResponse } from "next/server";
import { getSessaoAdmin } from "@/lib/session";
import { listarClientes } from "@/db/queries/clientesAdmin";

export async function GET(request: NextRequest) {
  const sessao = await getSessaoAdmin();
  if (!sessao) return NextResponse.json({ ok: false, msg: "Nao autenticado." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const busca = params.get("busca") ?? "";
  const pagina = params.get("pagina") ? Number(params.get("pagina")) : 1;

  const resultado = await listarClientes(sessao.lojaId, busca, pagina);

  return NextResponse.json({
    ok: true,
    clientes: resultado.clientes.map((c) => ({
      id: c.id,
      nome: c.nome ?? "",
      telefone: c.telefone ?? "",
      endereco: c.endereco,
      endereco_texto: c.enderecoTexto,
      aniversario: c.aniversario,
      cep: c.cep,
      rua: c.rua,
      numero: c.numero,
      bairro: c.bairro,
      cidade: c.cidade,
      estado: c.estado,
      complemento: c.complemento,
      criado_em: c.criadoEm ?? "",
      cashback_saldo: c.cashbackSaldo,
      pontos_saldo: c.pontosSaldo,
      saldo_fiado: c.saldoFiado,
      total_pedidos: c.totalPedidos,
      total_gasto: c.totalGasto,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
  });
}
