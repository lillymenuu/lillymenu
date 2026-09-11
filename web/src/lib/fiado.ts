import { phpApiFetch } from "@/lib/phpApi";

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

export function getFiadoClientes(params: FiadoClientesParams = {}) {
  const qs = new URLSearchParams();
  if (params.busca) qs.set("busca", params.busca);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  if (params.limite) qs.set("limite", String(params.limite));
  const query = qs.toString();
  return phpApiFetch<FiadoClientesResposta>(`/admin/api/v1/fiado_clientes.php${query ? `?${query}` : ""}`);
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
