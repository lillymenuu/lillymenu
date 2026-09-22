import "server-only";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { clientes, produtos, categorias } from "@/db/schema";
import { apenasDigitos, telefoneSemMascara } from "@/db/queries/telefone";

/* Equivalente de public/api/pontos_saldo.php e pontos_produtos.php. */

export type SaldoPontosResultado =
  | { ok: false; msg: string }
  | { ok: true; clienteId: number; nome: string; saldo: number; nivel: string };

export async function saldoPontosPorTelefone(lojaId: number, telefoneBruto: string): Promise<SaldoPontosResultado> {
  const telefone = apenasDigitos(telefoneBruto);
  if (telefone.length < 10) return { ok: false, msg: "Informe um telefone válido." };

  const linhas = await db
    .select({ id: clientes.id, nome: clientes.nome, saldo: clientes.pontos_saldo, nivel: clientes.nivel })
    .from(clientes)
    .where(and(eq(clientes.loja_id, lojaId), or(eq(clientes.telefone, telefone), eq(telefoneSemMascara, telefone))))
    .limit(1);

  const c = linhas[0];
  if (!c) return { ok: false, msg: "Cliente não encontrado. Faça um pedido para acumular pontos!" };

  return { ok: true, clienteId: c.id, nome: c.nome ?? "", saldo: c.saldo, nivel: c.nivel ?? "Bronze" };
}

export type ProdutoResgatavel = {
  id: number;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  categoria: string | null;
  pontosCusto: number;
  pontosGanho: number;
};

function resolverImagem(caminho: string | null, phpAdminUrl: string): string | null {
  if (!caminho) return null;
  if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/")) return caminho;
  return `${phpAdminUrl}/${caminho}`;
}

export async function produtosResgataveisPorPontos(lojaId: number, phpAdminUrl = ""): Promise<ProdutoResgatavel[]> {
  const linhas = await db
    .select({
      id: produtos.id,
      nome: produtos.nome,
      descricao: produtos.descricao,
      imagem: produtos.imagem,
      pontosCusto: produtos.pontos_custo,
      pontosGanho: produtos.pontos_ganho,
      categoria: categorias.nome,
    })
    .from(produtos)
    .leftJoin(categorias, and(eq(categorias.id, produtos.categoria_id), eq(categorias.loja_id, produtos.loja_id)))
    .where(and(eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), gt(produtos.pontos_custo, 0)))
    .orderBy(produtos.pontos_custo);

  return linhas.map((p) => ({
    id: p.id,
    nome: p.nome ?? "",
    descricao: p.descricao,
    imagem: resolverImagem(p.imagem, phpAdminUrl),
    categoria: p.categoria,
    pontosCusto: p.pontosCusto,
    pontosGanho: p.pontosGanho,
  }));
}
