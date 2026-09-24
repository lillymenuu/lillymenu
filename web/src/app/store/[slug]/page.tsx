import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { resolverLojaIdPorSlug, montarPerfilLoja } from "@/db/queries/lojaPerfil";
import { montarCatalogoLoja } from "@/db/queries/catalogo";
import type { StorePerfil, StoreCatalogo, StoreProduto, StoreCombo } from "@/lib/store/types";
import { StoreView } from "@/components/store/store-view";

async function baseUrlAtual(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/`;
}

function mapProduto(p: import("@/db/queries/catalogo").CatalogoProduto): StoreProduto {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    preco: p.precoFinal,
    preco_produto: p.precoProduto,
    preco_base: p.precoBase,
    preco_final: p.precoFinal,
    em_promo: p.emPromo,
    desc_pct: p.descPct,
    imagem: p.imagem ?? "",
    promo_imagem: p.promoImagem,
    promo_descricao: p.promoDescricao,
    promo_etiqueta: p.promoEtiqueta,
    estoque: p.estoque,
    esgotado: p.esgotado,
    tem_variacoes: p.temVariacoes ? 1 : 0,
    quantidade_minima: p.quantidadeMinima,
    pontos_ganho: p.pontosGanho,
    destaque: p.destaque ? 1 : 0,
  };
}

function mapCombo(c: import("@/db/queries/catalogo").CatalogoCombo): StoreCombo {
  return {
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    preco: c.precoFinal,
    preco_base: c.precoBase,
    preco_final: c.precoFinal,
    em_promo: c.emPromo,
    desc_pct: c.descPct,
    imagem: c.imagem ?? "",
    tipo: "combo",
  };
}

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mesa?: string; cupom?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const lojaId = await resolverLojaIdPorSlug(slug);
  if (!lojaId) notFound();

  const baseUrl = await baseUrlAtual();
  const [perfilNeon, catalogoNeon] = await Promise.all([
    montarPerfilLoja(lojaId, { mesaId: sp.mesa ? Number(sp.mesa) : undefined, cupom: sp.cupom, baseUrl }),
    montarCatalogoLoja(lojaId, baseUrl),
  ]);

  const perfil: StorePerfil = {
    loja_id: lojaId,
    nomeLoja: perfilNeon.nomeLoja,
    lojaVerificada: perfilNeon.lojaVerificada,
    lojaAtiva: perfilNeon.lojaAtiva,
    slug: perfilNeon.slug,
    lojaCanonicalUrl: perfilNeon.lojaCanonicalUrl,
    descLoja: perfilNeon.descLoja,
    capaLoja: perfilNeon.capaLoja,
    perfilLoja: perfilNeon.perfilLoja,
    lojaFlyers: perfilNeon.lojaFlyers,
    flyersAtivo: perfilNeon.flyersAtivo,
    taxaEntrega: perfilNeon.taxaEntrega,
    pedidoMin: perfilNeon.pedidoMin,
    pedidoMinEntregaAtivo: perfilNeon.pedidoMinEntregaAtivo,
    pedidoMinEntrega: perfilNeon.pedidoMinEntrega,
    pedidoMinRetiradaAtivo: perfilNeon.pedidoMinRetiradaAtivo,
    pedidoMinRetirada: perfilNeon.pedidoMinRetirada,
    pedidoMinExibir: perfilNeon.pedidoMinExibir,
    tEntMin: perfilNeon.tEntMin,
    tEntMax: perfilNeon.tEntMax,
    tRetMin: perfilNeon.tRetMin,
    tRetMax: perfilNeon.tRetMax,
    pixAtivo: perfilNeon.pixAtivo,
    pixChave: perfilNeon.pixChave,
    pixNome: perfilNeon.pixNome,
    dinAtivo: perfilNeon.dinAtivo,
    credAtivo: perfilNeon.credAtivo,
    debAtivo: perfilNeon.debAtivo,
    bandeirasCredito: perfilNeon.bandeirasCredito,
    bandeirasDebito: perfilNeon.bandeirasDebito,
    entAtiva: perfilNeon.entAtiva,
    retAtiva: perfilNeon.retAtiva,
    taxasBairro: perfilNeon.taxasBairro,
    taxaEntregaTipo: perfilNeon.taxaEntregaTipo as StorePerfil["taxaEntregaTipo"],
    taxaEntregaGratis: perfilNeon.taxaEntregaGratis,
    clubePontosAtivo: perfilNeon.clubePontosAtivo,
    temaCorMenu: perfilNeon.temaCorMenu,
    cashbackPct: perfilNeon.cashbackPct,
    cashbackAtivo: perfilNeon.cashbackAtivo,
    cuponsAtivo: perfilNeon.cuponsAtivo,
    avaliacaoMedia: perfilNeon.avaliacaoMedia,
    avaliacaoTotal: perfilNeon.avaliacaoTotal,
    lojaAberta: perfilNeon.lojaAberta,
    pausaAtivaTitulo: perfilNeon.pausaAtivaTitulo,
    pausaAtivaFim: perfilNeon.pausaAtivaFim,
    proximoHorario: perfilNeon.proximoHorario,
    lojaContato: perfilNeon.lojaContato,
    lojaInstagram: perfilNeon.lojaInstagram,
    lojaTiktok: perfilNeon.lojaTiktok,
    lojaRua: perfilNeon.lojaRua,
    lojaNumero: perfilNeon.lojaNumero,
    lojaBairro: perfilNeon.lojaBairro,
    lojaCidade: perfilNeon.lojaCidade,
    lojaEstado: perfilNeon.lojaEstado,
    lojaCep: perfilNeon.lojaCep,
    enderecoLoja: perfilNeon.enderecoLoja,
    catalogoVersao: perfilNeon.catalogoVersao,
    mesaId: perfilNeon.mesaId > 0 ? perfilNeon.mesaId : null,
    mesaNome: perfilNeon.mesaNome,
    cupomPreenchido: perfilNeon.cupomPreenchido,
    semanaHorarios: perfilNeon.semanaHorarios,
    geoAtivo: perfilNeon.geoAtivo,
    agendamentoDeliveryAtivo: perfilNeon.agendamentoDeliveryAtivo,
    agendamentoRetiradaAtivo: perfilNeon.agendamentoRetiradaAtivo,
    agendDeliveryMinTipo: perfilNeon.agendDeliveryMinTipo as StorePerfil["agendDeliveryMinTipo"],
    agendDeliveryMinVal: perfilNeon.agendDeliveryMinVal,
    agendDeliveryMaxVal: perfilNeon.agendDeliveryMaxVal,
    agendDeliveryMaxTipo: perfilNeon.agendDeliveryMaxTipo as StorePerfil["agendDeliveryMaxTipo"],
    agendRetiradaMinTipo: perfilNeon.agendRetiradaMinTipo as StorePerfil["agendRetiradaMinTipo"],
    agendRetiradaMinVal: perfilNeon.agendRetiradaMinVal,
    agendRetiradaMaxVal: perfilNeon.agendRetiradaMaxVal,
    agendRetiradaMaxTipo: perfilNeon.agendRetiradaMaxTipo as StorePerfil["agendRetiradaMaxTipo"],
    agendDeliveryHorarios: perfilNeon.agendDeliveryHorarios,
    agendRetiradaHorarios: perfilNeon.agendRetiradaHorarios,
  };

  const produtosPorCat: Record<string, StoreProduto[]> = {};
  for (const [catId, lista] of Object.entries(catalogoNeon.produtosPorCategoria)) produtosPorCat[catId] = lista.map(mapProduto);
  const combosPorCat: Record<string, StoreCombo[]> = {};
  for (const [catId, lista] of Object.entries(catalogoNeon.combosPorCategoria)) combosPorCat[catId] = lista.map(mapCombo);

  const catalogo: StoreCatalogo = {
    loja_id: lojaId,
    categorias: catalogoNeon.categorias.map((c) => ({ id: c.id, nome: c.nome, modo_exibicao: c.modoExibicao as StoreCatalogo["categorias"][number]["modo_exibicao"] })),
    produtosPorCat,
    combosPorCat,
    destaques: catalogoNeon.destaques.map((d) => ("tipo" in d ? mapCombo(d) : mapProduto(d))),
    produtosEmPromo: catalogoNeon.produtosEmPromo.map(mapProduto),
    promoAutoPopup: catalogoNeon.promoAutoPopup ? mapProduto(catalogoNeon.promoAutoPopup) : null,
  };

  if (!perfil.lojaAtiva) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5ede5] p-6">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <span className="mb-3 block text-4xl">🛎️</span>
          <h1 className="mb-2 text-lg font-semibold text-neutral-900">
            {perfil.nomeLoja} esta temporariamente indisponivel
          </h1>
          <p className="text-sm text-neutral-500">
            Este cardapio nao esta aceitando pedidos no momento. Tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  return <StoreView perfil={perfil} catalogo={catalogo} />;
}
