import { phpApiFetch } from "@/lib/phpApi";

export type Mesa = {
  id: number;
  nome: string;
  ativo: number;
  criado_em: string;
  tem_pedido_aberto: boolean;
};

export type Garcom = {
  id: number;
  nome: string;
  email: string;
  ativo: number;
  criado_em: string;
};

export type ModoGarcomDetalheResposta = {
  ok: true;
  mesas: Mesa[];
  garcons: Garcom[];
  pedidos_pendentes: number;
  mesas_ativas: number;
  garcons_ativos: number;
  garcom_login_url: string;
};

export type ModoGarcomStats = {
  ok: true;
  pedidos_pendentes: number;
  mesas_ativas: number;
  garcons_ativos: number;
};

export type PedidoMesa = {
  id: number;
  codigo: number;
  status: string;
  total: number;
  criado_em: string;
  mesa_id: number | null;
  mesa_nome: string | null;
  garcom_id: number | null;
  garcom_nome: string | null;
};

export function getModoGarcomDetalhe() {
  return phpApiFetch<ModoGarcomDetalheResposta>("/admin/api/v1/modo_garcom_detalhe.php");
}
