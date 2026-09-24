import "server-only";
import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { clientes, produtos, categorias, pontosMovimentacoes } from "@/db/schema";
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

/* Equivalente de public/api/pontos_resgatar.php. */

export type ResgatarPontosResultado =
  | { ok: false; msg: string }
  | { ok: true; msg?: string; produto: { id: number; nome: string; preco: number }; custo: number; saldoAntes: number; saldoNovo: number };

export async function resgatarPontos(lojaId: number, clienteId: number, produtoId: number, apenasValidar: boolean): Promise<ResgatarPontosResultado> {
  const [produto] = await db
    .select({ id: produtos.id, nome: produtos.nome, pontosCusto: produtos.pontos_custo, preco: produtos.preco })
    .from(produtos)
    .where(and(eq(produtos.id, produtoId), eq(produtos.loja_id, lojaId), eq(produtos.ativo, true), gt(produtos.pontos_custo, 0)))
    .limit(1);
  if (!produto) return { ok: false, msg: "Produto não disponível para resgate." };
  const custo = produto.pontosCusto;

  const [cliente] = await db.select({ id: clientes.id, saldo: clientes.pontos_saldo }).from(clientes).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId))).limit(1);
  if (!cliente) return { ok: false, msg: "Cliente não encontrado." };

  const saldo = cliente.saldo;
  if (saldo < custo) return { ok: false, msg: `Pontos insuficientes. Você tem ${saldo} pts e precisa de ${custo} pts.` };

  const produtoResumo = { id: produto.id, nome: produto.nome ?? "", preco: Number(produto.preco ?? 0) };

  if (apenasValidar) {
    return { ok: true, produto: produtoResumo, custo, saldoAntes: saldo, saldoNovo: saldo };
  }

  const saldoNovo = saldo - custo;
  await db.update(clientes).set({ pontos_saldo: saldoNovo }).where(and(eq(clientes.id, clienteId), eq(clientes.loja_id, lojaId)));
  await db.insert(pontosMovimentacoes).values({ cliente_id: clienteId, tipo: "resgate", pontos: -custo, saldo_antes: saldo, saldo_depois: saldoNovo, loja_id: lojaId });

  return { ok: true, msg: `Resgate realizado! ${produtoResumo.nome} adicionado ao carrinho.`, produto: produtoResumo, custo, saldoAntes: saldo, saldoNovo };
}
