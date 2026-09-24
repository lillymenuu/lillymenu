import "server-only";
import { and, eq, or, desc } from "drizzle-orm";
import { db } from "@/db";
import { clientes, pedidos, pedidoItens, avaliacoes } from "@/db/schema";
import { apenasDigitos, telefoneSemMascara } from "@/db/queries/telefone";
import { pedidoCodigoBase, codigoDisplay } from "@/db/queries/pedidosAdmin";

/*
 * Equivalente de public/api/pedidos_por_cliente.php e pedido_status.php:
 * historico "Meus pedidos" e acompanhamento de um pedido especifico na
 * loja publica.
 */

export type ItemPedidoPublico = { produtoNome: string | null; quantidade: number | null; preco: number | null; observacoes: string };

export type PedidoClienteResumo = {
  id: number;
  status: string;
  total: number | null;
  taxaEntrega: number | null;
  formaPagamento: string | null;
  criadoEm: string | null;
  tipo: string;
  enderecoEntrega: string | null;
  subtotal: number | null;
  codigo: number;
  itens: ItemPedidoPublico[];
};

export type PedidosPorClienteResultado =
  | { ok: false; msg: string }
  | {
      ok: true;
      cliente: {
        id: number;
        nome: string;
        telefone: string;
        saldo: number;
        cashbackSaldo: number;
        rua: string;
        numero: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
        complemento: string;
      };
      pedidos: PedidoClienteResumo[];
    };

export async function pedidosPorCliente(lojaId: number, telefoneBruto: string): Promise<PedidosPorClienteResultado> {
  const tel = apenasDigitos(telefoneBruto);
  if (tel.length < 10) return { ok: false, msg: "Telefone inválido." };

  const [cliente] = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      telefone: clientes.telefone,
      saldo: clientes.pontos_saldo,
      cashbackSaldo: clientes.cashback_saldo,
      rua: clientes.rua,
      numero: clientes.numero,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      estado: clientes.estado,
      cep: clientes.cep,
      complemento: clientes.complemento,
    })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), or(eq(clientes.telefone, tel), eq(telefoneSemMascara, tel))))
    .limit(1);

  if (!cliente) return { ok: false, msg: "Número não encontrado. Certifique-se de usar o mesmo telefone do pedido." };

  const base = await pedidoCodigoBase(lojaId);
  const pedidosLinhas = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      total: pedidos.total,
      taxaEntrega: pedidos.taxa_entrega,
      formaPagamento: pedidos.forma_pagamento,
      criadoEm: pedidos.criado_em,
      tipo: pedidos.tipo,
      enderecoEntrega: pedidos.endereco_entrega,
      subtotal: pedidos.subtotal,
    })
    .from(pedidos)
    .where(and(eq(pedidos.cliente_id, cliente.id), eq(pedidos.loja_id, lojaId)))
    .orderBy(desc(pedidos.criado_em))
    .limit(20);

  const pedidosComItens: PedidoClienteResumo[] = [];
  for (const p of pedidosLinhas) {
    const itens = await db
      .select({ produtoNome: pedidoItens.produto_nome, quantidade: pedidoItens.quantidade, preco: pedidoItens.preco, observacoes: pedidoItens.observacoes })
      .from(pedidoItens)
      .where(and(eq(pedidoItens.pedido_id, p.id), eq(pedidoItens.loja_id, lojaId)));

    pedidosComItens.push({
      ...p,
      codigo: codigoDisplay(p.id, base),
      itens: itens.map((i) => ({ ...i, observacoes: i.observacoes ?? "" })),
    });
  }

  return {
    ok: true,
    cliente: {
      id: cliente.id,
      nome: cliente.nome ?? "",
      telefone: cliente.telefone ?? "",
      saldo: cliente.saldo,
      cashbackSaldo: cliente.cashbackSaldo,
      rua: cliente.rua ?? "",
      numero: cliente.numero ?? "",
      bairro: cliente.bairro ?? "",
      cidade: cliente.cidade ?? "",
      estado: cliente.estado ?? "",
      cep: cliente.cep ?? "",
      complemento: cliente.complemento ?? "",
    },
    pedidos: pedidosComItens,
  };
}

