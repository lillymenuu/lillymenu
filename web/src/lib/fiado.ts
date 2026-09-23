import "server-only";
import { listarClientesFiado } from "@/db/queries/fiado";

export type FiadoCliente = {
  id: number;
  nome: string;
  telefone: string;
  saldo_fiado: number;
};

export type FiadoClientesResposta = {
  ok: true;
  total_debitos: number;
  total_clientes: number;
  clientes: FiadoCliente[];
  pagina: number;
  paginas: number;
  total: number;
};

export type FiadoClientesParams = {
  busca?: string;
  pagina?: number;
  limite?: number;
};

export async function getFiadoClientes(lojaId: number, params: FiadoClientesParams = {}): Promise<FiadoClientesResposta> {
  const resultado = await listarClientesFiado(lojaId, params.busca ?? "", params.pagina ?? 1, params.limite ?? 10);
  return {
    ok: true,
    total_debitos: resultado.totalDebitos,
    total_clientes: resultado.totalClientes,
    clientes: resultado.clientes.map((c) => ({ id: c.id, nome: c.nome ?? "", telefone: c.telefone ?? "", saldo_fiado: c.saldoFiado })),
    pagina: resultado.pagina,
    paginas: resultado.paginas,
    total: resultado.total,
  };
}

export type FiadoLancamento = {
  id: number;
  tipo: "venda" | "pagamento";
  valor: number;
  saldo_antes: number;
  saldo_depois: number;
  observacao: string | null;
  criado_em: string;
  pedido_id: number | null;
  pedido_codigo: string | null;
  forma_pagamento: string | null;
  operador_nome: string | null;
};

export type FiadoDetalheResposta = {
  ok: true;
  cliente: { id: number; nome: string; telefone: string; saldo_fiado: number };
  lancamentos: FiadoLancamento[];
  pagina: number;
  paginas: number;
  total: number;
};
