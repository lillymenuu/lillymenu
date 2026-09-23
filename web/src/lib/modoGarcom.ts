import "server-only";
import { headers } from "next/headers";
import { detalheModoGarcom } from "@/db/queries/modoGarcom";

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
  cardapio_url: string;
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

export async function getModoGarcomDetalhe(lojaId: number): Promise<ModoGarcomDetalheResposta> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  const protocoloHost = `${proto}://${host}`;

  const resultado = await detalheModoGarcom(lojaId, protocoloHost);

  return {
    ok: true,
    mesas: resultado.mesas.map((m) => ({ id: m.id, nome: m.nome, ativo: m.ativo ? 1 : 0, criado_em: m.criadoEm, tem_pedido_aberto: m.temPedidoAberto })),
    garcons: resultado.garcons.map((g) => ({ id: g.id, nome: g.nome, email: g.email, ativo: g.ativo ? 1 : 0, criado_em: g.criadoEm })),
    pedidos_pendentes: resultado.pedidosPendentes,
    mesas_ativas: resultado.mesasAtivas,
    garcons_ativos: resultado.garconsAtivos,
    garcom_login_url: resultado.garcomLoginUrl,
    cardapio_url: resultado.cardapioUrl,
  };
}
