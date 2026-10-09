import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { BadgeCheck, Banknote, ShoppingBag, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TopProdutosChart } from "@/components/top-produtos-chart";
import { DashboardChart } from "@/components/dashboard-chart";
import { ConversionFunnel } from "@/components/conversion-funnel";
import { DashboardSearch } from "@/components/dashboard-search";
import { StoreLinkField } from "@/components/store-link-field";
import { VerseOfDay } from "@/components/verse-of-day";
import { getSessaoAdmin } from "@/lib/session";
import { getSidebarDataNeon } from "@/db/queries/sidebar";
import { montarDashboard } from "@/db/queries/dashboard";
import { funilConversao } from "@/db/queries/funilConversao";
import { getConfig } from "@/db/queries/config";
import { formatBRLMilhar } from "@/components/ordermanager/constants";

type VersiculoResponse = {
  ok: true;
  ativo: boolean;
  texto?: string;
  referencia?: string;
  data?: string;
  reacao?: "gostou" | "nao_gostou" | null;
  fonte_url?: string;
};

/*
 * Busca do versiculo do dia (scraping de bibliaon.com) deliberadamente
 * deixada em PHP — ver o comentario em db/queries/versiculoReacao.ts. O PHP
 * roda contra o MySQL legado e tem seu proprio check de "ativo" ali, mas o
 * toggle em Settings (settings-manager.tsx / configuracoesLoja.ts) grava em
 * `versiculo_dashboard_ativo` no Postgres — bancos diferentes, nunca se veem.
 * Por isso o "ativo" que decide se o card aparece e sempre o do Postgres
 * (getConfig abaixo); o PHP so e chamado, e so quando precisa buscar o
 * texto do dia, quando esse Postgres ja disse que esta ativo.
 */
async function carregarVersiculo(): Promise<VersiculoResponse | null> {
  try {
    const { phpApiFetch } = await import("@/lib/phpApi");
    return await phpApiFetch<VersiculoResponse>("/admin/api/v1/versiculo_dia.php");
  } catch {
    return null;
  }
}

async function resolverLinkLoja(lojaId: number): Promise<string> {
  const linkLojaRaw = await getConfig(lojaId, "link_loja", "");
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}/`;
  const baseAntigo = `${base}lilly/`;

  let slug: string;
  if (linkLojaRaw.startsWith(baseAntigo)) {
    slug = decodeURIComponent(linkLojaRaw.slice(baseAntigo.length));
  } else {
    const mParam = linkLojaRaw.match(/[?&]loja=([^&]+)/);
    const mPath = linkLojaRaw.match(/\/([^/?]+)\/?$/);
    if (mParam) slug = decodeURIComponent(mParam[1]);
    else if (mPath) slug = mPath[1];
    else slug = linkLojaRaw;
  }
  slug = slug.replace(/\.php$/i, "");

  return slug !== "" ? `${base}${slug}` : "";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const params = await searchParams;
  const periodo = Number(params.periodo ?? "7");

  let data: Awaited<ReturnType<typeof montarDashboard>> | null = null;
  let linkLoja = "";
  let funil: Awaited<ReturnType<typeof funilConversao>> | null = null;
  let erro: string | null = null;

  try {
    [data, linkLoja, funil] = await Promise.all([montarDashboard(sessao.lojaId, periodo), resolverLinkLoja(sessao.lojaId), funilConversao(sessao.lojaId, 7)]);
  } catch {
    erro = "Erro ao carregar o dashboard.";
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  let menu: Record<string, boolean> = {};
  try {
    const sidebarData = await getSidebarDataNeon(sessao.id, sessao.lojaId, sessao.perfil);
    menu = sidebarData.menu;
  } catch {
    // busca fica vazia se o sidebar nao carregar; nao bloqueia o resto do dashboard
  }

  const versiculoAtivo = (await getConfig(sessao.lojaId, "versiculo_dashboard_ativo", "1")) !== "0";
  const versiculo = versiculoAtivo ? await carregarVersiculo() : null;

  if (erro || !data) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-6 sm:px-5">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.loja.nome}</h1>
            {data.loja.verificada && <BadgeCheck className="text-primary" size={20} />}
          </div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
        </div>
        <div className="self-end justify-self-center">
          <DashboardSearch menu={menu} phpAdminUrl={phpAdminUrl} />
        </div>
        <div className="justify-self-start sm:justify-self-end">
          <StoreLinkField link={linkLoja} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Receita do mês atual</span>
            <Banknote className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatBRLMilhar(data.kpis.receitaMesAtual)}</div>
            <div className="text-xs text-muted-foreground">{data.kpis.faixaReceitaMes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Pedidos finalizados</span>
            <ShoppingBag className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.pedidosPeriodo}</div>
            <div className="text-xs text-muted-foreground">nos últimos {data.periodo} dias</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Clientes cadastrados</span>
            <Users className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.clientesCadastrados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Acessos ao cardápio</span>
            <TrendingUp className="text-primary" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{data.kpis.acessosMenu}</div>
            <div className="text-xs text-muted-foreground">este mês</div>
          </CardContent>
        </Card>
      </div>

      {funil && (
        <ConversionFunnel
          visitas={funil.visitas}
          views={funil.views}
          carrinhos={funil.carrinhos}
          pedidos={funil.pedidos}
          pctViews={funil.pctViews}
          pctCarrinhos={funil.pctCarrinhos}
          pctPedidos={funil.pctPedidos}
          conversao={funil.conversao}
          dias={funil.dias}
        />
      )}

      {versiculoAtivo && versiculo?.ok && versiculo.texto && (
        <VerseOfDay
          texto={versiculo.texto}
          referencia={versiculo.referencia ?? ""}
          data={versiculo.data ?? ""}
          fonteUrl={versiculo.fonte_url ?? ""}
          reacaoInicial={versiculo.reacao ?? null}
        />
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Desempenho</h2>
        </CardHeader>
        <CardContent>
          <DashboardChart
            periodo={data.periodo}
            labels={data.grafico.labels}
            seriePedidos={data.grafico.seriePedidos}
            serieValores={data.grafico.serieValores}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Produtos com mais saída</h2>
          <p className="text-xs text-muted-foreground">Top 5 produtos com maior rotatividade</p>
        </CardHeader>
        <CardContent>
          {data.topProdutos.length > 0 ? (
            <TopProdutosChart produtos={data.topProdutos} />
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Sem dados suficientes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
