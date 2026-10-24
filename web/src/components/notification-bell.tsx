"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Receipt, ReceiptText, Star, X } from "lucide-react";
import { cn } from "cn";
import { OrderCard } from "@/components/ordermanager/order-card";
import { LinkMotoboyDialog } from "@/components/ordermanager/link-motoboy-dialog";
import type { Motoboy, Pedido } from "@/lib/pedidos";

type NotifItem = {
  id: number;
  codigo: string | number | null;
  criado_em: string;
  cliente: string;
  status: string | null;
  origem: string | null;
  tipo: "novo" | "editado" | "avaliacao" | "conta";
  chave: string;
  nota?: number;
  pedido_id?: number;
};

function formatarTempo(iso: string): string {
  if (!iso) return "";
  const data = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const horas = Math.floor(diffMin / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? "s" : ""}`;
}

let audioAlarme: HTMLAudioElement | null = null;
function obterAudioAlarme(): HTMLAudioElement | null {
  if (audioAlarme) return audioAlarme;
  try {
    audioAlarme = new Audio("/sounds/notificacao.mp3");
    audioAlarme.preload = "auto";
  } catch {
    return null;
  }
  return audioAlarme;
}

function tocarAlarme() {
  const audio = obterAudioAlarme();
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // autoplay bloqueado antes do primeiro clique na pagina; sem alarme visual de erro
    });
  } catch {
    // reproducao pode falhar silenciosamente; sem alarme visual de erro
  }
}

export function NotificationBell({
  lojaId,
  phpAdminUrl,
  theme = "light",
}: {
  lojaId: number;
  phpAdminUrl: string;
  theme?: "light" | "dark";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [itens, setItens] = useState<NotifItem[]>([]);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const maiorIdPedidoRef = useRef<number | null>(null);
  const maiorIdAvaliacaoRef = useRef<number | null>(null);
  const maiorIdContaRef = useRef<number | null>(null);
  const audioDesbloqueadoRef = useRef(false);

  /* Pedidos vindos da loja (origem "loja") trocam o toast discreto por um
     card flutuante com os dados completos — o lojista aceita/recusa/vincula
     o entregador direto da notificacao, sem precisar abrir o Gestor de
     Pedidos. */
  const [pedidosFlutuantes, setPedidosFlutuantes] = useState<Pedido[]>([]);
  const [vincularFlutuante, setVincularFlutuante] = useState<Pedido | null>(null);
  const [motoboysFlutuante, setMotoboysFlutuante] = useState<Motoboy[]>([]);

  const removerFlutuante = useCallback((id: number) => {
    setPedidosFlutuantes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const abrirFlutuante = useCallback(
    (pedido: Pedido) => {
      removerFlutuante(pedido.id);
      router.push(`/ordermanager?pedido=${pedido.id}`);
    },
    [removerFlutuante, router]
  );

  async function moverStatusFlutuante(pedido: Pedido, status: string) {
    try {
      const res = await fetch("/api/ordermanager/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pedido.id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.msg ?? "Erro ao atualizar o pedido.");
        return;
      }
      toast.success(status === "cancelado" ? "Pedido recusado." : "Pedido aceito.");
      removerFlutuante(pedido.id);
    } catch {
      toast.error("Erro de conexão.");
    }
  }

  async function abrirVincularFlutuante(pedido: Pedido) {
    try {
      const res = await fetch(`/api/ordermanager/motoboys?pedido_id=${pedido.id}`);
      const data = await res.json();
      setMotoboysFlutuante(data.ok ? (data.motoboys ?? []) : []);
    } catch {
      setMotoboysFlutuante([]);
    }
    setVincularFlutuante(pedido);
  }

  useEffect(() => setMounted(true), []);

  const posicionarDropdown = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = 320;
    const spacing = 6;
    let left = rect.right + spacing;
    if (left + width > window.innerWidth - 12) {
      left = rect.left - width - spacing;
    }
    if (left < 12) left = 12;
    setPos({ top: rect.bottom + spacing, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    posicionarDropdown();
    window.addEventListener("resize", posicionarDropdown);
    return () => window.removeEventListener("resize", posicionarDropdown);
  }, [open, posicionarDropdown]);

  const readKey = `notif_read_${lojaId || 0}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(readKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setLidas(new Set(arr.map(String)));
      }
    } catch {
      // localStorage indisponivel (modo privado etc.) — comeca sem nada lido
    }
  }, [readKey]);

  const marcarLida = useCallback(
    (chave: string) => {
      setLidas((prev) => {
        const next = new Set(prev);
        next.add(chave);
        try {
          localStorage.setItem(readKey, JSON.stringify(Array.from(next).slice(-200)));
        } catch {
          // sem persistencia; a marcacao ainda vale para a sessao atual
        }
        return next;
      });
    },
    [readKey]
  );

  const abrirItem = useCallback(
    (item: NotifItem) => {
      marcarLida(item.chave);
      setOpen(false);
      if (item.tipo === "avaliacao") {
        router.push("/avaliacoes");
      } else if (item.tipo === "conta") {
        router.push(item.pedido_id ? `/ordermanager?pedido=${item.pedido_id}` : "/ordermanager");
      } else {
        router.push(`/ordermanager?pedido=${item.id}`);
      }
    },
    [marcarLida, router, phpAdminUrl]
  );

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) return;
      const novosItens: NotifItem[] = data.pedidos || [];
      setItens(novosItens);

      const novos = novosItens.filter((i) => i.tipo === "novo");
      const maiorId = novos.length ? Math.max(...novos.map((i) => i.id)) : 0;
      if (maiorIdPedidoRef.current === null) {
        maiorIdPedidoRef.current = maiorId;
      } else if (maiorId > maiorIdPedidoRef.current) {
        const recemChegados = novos.filter((i) => i.id > maiorIdPedidoRef.current!);
        const recemChegadosLoja = recemChegados.filter((i) => i.origem === "loja");
        const recemChegadosOutros = recemChegados.filter((i) => i.origem !== "loja");

        recemChegadosOutros.forEach((item) => {
          toast.custom(() => (
            <button
              onClick={() => abrirItem(item)}
              className="flex w-full items-start gap-3 rounded-lg border bg-popover p-3 text-left shadow-lg"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Receipt size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Novo pedido!</div>
                <div className="truncate text-xs text-muted-foreground">
                  Pedido #{item.codigo ?? item.id} · {item.cliente}
                </div>
              </div>
            </button>
          ));
        });

        /* Pedidos da loja ganham o card flutuante completo (ver render mais
           abaixo) em vez do toast discreto — busca os dados completos na
           mesma lista que o Gestor de Pedidos usa, pra reaproveitar o
           OrderCard tal como ele aparece la. */
        if (recemChegadosLoja.length > 0) {
          fetch("/api/ordermanager/pedidos", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
              if (!data.ok) return;
              const idsLoja = new Set(recemChegadosLoja.map((i) => i.id));
              const encontrados: Pedido[] = (data.pedidos ?? []).filter((p: Pedido) => idsLoja.has(p.id));
              if (encontrados.length > 0) {
                setPedidosFlutuantes((prev) => [...prev, ...encontrados.filter((p) => !prev.some((x) => x.id === p.id))]);
              }
            })
            .catch(() => {});
          tocarAlarme();
        }
        maiorIdPedidoRef.current = maiorId;
      }

      const avaliacoes = novosItens.filter((i) => i.tipo === "avaliacao");
      const maiorIdAv = avaliacoes.length ? Math.max(...avaliacoes.map((i) => i.id)) : 0;
      if (maiorIdAvaliacaoRef.current === null) {
        maiorIdAvaliacaoRef.current = maiorIdAv;
      } else if (maiorIdAv > maiorIdAvaliacaoRef.current) {
        const recemChegadas = avaliacoes.filter((i) => i.id > maiorIdAvaliacaoRef.current!);
        recemChegadas.forEach((item) => {
          const nota = item.nota || 0;
          toast.custom(() => (
            <button
              onClick={() => abrirItem(item)}
              className="flex w-full items-start gap-3 rounded-lg border bg-popover p-3 text-left shadow-lg"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                <Star size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Nova avaliação!</div>
                <div className="truncate text-xs text-muted-foreground">
                  {"★".repeat(nota)}
                  {"☆".repeat(Math.max(0, 5 - nota))} · {item.cliente}
                </div>
              </div>
            </button>
          ));
        });
        tocarAlarme();
        maiorIdAvaliacaoRef.current = maiorIdAv;
      }

      const contas = novosItens.filter((i) => i.tipo === "conta");
      const maiorIdConta = contas.length ? Math.max(...contas.map((i) => i.id)) : 0;
      if (maiorIdContaRef.current === null) {
        maiorIdContaRef.current = maiorIdConta;
      } else if (maiorIdConta > maiorIdContaRef.current) {
        const recemChegadas = contas.filter((i) => i.id > maiorIdContaRef.current!);
        recemChegadas.forEach((item) => {
          toast.custom(
            () => (
              <button
                onClick={() => abrirItem(item)}
                className="flex w-full items-start gap-3 rounded-lg border border-destructive/40 bg-popover p-3 text-left shadow-lg"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <ReceiptText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">Pediram a conta!</div>
                  <div className="truncate text-xs text-muted-foreground">{item.cliente}</div>
                </div>
              </button>
            ),
            { duration: 10000 }
          );
        });
        tocarAlarme();
        maiorIdContaRef.current = maiorIdConta;
      }
    } catch {
      // rede instavel; a proxima chamada do polling tenta de novo
    }
  }, [abrirItem]);

  useEffect(() => {
    if (!audioDesbloqueadoRef.current) {
      const desbloquear = () => {
        const audio = obterAudioAlarme();
        audio
          ?.play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {});
        audioDesbloqueadoRef.current = true;
      };
      document.addEventListener("click", desbloquear, { once: true });
    }
    carregar();
    const interval = setInterval(carregar, 10000);
    window.addEventListener("focus", carregar);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", carregar);
    };
  }, [carregar]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  const naoLidas = itens.filter((i) => !lidas.has(i.chave));
  const visiveis = tab === "unread" ? naoLidas : itens;

  const panel = open && mounted && (
    <div
      ref={panelRef}
      className="fixed z-50 w-80 overflow-hidden rounded-3xl border bg-popover text-popover-foreground shadow-2xl"
      style={{ top: pos.top, left: pos.left }}
    >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-sm font-semibold">Notificações</span>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-1 px-4 pb-3">
            <div className="flex gap-1 rounded-full bg-muted p-1">
              <button
                onClick={() => setTab("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  tab === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas
              </button>
              <button
                onClick={() => setTab("unread")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  tab === "unread" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Não lidas
              </button>
            </div>
          </div>
          <div className="scrollbar-hidden max-h-80 space-y-1 overflow-y-auto px-2 pb-2">
            {visiveis.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Bell size={22} />
                <span className="text-xs">
                  {tab === "unread" ? "Nenhuma notificação no momento." : "Nenhuma notificação."}
                </span>
              </div>
            )}
            {visiveis.map((item) => {
              const isAvaliacao = item.tipo === "avaliacao";
              const isEditado = item.tipo === "editado";
              const isConta = item.tipo === "conta";
              const isNaoLida = !lidas.has(item.chave);
              const nota = item.nota || 0;
              return (
                <button
                  key={item.chave}
                  onClick={() => abrirItem(item)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-muted/70",
                    isNaoLida && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      isAvaliacao ? "bg-amber-500/15 text-amber-500" : isConta ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                    )}
                  >
                    {isAvaliacao ? <Star size={15} /> : isConta ? <ReceiptText size={15} /> : <Receipt size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">
                      {isAvaliacao
                        ? "Você recebeu uma nova avaliação."
                        : isEditado
                          ? "Pedido editado."
                          : isConta
                            ? "Pediram a conta."
                            : "Você recebeu um novo pedido."}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {isConta ? item.cliente : `Pedido #${item.codigo ?? item.id} · ${item.cliente}`}
                      {isAvaliacao && ` · ${"★".repeat(nota)}${"☆".repeat(Math.max(0, 5 - nota))}`}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                      {formatarTempo(item.criado_em)}
                      {isNaoLida && <span className="size-1.5 rounded-full bg-primary" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
    </div>
  );

  const flutuantes = mounted && pedidosFlutuantes.length > 0 && (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex flex-col items-center gap-3 px-4">
      {pedidosFlutuantes.map((pedido) => (
        <div
          key={pedido.id}
          className="pointer-events-auto relative w-full max-w-[280px] animate-in fade-in slide-in-from-top-8 duration-300"
        >
          <button
            type="button"
            onClick={() => removerFlutuante(pedido.id)}
            aria-label="Dispensar"
            className="absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
          >
            <X size={12} />
          </button>
          <OrderCard
            pedido={pedido}
            onAbrir={() => abrirFlutuante(pedido)}
            onImprimir={() => abrirFlutuante(pedido)}
            onAvancar={() => moverStatusFlutuante(pedido, "aceito")}
            onRecusar={() => moverStatusFlutuante(pedido, "cancelado")}
            onVincularMotoboy={() => abrirVincularFlutuante(pedido)}
            onDragStart={(e) => e.preventDefault()}
            onDragEnd={() => {}}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "relative rounded-md p-1.5",
          theme === "dark"
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-label="Notificações"
      >
        <Bell size={17} />
        {naoLidas.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {naoLidas.length > 99 ? "99+" : naoLidas.length}
          </span>
        )}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
      {mounted && flutuantes ? createPortal(flutuantes, document.body) : null}
      {mounted && vincularFlutuante
        ? createPortal(
            <LinkMotoboyDialog
              open={vincularFlutuante !== null}
              onOpenChange={(v) => !v && setVincularFlutuante(null)}
              pedidoId={vincularFlutuante.id}
              pedidoNome={vincularFlutuante.nome}
              motoboys={motoboysFlutuante}
              motoboyAtualId={vincularFlutuante.motoboy_id}
              onVinculado={(motoboyId, motoboyNome) => {
                setPedidosFlutuantes((prev) =>
                  prev.map((p) => (p.id === vincularFlutuante.id ? { ...p, motoboy_id: motoboyId, motoboy_nome: motoboyNome || null } : p))
                );
                setVincularFlutuante(null);
              }}
            />,
            document.body
          )
        : null}
    </>
  );
}
