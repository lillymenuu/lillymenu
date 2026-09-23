import "server-only";
import { phpApiFetch } from "@/lib/phpApi";
import { listarPedidos } from "@/db/queries/pedidosAdmin";

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

export async function getPedidosListar(lojaId: number, params: PedidosListarParams = {}): Promise<PedidosListarResposta> {
  const resultado = await listarPedidos({
    lojaId,
    status: params.status,
    dataIni: params.data_ini,
    dataFim: params.data_fim,
    pagina: params.pagina,
    limite: params.limite,
  });

  return {
    ok: true,
    pedidos: resultado.pedidos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      status: p.status,
      tipo: p.tipo,
      total: p.total ?? 0,
      criado_em: p.criadoEm ?? "",
      forma_pagamento: p.formaPagamento,
      endereco_entrega: p.enderecoEntrega,
      nome: p.nome,
      telefone: p.telefone ?? "",
      agendamento: p.agendamento,
      origem: p.origem,
      observacoes_cliente: p.observacoesCliente,
      motoboy_id: p.motoboyId,
      motoboy_nome: p.motoboyNome,
      motoboy_whatsapp: p.motoboyWhatsapp,
      status_em: p.statusEm,
      pagamentos: p.pagamentos,
    })),
    total: resultado.total,
    paginas: resultado.paginas,
    pagina: resultado.pagina,
    limite: resultado.limite,
  };
}
