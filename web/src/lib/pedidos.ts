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
