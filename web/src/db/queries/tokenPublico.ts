import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Tokens assinados (HMAC) das rotas publicas do cardapio. Os IDs de pedido e de cliente sao
 * sequenciais, entao sozinhos nao provam nada — qualquer um percorria ?id=1,2,3... e lia nome,
 * telefone e endereco de clientes de todas as lojas. O token so e entregue a quem criou o pedido
 * ou entrou com o telefone do cliente, e o servidor confere a assinatura sem precisar de coluna
 * nova no banco.
 *
 * Chave: PEDIDO_TOKEN_SECRET (recomendado definir na Vercel). Sem ela, usa DATABASE_URL, que ja e
 * secreta e estavel — trocar a chave so invalida links de acompanhamento antigos.
 */

function chave(): string {
  const k = (process.env.PEDIDO_TOKEN_SECRET ?? "").trim() || (process.env.DATABASE_URL ?? "").trim();
  if (!k) throw new Error("PEDIDO_TOKEN_SECRET/DATABASE_URL ausente: impossivel assinar tokens publicos.");
  return k;
}

function assinar(conteudo: string): string {
  return createHmac("sha256", chave()).update(conteudo).digest("hex").slice(0, 32);
}

function confere(esperado: string, recebido: string): boolean {
  if (!/^[a-f0-9]{32}$/.test(recebido)) return false;
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
}

/** Token de acompanhamento de um pedido (status, avaliacao). */
export function tokenPedido(pedidoId: number): string {
  return assinar(`pedido:${pedidoId}`);
}

export function conferirTokenPedido(pedidoId: number, token: string): boolean {
  return pedidoId > 0 && confere(tokenPedido(pedidoId), token);
}

/** Token do cliente na loja (resgate de pontos). */
export function tokenCliente(lojaId: number, clienteId: number): string {
  return assinar(`cliente:${lojaId}:${clienteId}`);
}

export function conferirTokenCliente(lojaId: number, clienteId: number, token: string): boolean {
  return lojaId > 0 && clienteId > 0 && confere(tokenCliente(lojaId, clienteId), token);
}
