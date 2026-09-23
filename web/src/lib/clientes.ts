import "server-only";
import { listarClientes } from "@/db/queries/clientesAdmin";

export type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  endereco: string | null;
  endereco_texto: string;
  aniversario: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  complemento: string | null;
  criado_em: string;
  cashback_saldo: number;
  pontos_saldo: number;
  saldo_fiado: number;
  total_pedidos: number;
  total_gasto: number;
};

export type ClientesListarParams = {
  busca?: string;
  pagina?: number;
};

export type ClientesListarResposta = {
  ok: true;
  clientes: Cliente[];
  total: number;
  paginas: number;
  pagina: number;
};

export async function getClientesListar(lojaId: number, params: ClientesListarParams = {}): Promise<ClientesListarResposta> {
  const resultado = await listarClientes(lojaId, params.busca ?? "", params.pagina ?? 1);

  return {
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
  };
}
