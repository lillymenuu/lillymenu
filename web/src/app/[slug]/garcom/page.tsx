import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolverLojaIdPorSlug } from "@/db/queries/lojaPerfil";
import { perfilGarcomLoja, mesasAtivasGarcom } from "@/db/queries/modoGarcom";
import { catalogoPdv, type ProdutoPdv, type ComboPdv } from "@/db/queries/pdvCatalogo";
import { getSessaoGarcom } from "@/lib/session";
import { GarcomApp } from "@/components/waitermode/garcom-app";
import type { StoreCategoria, StoreCombo, StoreProduto } from "@/lib/store/types";

async function baseUrlAtual(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/`;
}

function mapProduto(p: ProdutoPdv): StoreProduto {
  const emPromo = p.precoPromocional !== null && p.precoPromocional > 0;
  const precoFinal = emPromo ? p.precoPromocional! : p.preco;
  return {
    id: p.id,
    nome: p.nome ?? "",
    descricao: p.descricao,
    preco: precoFinal,
    preco_produto: p.preco,
    preco_base: p.preco,
    preco_final: precoFinal,
    em_promo: emPromo,
    desc_pct: emPromo ? Math.round((1 - precoFinal / p.preco) * 100) : 0,
    imagem: p.imagem ?? "",
    estoque: p.estoque,
    esgotado: p.estoque <= 0,
    tem_variacoes: p.temVariacoes ? 1 : 0,
    pontos_ganho: p.pontosGanho,
  };
}

function mapCombo(c: ComboPdv): StoreCombo {
  const emPromo = c.precoPromocional !== null && c.precoPromocional > 0;
  const precoFinal = emPromo ? c.precoPromocional! : c.preco;
  return {
    id: c.id,
    nome: c.nome,
    descricao: null,
    preco: precoFinal,
    preco_base: c.preco,
    preco_final: precoFinal,
    em_promo: emPromo,
    desc_pct: emPromo ? Math.round((1 - precoFinal / c.preco) * 100) : 0,
    imagem: c.imagem ?? "",
    tipo: "combo",
  };
}

/* Equivalente de public/garcom.php. */
export default async function GarcomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lojaId = await resolverLojaIdPorSlug(slug);
  if (!lojaId) notFound();

  const sessao = await getSessaoGarcom();
  if (!sessao || sessao.lojaId !== lojaId) redirect(`/${slug}/garcom_login`);

  const baseUrl = await baseUrlAtual();
  const [perfil, mesas, catalogo] = await Promise.all([perfilGarcomLoja(lojaId, baseUrl), mesasAtivasGarcom(lojaId), catalogoPdv(lojaId)]);

  const categorias: StoreCategoria[] = catalogo.categorias.map((c) => ({ id: c.id, nome: c.nome ?? "", modo_exibicao: "grid" }));
  const produtosPorCat: Record<string, StoreProduto[]> = {};
  const combosPorCat: Record<string, StoreCombo[]> = {};
  for (const p of catalogo.produtos) {
    if (p.categoriaId === null) continue;
    (produtosPorCat[p.categoriaId] ??= []).push(mapProduto(p));
  }
  for (const c of catalogo.combos) {
    if (c.categoriaId === null) continue;
    (combosPorCat[c.categoriaId] ??= []).push(mapCombo(c));
  }

  return (
    <GarcomApp lojaId={lojaId} slug={slug} garcomNome={sessao.nome} perfil={perfil} mesas={mesas} categorias={categorias} produtosPorCat={produtosPorCat} combosPorCat={combosPorCat} />
  );
}
