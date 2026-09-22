import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { cupons } from "@/db/schema";
import { getConfig } from "@/db/queries/config";

/*
 * Equivalente de admin/api/v1/cupons_listar.php, cupons_salvar.php,
 * cupons_excluir.php e cupons_toggle.php: CRUD administrativo de cupons.
 * codigo e globalmente unico no banco (UNIQUE KEY do dump original, nao
 * escopado por loja_id) — mesma limitacao do legado, preservada aqui.
 */

export type CupomAdmin = {
  id: number;
  codigo: string;
  tipo: "percent" | "valor" | "frete";
  desconto: number;
  minimo: number;
  quantidadeTotal: number;
  quantidadeUsada: number;
  ativo: boolean;
  primeiraCompra: boolean;
  publico: boolean;
  criadoEm: string;
};

export type ListarCuponsResultado = { cupons: CupomAdmin[]; lojaLinkBase: string; linkSlug: string };

export async function listarCupons(lojaId: number, lojaLinkBase: string): Promise<ListarCuponsResultado> {
  const linhas = await db
    .select({
      id: cupons.id,
      codigo: cupons.codigo,
      tipo: cupons.tipo,
      desconto: cupons.desconto,
      minimo: cupons.minimo,
      quantidadeTotal: cupons.quantidade_total,
      quantidadeUsada: cupons.quantidade_usada,
      ativo: cupons.ativo,
      primeiraCompra: cupons.primeira_compra,
      publico: cupons.publico,
      criadoEm: cupons.criado_em,
    })
    .from(cupons)
    .where(eq(cupons.loja_id, lojaId))
    .orderBy(desc(cupons.criado_em));

  const lojaLinkBaseAntigo = `${lojaLinkBase}lilly/`;
  const lojaLink = await getConfig(lojaId, "link_loja", "");
  let linkSlug = lojaLink;
  if (lojaLink.startsWith(lojaLinkBaseAntigo)) {
    linkSlug = decodeURIComponent(lojaLink.slice(lojaLinkBaseAntigo.length));
  } else {
    const mParam = lojaLink.match(/[?&]loja=([^&]+)/);
    if (mParam) linkSlug = decodeURIComponent(mParam[1]);
    else {
      const mPath = lojaLink.match(/\/([^/?]+)\/?$/);
      if (mPath) linkSlug = mPath[1];
    }
  }
  linkSlug = linkSlug.replace(/\.php$/i, "");

  return { cupons: linhas, lojaLinkBase, linkSlug };
}

export type SalvarCupomInput = {
  id?: number;
  codigo: string;
  tipo?: string;
  desconto: number | string;
  minimo?: number | string;
  quantidadeTotal?: number | string;
  ativo?: boolean;
  primeiraCompra?: boolean;
  publico?: boolean;
};

const RE_CODIGO = /^[A-Z0-9_-]{3,15}$/;

export async function salvarCupom(lojaId: number, input: SalvarCupomInput): Promise<{ ok: true; id: number } | { ok: false; msg: string }> {
  const id = input.id && input.id > 0 ? input.id : 0;
  const codigo = input.codigo.trim().toUpperCase();
  const tipo: "percent" | "valor" | "frete" = input.tipo === "valor" || input.tipo === "frete" ? input.tipo : "percent";
  let desconto = Number(input.desconto ?? 0);
  let minimo = Number(input.minimo ?? 0);
  const quantidadeTotal = parseInt(String(input.quantidadeTotal ?? 0), 10);
  const ativo = Boolean(input.ativo);
  const primeiraCompra = Boolean(input.primeiraCompra);
  const publico = Boolean(input.publico);

  if (codigo === "") return { ok: false, msg: "Codigo obrigatorio." };
  if (!RE_CODIGO.test(codigo)) return { ok: false, msg: "Codigo invalido." };
  if (tipo !== "frete" && desconto <= 0) return { ok: false, msg: "Desconto invalido." };
  if (tipo === "percent" && desconto > 100) return { ok: false, msg: "Percentual acima de 100%." };
  if (minimo < 0) minimo = 0;
  if (quantidadeTotal < 0) return { ok: false, msg: "Quantidade invalida." };
  if (tipo === "frete") desconto = 0;

  if (id > 0) {
    const [atual] = await db.select({ codigo: cupons.codigo, quantidadeUsada: cupons.quantidade_usada }).from(cupons).where(and(eq(cupons.id, id), eq(cupons.loja_id, lojaId))).limit(1);
    if (!atual) return { ok: false, msg: "Cupom nao encontrado." };
    if (quantidadeTotal < atual.quantidadeUsada) return { ok: false, msg: "Quantidade menor que a ja utilizada." };

    if (codigo !== atual.codigo) {
      const [dup] = await db.select({ id: cupons.id }).from(cupons).where(and(eq(cupons.codigo, codigo), eq(cupons.loja_id, lojaId), ne(cupons.id, id))).limit(1);
      if (dup) return { ok: false, msg: "Codigo ja cadastrado." };
    }

    await db
      .update(cupons)
      .set({ codigo, tipo, desconto, minimo, quantidade_total: quantidadeTotal, ativo, primeira_compra: primeiraCompra, publico, atualizado_em: new Date().toISOString() })
      .where(and(eq(cupons.id, id), eq(cupons.loja_id, lojaId)));

    return { ok: true, id };
  }

  const [dup] = await db.select({ id: cupons.id }).from(cupons).where(and(eq(cupons.codigo, codigo), eq(cupons.loja_id, lojaId))).limit(1);
  if (dup) return { ok: false, msg: "Cupom ja cadastrado." };

  const [nova] = await db
    .insert(cupons)
    .values({ codigo, tipo, desconto, minimo, quantidade_total: quantidadeTotal, quantidade_usada: 0, ativo, primeira_compra: primeiraCompra, publico, loja_id: lojaId })
    .returning({ id: cupons.id });

  return { ok: true, id: nova.id };
}

export async function excluirCupom(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Cupom invalido." };
  const excluidos = await db.delete(cupons).where(and(eq(cupons.id, id), eq(cupons.loja_id, lojaId))).returning({ id: cupons.id });
  if (excluidos.length === 0) return { ok: false, msg: "Cupom nao encontrado." };
  return { ok: true };
}

export async function toggleCupom(lojaId: number, id: number, ativo: boolean): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "Cupom invalido." };
  const atualizados = await db
    .update(cupons)
    .set({ ativo, atualizado_em: new Date().toISOString() })
    .where(and(eq(cupons.id, id), eq(cupons.loja_id, lojaId)))
    .returning({ id: cupons.id });
  if (atualizados.length === 0) return { ok: false, msg: "Cupom nao encontrado." };
  return { ok: true };
}
