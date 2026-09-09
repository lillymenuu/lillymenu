import Link from "next/link";
import { Star, MessageSquareOff } from "lucide-react";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type Avaliacao = {
  id: number;
  nota: number;
  descricao: string;
  criado_em: string;
  pedido_id: number;
  codigo_pedido: number;
  pedido_total: number | null;
  pedido_data: string | null;
  cliente_nome: string | null;
  cliente_tel: string | null;
};

type AvaliacoesResponse = {
  ok: true;
  total: number;
  media: number;
  distribuicao: Record<string, number>;
  total_filtrado: number;
  pagina: number;
  paginas: number;
  avaliacoes: Avaliacao[];
};

const NOTA_LABEL: Record<number, string> = {
  5: "Ótimo",
  4: "Bom",
  3: "Regular",
  2: "Ruim",
  1: "Péssimo",
};

const NOTA_COR: Record<number, string> = {
  5: "#10b981",
  4: "#3b82f6",
  3: "#f59e0b",
  2: "#f97316",
  1: "#ef4444",
};

function Stars({ nota, size = 14 }: { nota: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= nota ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function formatarData(iso: string, comHora = true) {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ nota?: string; busca?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const filtroNota = params.nota ? Number(params.nota) : undefined;
  const filtroBusca = params.busca ?? "";
  const pagina = params.pagina ?? "1";

  let data: AvaliacoesResponse | null = null;
  let erro: string | null = null;

  try {
    data = await phpApiFetch<AvaliacoesResponse>(
      `/admin/api/v1/avaliacoes.php${buildQuery({
        nota: filtroNota,
        busca: filtroBusca,
        pagina,
      })}`
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar avaliações.";
  }

  const temFiltro = Boolean(filtroNota || filtroBusca);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Avaliações dos Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Opiniões e notas sobre os pedidos da sua loja
          </p>
        </div>
        <form className="flex items-center gap-2" action="/avaliacoes" method="get">
          <Input
            type="search"
            name="busca"
            placeholder="Buscar..."
            defaultValue={filtroBusca}
            className="w-48"
          />
          {temFiltro && (
            <Link href="/avaliacoes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Limpar
            </Link>
          )}
        </form>
      </div>

      {erro && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">
            {erro}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Resumo</h2>
                <p className="text-xs text-muted-foreground">
                  Total e média das avaliações
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
                  <span className="text-xl font-bold">{data.total}</span>
                  <span className="text-[11px] text-muted-foreground">Total</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-lg border p-3">
                  <span
                    className="text-xl font-bold"
                    style={{
                      color:
                        data.media >= 4 ? "#10b981" : data.media >= 3 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {data.total > 0 ? data.media.toFixed(1).replace(".", ",") : "-"}
                  </span>
                  {data.total > 0 && <Stars nota={Math.round(data.media)} size={11} />}
                  <span className="text-[11px] text-muted-foreground">Média</span>
                </div>
                {[5, 4, 3, 2, 1].map((n) => (
                  <Link
                    key={n}
                    href={`/avaliacoes${buildQuery({ nota: n, busca: filtroBusca })}`}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors hover:bg-muted ${
                      filtroNota === n ? "border-primary bg-muted" : ""
                    }`}
                  >
                    <span className="text-base font-semibold" style={{ color: NOTA_COR[n] }}>
                      {data.distribuicao[String(n)] ?? 0}
                    </span>
                    <Stars nota={n} size={11} />
                    <span className="text-[11px] text-muted-foreground">{NOTA_LABEL[n]}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Distribuição</h2>
                <p className="text-xs text-muted-foreground">Percentual por nota</p>
              </CardHeader>
              <CardContent>
                {data.total > 0 ? (
                  <div className="flex flex-col gap-2">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const cnt = data!.distribuicao[String(n)] ?? 0;
                      const pct = data!.total > 0 ? Math.round((cnt / data!.total) * 100) : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-3 font-bold" style={{ color: NOTA_COR[n] }}>
                            {n}
                          </span>
                          <Star size={11} style={{ color: NOTA_COR[n] }} className="fill-current" />
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: NOTA_COR[n] }}
                            />
                          </div>
                          <span className="w-6 text-right text-muted-foreground">{cnt}</span>
                          <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Avaliações</h2>
                <p className="text-xs text-muted-foreground">
                  {data.total_filtrado} resultado{data.total_filtrado !== 1 ? "s" : ""}
                </p>
              </div>
              {temFiltro && (
                <Link href="/avaliacoes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                  Limpar filtros
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {data.avaliacoes.length > 0 ? (
                <div className="flex flex-col divide-y">
                  {data.avaliacoes.map((av) => (
                    <div key={av.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">
                            {av.cliente_nome ?? "Cliente"}
                          </div>
                          {av.cliente_tel && (
                            <div className="text-xs text-muted-foreground">{av.cliente_tel}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Stars nota={av.nota} />
                          <Badge style={{ background: NOTA_COR[av.nota] }} className="text-white">
                            {NOTA_LABEL[av.nota]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Pedido #{av.codigo_pedido}</span>
                        {av.pedido_data && <span>{formatarData(av.pedido_data)}</span>}
                        {av.pedido_total != null && (
                          <span>
                            R$ {av.pedido_total.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                      {av.descricao && (
                        <p className="text-sm text-foreground/90">{av.descricao}</p>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        {formatarData(av.criado_em)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                  <MessageSquareOff size={28} />
                  <p className="text-sm">
                    {data.total > 0
                      ? "Nenhuma avaliação para os filtros selecionados."
                      : "Ainda não há avaliações."}
                  </p>
                </div>
              )}

              {data.paginas > 1 && (
                <div className="mt-4 flex items-center justify-center gap-1">
                  {Array.from({ length: data.paginas }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/avaliacoes${buildQuery({
                        nota: filtroNota,
                        busca: filtroBusca,
                        pagina: p,
                      })}`}
                      className={cn(
                        buttonVariants({
                          variant: p === data!.pagina ? "default" : "outline",
                          size: "sm",
                        })
                      )}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