export type PedidoStatusResultado =
  | { ok: false; msg: string }
  | {
      ok: true;
      pedido: {
        id: number;
        codigo: number;
        status: string;
        tipo: string;
        total: number;
        taxaEntrega: number;
        formaPagamento: string;
        troco: number | null;
        subtotal: number | null;
        desconto: number;
        cashbackUsado: number | null;
        enderecoEntrega: string;
        avaliado: boolean;
        criadoEm: string;
        nome: string;
        telefone: string;
        agendamento: string | null;
      };
      itens: ItemPedidoPublico[];
    };

/** Equivalente de public/api/pedido_status.php: acompanhamento de um pedido (usado apos finalizar a compra). */
export async function detalhePedidoPublico(pedidoId: number, clienteIdValidar: number): Promise<PedidoStatusResultado> {
  if (!pedidoId) return { ok: false, msg: "ID inválido" };

  const [meta] = await db.select({ lojaId: pedidos.loja_id, clienteId: pedidos.cliente_id }).from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!meta) return { ok: false, msg: "Pedido não encontrado" };
  if (clienteIdValidar > 0 && meta.clienteId !== clienteIdValidar) return { ok: false, msg: "Acesso negado" };

  const lojaId = meta.lojaId;
  const [linha] = await db
    .select({
      id: pedidos.id,
      status: pedidos.status,
      total: pedidos.total,
      formaPagamento: pedidos.forma_pagamento,
      taxaEntrega: pedidos.taxa_entrega,
      criadoEm: pedidos.criado_em,
      subtotal: pedidos.subtotal,
      desconto: pedidos.desconto,
      tipo: pedidos.tipo,
      troco: pedidos.troco,
      enderecoEntrega: pedidos.endereco_entrega,
      cashbackUsado: pedidos.cashback_usado,
      agendamento: pedidos.agendamento,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
    })
    .from(pedidos)
    .innerJoin(clientes, and(eq(clientes.id, pedidos.cliente_id), eq(clientes.loja_id, pedidos.loja_id)))
    .where(and(eq(pedidos.id, pedidoId), eq(pedidos.loja_id, lojaId)))
    .limit(1);
  if (!linha) return { ok: false, msg: "Pedido não encontrado" };

  const itensLinhas = await db
    .select({ produtoNome: pedidoItens.produto_nome, quantidade: pedidoItens.quantidade, preco: pedidoItens.preco, observacoes: pedidoItens.observacoes })
    .from(pedidoItens)
    .where(and(eq(pedidoItens.pedido_id, pedidoId), eq(pedidoItens.loja_id, lojaId)))
    .orderBy(pedidoItens.id);

  const base = await pedidoCodigoBase(lojaId);

  const [avaliacaoRow] = await db.select({ id: avaliacoes.id }).from(avaliacoes).where(and(eq(avaliacoes.pedido_id, pedidoId), eq(avaliacoes.loja_id, lojaId))).limit(1);

  return {
    ok: true,
    pedido: {
      id: linha.id,
      codigo: codigoDisplay(linha.id, base),
      status: linha.status ?? "pendente",
      tipo: linha.tipo ?? "retirada",
      total: Number(linha.total ?? 0),
      taxaEntrega: Number(linha.taxaEntrega ?? 0),
      formaPagamento: linha.formaPagamento ?? "",
      troco: linha.troco !== null ? Number(linha.troco) : null,
      subtotal: linha.subtotal !== null ? Number(linha.subtotal) : null,
      desconto: Number(linha.desconto ?? 0),
      cashbackUsado: linha.cashbackUsado !== null ? Number(linha.cashbackUsado) : null,
      enderecoEntrega: linha.enderecoEntrega ?? "",
      avaliado: Boolean(avaliacaoRow),
      criadoEm: linha.criadoEm ?? "",
      nome: linha.clienteNome ?? "",
      telefone: linha.clienteTelefone ?? "",
      agendamento: linha.agendamento,
    },
    itens: itensLinhas.map((i) => ({ ...i, observacoes: i.observacoes ?? "" })),
  };
}
