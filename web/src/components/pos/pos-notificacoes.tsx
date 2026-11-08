"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Receipt } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OrderDetailDialog } from "@/components/ordermanager/order-detail-dialog";
import type { Motoboy } from "@/lib/pedidos";
import { cn } from "cn";

type NotifPedido = { id: number; codigo: string | null; cliente: string; criado_em: string; origem: string | null; tipo: string };

const VISTOS_KEY = "pos_notif_pedidos_vistos";

function lerVistos(): Set<number> {
  try {
    const raw = localStorage.getItem(VISTOS_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function horaCurta(criadoEm: string) {
  const m = /(\d{2}):(\d{2})/.exec(criadoEm.slice(11));
  return m ? `${m[1]}:${m[2]}` : "";
}

/*
 * Sino do topo do balcao: acompanha (a cada 10s, mesmo intervalo do sino do
 * admin) os pedidos de hoje vindos da loja online. Pedido ainda nao visto deixa
 * o sino pulsando com contador; clicar abre direto o pedido nao visto mais
 * recente no modal de detalhe (o mesmo do Gestor de pedidos), com o balcao
 * desfocado atras. Sem pendencia, o clique mostra a lista dos pedidos do dia.
 */
export function PosNotificacoes({ phpAdminUrl }: { phpAdminUrl: string }) {
  const [pedidos, setPedidos] = useState<NotifPedido[]>([]);
  // O balcao so abre no navegador (overlay aberto pelo usuario), entao da pra ler o localStorage ja no estado inicial.
  const [vistos, setVistos] = useState<Set<number>>(() => (typeof window === "undefined" ? new Set() : lerVistos()));
  const [listaAberta, setListaAberta] = useState(false);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const semHistorico = useRef(false);

  const salvarVistos = useCallback((next: Set<number>) => {
    setVistos(next);
    try {
      localStorage.setItem(VISTOS_KEY, JSON.stringify(Array.from(next).slice(-300)));
    } catch {
      // sem persistencia; vale para a sessao atual
    }
  }, []);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) return;
      const lista: NotifPedido[] = (data.pedidos ?? []).filter((p: NotifPedido) => p.tipo === "novo" && p.origem === "loja");
      lista.sort((a, b) => b.id - a.id);
      /* Primeiro uso neste navegador: os pedidos que ja existiam contam como vistos — so os que chegarem depois sinalizam. */
      if (semHistorico.current) {
        semHistorico.current = false;
        salvarVistos(new Set(lista.map((p) => p.id)));
      }
      setPedidos(lista);
    } catch {
      // silencioso — tenta de novo no proximo ciclo
    }
  }, [salvarVistos]);

  useEffect(() => {
    try {
      semHistorico.current = localStorage.getItem(VISTOS_KEY) === null;
    } catch {
      semHistorico.current = false;
    }
    carregar();
    const intervalo = setInterval(carregar, 10000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  function marcarVisto(id: number) {
    if (vistos.has(id)) return;
    salvarVistos(new Set([...vistos, id]));
  }

  async function abrirPedido(id: number) {
    marcarVisto(id);
    setListaAberta(false);
    setDetalheId(id);
    try {
      const res = await fetch(`/api/ordermanager/motoboys?pedido_id=${id}`);
      const data = await res.json();
      setMotoboys(data.ok ? (data.motoboys ?? []) : []);
    } catch {
      setMotoboys([]);
    }
  }

  const naoVistos = pedidos.filter((p) => !vistos.has(p.id));

  /* Com pedido nao visto, o clique no sino abre direto o mais recente em vez da lista. */
  function mudarLista(aberta: boolean) {
    if (aberta && naoVistos.length > 0) {
      abrirPedido(naoVistos[0].id);
      return;
    }
    setListaAberta(aberta);
  }

  return (
    <>
      <Popover open={listaAberta} onOpenChange={mudarLista}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={naoVistos.length > 0 ? `${naoVistos.length} novo(s) pedido(s)` : "Pedidos da loja"}
              title={naoVistos.length > 0 ? "Novo pedido — clique para ver" : "Pedidos da loja de hoje"}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full transition-colors",
                naoVistos.length > 0 ? "bg-primary/10 text-primary hover:bg-primary/15" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            />
          }
        >
          {naoVistos.length > 0 ? <span className="absolute inset-0 animate-ping rounded-full bg-primary/25" /> : null}
          <Bell className={cn("relative size-4", naoVistos.length > 0 && "animate-[pos-sino_1.2s_ease-in-out_infinite]")} />
          {naoVistos.length > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-white">
              {naoVistos.length > 9 ? "9+" : naoVistos.length}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-0">
          <div className="border-b px-3 py-2 text-xs font-semibold">Pedidos da loja hoje</div>
          <div className="max-h-80 overflow-y-auto p-1">
            {pedidos.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum pedido da loja hoje.</div>
            ) : (
              pedidos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrirPedido(p.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Receipt className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">
                      Pedido #{p.codigo ?? p.id} · {p.cliente}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{horaCurta(p.criado_em)}</span>
                  </span>
                  {!vistos.has(p.id) ? <span className="size-2 shrink-0 rounded-full bg-primary" /> : null}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      <OrderDetailDialog
        open={detalheId !== null}
        onOpenChange={(v) => !v && setDetalheId(null)}
        pedidoId={detalheId}
        motoboys={motoboys}
        phpAdminUrl={phpAdminUrl}
        onAtualizado={carregar}
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-sm"
      />

      <style>{`@keyframes pos-sino{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(8deg)}60%{transform:rotate(-5deg)}75%{transform:rotate(0)}}`}</style>
    </>
  );
}
