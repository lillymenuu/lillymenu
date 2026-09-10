"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Images, Megaphone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/components/ordermanager/constants";
import type { Produto } from "@/lib/produtos";
import { PromoDialog } from "./promo-dialog";
import { FlyersDialog } from "./flyers-dialog";
import { cn } from "cn";

const ETIQUETAS_PROMO: Record<string, { label: string; cor: string }> = {
  recomendado: { label: "Recomendado", cor: "#2563eb" },
  mais_pedido: { label: "Mais pedido", cor: "#f59e0b" },
  novidade: { label: "Novidade", cor: "#16a34a" },
  edicao_limitada: { label: "Edição limitada", cor: "#9333ea" },
};

const SEM_CATEGORIA = { id: 0, nome: "Sem categoria" };

export function PromotionManager({
  produtosIniciais,
  limiteAtivas,
  flyersIniciais,
  flyersAtivoInicial,
  phpAdminUrl,
}: {
  produtosIniciais: Produto[];
  limiteAtivas: number;
  flyersIniciais: string[];
  flyersAtivoInicial: boolean;
  phpAdminUrl: string;
}) {
  const [produtos, setProdutos] = useState(produtosIniciais);
  const [flyers, setFlyers] = useState(flyersIniciais);
  const [flyersAtivo, setFlyersAtivo] = useState(flyersAtivoInicial);

  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [flyersOpen, setFlyersOpen] = useState(false);

  const ativasCount = produtos.filter((p) => p.em_promo).length;
  const limiteAtingido = ativasCount >= limiteAtivas;

  const grupos = useMemo(() => {
    const porCategoria = new Map<number, Produto[]>();
    const semCategoria: Produto[] = [];
    for (const p of produtos) {
      if (p.categoria_id && p.categoria) {
        if (!porCategoria.has(p.categoria_id)) porCategoria.set(p.categoria_id, []);
        porCategoria.get(p.categoria_id)!.push(p);
      } else {
        semCategoria.push(p);
      }
    }
    const lista = Array.from(porCategoria.entries()).map(([id, itens]) => ({
      id,
      nome: itens[0].categoria as string,
      produtos: itens,
    }));
    if (semCategoria.length) {
      lista.push({ id: SEM_CATEGORIA.id, nome: SEM_CATEGORIA.nome, produtos: semCategoria });
    }
    return lista;
  }, [produtos]);

  async function recarregar() {
    try {
      const res = await fetch("/api/promotion/listar", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) return;
      setProdutos(data.produtos);
      setFlyers(data.flyers);
      setFlyersAtivo(data.flyers_ativo);
    } catch {
      // silencioso — a UI ja reflete o ultimo estado salvo com sucesso
    }
  }

  function abrirProduto(p: Produto) {
    if (limiteAtingido && !p.em_promo) {
      toast.error(`Você já tem ${limiteAtivas} produtos em promoção. Desative um para ativar outro.`);
      return;
    }
    setProdutoEditando(p);
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Lance uma Promoção</h1>
          <p className="text-sm text-muted-foreground">
            Escolha até {limiteAtivas} produtos para colocar em promoção por tempo limitado (
            {ativasCount}/{limiteAtivas} ativos)
          </p>
        </div>
        <Button size="sm" onClick={() => setFlyersOpen(true)}>
          <Images size={14} /> Gerenciar slides de loja
        </Button>
      </div>

      {grupos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      )}

      {grupos.map((grupo) => (
        <div key={grupo.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{grupo.nome}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
            {grupo.produtos.map((p) => {
              const imagemUrl = p.imagem
                ? p.imagem.startsWith("http")
                  ? p.imagem
                  : `${phpAdminUrl}/${p.imagem}`
                : null;
              const bloqueado = limiteAtingido && !p.em_promo;
              const etiqueta = p.em_promo && p.promo_etiqueta ? ETIQUETAS_PROMO[p.promo_etiqueta] : null;
              return (
                <div
                  key={p.id}
                  onClick={() => abrirProduto(p)}
                  className={cn(
                    "flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md",
                    bloqueado && "cursor-not-allowed opacity-45 hover:shadow-none"
                  )}
                  title={bloqueado ? `Você já tem ${limiteAtivas} produtos em promoção. Desative um para editar este.` : undefined}
                >
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    {etiqueta && (
                      <span
                        className="absolute top-1.5 left-1.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase"
                        style={{ background: etiqueta.cor }}
                      >
                        {etiqueta.label}
                      </span>
                    )}
                    {imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imagemUrl} alt={p.nome} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package size={24} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <span className="truncate text-sm font-medium">{p.nome}</span>
                    {p.em_promo ? (
                      <>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-muted-foreground line-through">{formatBRL(p.preco)}</span>
                          <span className="font-semibold text-primary">{formatBRL(p.preco_promocional!)}</span>
                        </div>
                        <span className="flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Megaphone size={11} />
                          {p.dias_restantes !== null && p.dias_restantes !== undefined
                            ? `Faltam ${p.dias_restantes} dia${p.dias_restantes === 1 ? "" : "s"}`
                            : "Em promoção"}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold">{formatBRL(p.preco)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <PromoDialog
        open={produtoEditando !== null}
        onOpenChange={(v) => !v && setProdutoEditando(null)}
        produto={produtoEditando}
        phpAdminUrl={phpAdminUrl}
        onSalvo={() => {
          setProdutoEditando(null);
          recarregar();
        }}
      />

      <FlyersDialog
        open={flyersOpen}
        onOpenChange={setFlyersOpen}
        flyers={flyers}
        flyersAtivo={flyersAtivo}
        phpAdminUrl={phpAdminUrl}
        onAtivoChange={setFlyersAtivo}
        onSalvo={(novos) => setFlyers(novos)}
      />
    </div>
  );
}
