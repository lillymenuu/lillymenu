import "server-only";
import { listarCategorias } from "@/db/queries/categoriasAdmin";
import { listarProdutosAdmin } from "@/db/queries/produtosAdmin";

export type Categoria = {
  id: number;
  nome: string;
  ativo: number;
  ordem: number | null;
  modo_exibicao?: "vertical" | "horizontal" | "grid";
};

export type Produto = {
  id: number;
  nome: string;
  preco_base: number;
  preco: number;
  ativo: number;
  categoria_id: number | null;
  categoria: string | null;
  estoque_quantidade: number;
  preco_promocional?: number | null;
  promo_desativado?: number;
  promo_dias?: number | null;
  promo_inicio?: string | null;
  promo_imagem?: string | null;
  promo_descricao?: string | null;
  promo_etiqueta?: string | null;
  em_promo?: boolean;
  dias_restantes?: number | null;
  imagem?: string | null;
  codigo?: string | null;
  descricao?: string | null;
  apenas_agendamento?: number;
  quantidade_minima?: number;
  pontos_ganho?: number;
  pontos_custo?: number;
  disponivel_catalogo?: number;
  disponivel_mesa?: number;
  dias_semana?: string[];
  horario_ini?: string | null;
  horario_fim?: string | null;
  data_fabricacao?: string | null;
  data_validade?: string | null;
  tem_variacoes?: number;
  destaque?: number;
};

export type ProdutoValidade = {
  id: number;
  nome: string;
  data_validade: string;
  dias_restantes: number;
  vencido: boolean;
};

export type ProdutoVariacaoItem = {
  id?: number;
  tamanho: string;
  cor: string;
  preco: number | string;
};

export type ProdutoItemExtra = {
  id?: number;
  nome: string;
  preco: number | string;
  obrigatorio: boolean;
};

export type ProdutoVariacoesDetalheResposta = {
  ok: true;
  variacoes: { id: number; tamanho: string; cor: string; preco: number }[];
  extras: { id: number; nome: string; preco: number; obrigatorio: number }[];
  complementos_itens: { id: number; nome: string; preco: number; obrigatorio: number }[];
};

export async function getCategorias(lojaId: number): Promise<{ ok: true; categorias: Categoria[] }> {
  const categorias = await listarCategorias(lojaId);
  return { ok: true, categorias: categorias.map((c) => ({ id: c.id, nome: c.nome ?? "", ativo: c.ativo ? 1 : 0, ordem: c.ordem, modo_exibicao: c.modoExibicao as Categoria["modo_exibicao"] })) };
}

export async function getProdutos(lojaId: number): Promise<{ ok: true; produtos: Produto[] }> {
  const produtos = await listarProdutosAdmin(lojaId);
  return {
    ok: true,
    produtos: produtos.map((p) => ({
      id: p.id,
      nome: p.nome ?? "",
      codigo: p.codigo,
      preco_base: p.precoBase ?? 0,
      preco: p.preco,
      ativo: p.ativo ? 1 : 0,
      categoria_id: p.categoriaId,
      categoria: p.categoria,
      estoque_quantidade: p.estoqueQuantidade,
      preco_promocional: p.precoPromocional,
      promo_desativado: p.promoDesativado ? 1 : 0,
      imagem: p.imagem,
      descricao: p.descricao,
      apenas_agendamento: p.apenasAgendamento ? 1 : 0,
      quantidade_minima: p.quantidadeMinima,
      pontos_ganho: p.pontosGanho,
      pontos_custo: p.pontosCusto,
      disponivel_catalogo: p.disponivelCatalogo ? 1 : 0,
      disponivel_mesa: p.disponivelMesa ? 1 : 0,
      dias_semana: p.diasSemana as string[],
      horario_ini: p.horarioIni,
      horario_fim: p.horarioFim,
      data_fabricacao: p.dataFabricacao,
      data_validade: p.dataValidade,
      tem_variacoes: p.temVariacoes ? 1 : 0,
      destaque: p.destaque ? 1 : 0,
    })),
  };
}
