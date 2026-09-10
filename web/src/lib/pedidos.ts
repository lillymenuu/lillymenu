import { phpApiFetch } from "@/lib/phpApi";

export type Pagamento = { forma: string; valor: number };

export type Pedido = {
  id: number;
  status: string;
  tipo: string;
  total: number;
  criado_em: string;
  forma_pagamento: string | null;
  endereco_entrega: string | null;
  nome: string;
  telefone: string;
  agendamento?: string | null;
  origem?: string | null;
  observacoes_cliente?: string | null;
  motoboy_id: number | null;
  motoboy_nome: string | null;
  motoboy_whatsapp: string | null;
  status_em: string | null;
  pagamentos: Pagamento[];
  codigo: number;
};

export type Motoboy = { id: number; nome: string; whatsapp: string };

export function getPedidos() {
  return phpApiFetch<{ ok: true; pedidos: Pedido[] }>("/admin/api/v1/pedidos_kanban.php");
}

export function getMotoboysAtivos() {
  return phpApiFetch<{ ok: true; motoboys: Motoboy[]; selected_id: number }>(
    "/admin/api/v1/motoboys.php?action=list"
  );
}

export type PedidosListarParams = {
  status?: string;
  data_ini?: string;
  data_fim?: string;
  pagina?: number;
  limite?: number;
};

export type PedidosListarResposta = {
  ok: true;
  pedidos: Pedido[];
  total: number;
  paginas: number;
  pagina: number;
  limite: number;
};

export function getPedidosListar(params: PedidosListarParams = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.data_ini) qs.set("data_ini", params.data_ini);
  if (params.data_fim) qs.set("data_fim", params.data_fim);
  if (params.pagina) qs.set("pagina", String(params.pagina));
  if (params.limite) qs.set("limite", String(params.limite));
  const query = qs.toString();
  return phpApiFetch<PedidosListarResposta>(
    `/admin/api/v1/pedidos_listar.php${query ? `?${query}` : ""}`
  );
}
