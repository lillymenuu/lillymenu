import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cupons, clientes, pedidos } from "@/db/schema";
import { apenasDigitos, formatarTelefoneBR, telefoneSemMascara } from "@/db/queries/telefone";

/* Equivalente de public/api/cupons_validar.php. */

export type ValidarCupomInput = {
  lojaId: number;
  codigo: string;
  subtotal: number;
  tipoPedido?: string;
  taxaEntrega?: number;
  clienteId?: number;
  telefone?: string;
};

export type ValidarCupomResultado =
  | { ok: false; msg: string }
  | { ok: true; codigo: string; tipo: "percent" | "valor" | "frete"; desconto: number; valor: number; primeiraCompra: boolean; publico: boolean; msg: string };

export async function validarCupom(input: ValidarCupomInput): Promise<ValidarCupomResultado> {
  const codigo = input.codigo.trim().toUpperCase();
  if (!codigo) return { ok: false, msg: "Informe o cupom." };

  const linhas = await db
    .select()
    .from(cupons)
    .where(and(eq(cupons.codigo, codigo), eq(cupons.loja_id, input.lojaId)))
    .limit(1);
  const cupom = linhas[0];
  if (!cupom) return { ok: false, msg: "Cupom não encontrado." };
  if (!cupom.ativo) return { ok: false, msg: "Cupom indisponível." };

  if (cupom.quantidade_total > 0 && cupom.quantidade_usada >= cupom.quantidade_total) {
    return { ok: false, msg: "Cupom esgotado." };
  }

  if (cupom.minimo > 0 && input.subtotal < cupom.minimo) {
    const minimoFmt = cupom.minimo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { ok: false, msg: `Pedido mínimo de R$ ${minimoFmt} para este cupom.` };
  }

  const tipo = cupom.tipo === "valor" ? "valor" : cupom.tipo === "frete" ? "frete" : "percent";

  if (cupom.primeira_compra) {
    let clienteResolvidoId = input.clienteId ?? 0;
    const telDigitos = apenasDigitos(input.telefone ?? "");
    if (clienteResolvidoId <= 0 && telDigitos.length >= 8) {
      const cli = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(and(eq(clientes.loja_id, input.lojaId), sql`(${telefoneSemMascara} = ${telDigitos} or ${clientes.telefone} = ${formatarTelefoneBR(input.telefone ?? "")})`))
        .limit(1);
      clienteResolvidoId = cli[0]?.id ?? 0;
    }

    if (clienteResolvidoId <= 0 && telDigitos.length < 8) {
      return { ok: false, msg: "Informe seu nome e contato para usar este cupom." };
    }

    if (clienteResolvidoId > 0) {
      const totalPedidos = await db
        .select({ n: sql<number>`count(*)` })
        .from(pedidos)
        .where(and(eq(pedidos.cliente_id, clienteResolvidoId), eq(pedidos.loja_id, input.lojaId)));
      if (Number(totalPedidos[0]?.n ?? 0) > 0) {
        return { ok: false, msg: "Cupom válido apenas para a primeira compra." };
      }
    }
    /* telefone valido mas sem cadastro de cliente -> nunca fez pedido, e elegivel */
  }

  let valorAplicado: number;
  if (tipo === "frete") {
    const tipoPedido = input.tipoPedido ?? "";
    if (tipoPedido !== "" && tipoPedido !== "entrega" && tipoPedido !== "entrega_agendada") {
      return { ok: false, msg: "Cupom válido apenas para entregas." };
    }
    valorAplicado = Math.max(0, input.taxaEntrega ?? 0);
  } else {
    valorAplicado = tipo === "percent" ? Math.round(input.subtotal * (cupom.desconto / 100) * 100) / 100 : cupom.desconto;
  }

  return {
    ok: true,
    codigo: cupom.codigo,
    tipo,
    desconto: cupom.desconto,
    valor: Math.round(valorAplicado * 100) / 100,
    primeiraCompra: cupom.primeira_compra,
    publico: cupom.publico,
    msg: "Cupom aplicado.",
  };
}
