"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Receipt, Star, X } from "lucide-react";
import { cn } from "cn";

type NotifItem = {
  id: number;
  codigo: string | number | null;
  criado_em: string;
  cliente: string;
  status: string | null;
  origem: string | null;
  tipo: "novo" | "editado" | "avaliacao";
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

let audioCtx: AudioContext | null = null;
function obterAudioCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

function tocarAlarme() {
  const ctx = obterAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const bip = (freq: number, inicio: number, duracao: number, vol: number) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      const t = ctx.currentTime + inicio;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
      osc.start(t);
      osc.stop(t + duracao + 0.02);
    } catch {
      // Web Audio pode falhar silenciosamente (autoplay policy); sem alarme visual de erro
    }
  };
  const passo = 0.16;
  for (let ciclo = 0; ciclo < 2; ciclo++) {
    for (let i = 0; i < 4; i++) {
      bip(i % 2 === 0 ? 1174 : 1568, (ciclo * 4 + i) * passo, passo * 0.8, 0.55);
    }
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
  const audioDesbloqueadoRef = useRef(false);

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
        recemChegados.forEach((item) => {
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
        if (recemChegados.some((i) => i.origem === "loja")) {
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
    } catch {
      // rede instavel; a proxima chamada do polling tenta de novo
    }
  }, [abrirItem]);

  useEffect(() => {
    if (!audioDesbloqueadoRef.current) {
      const desbloquear = () => {
        const ctx = obterAudioCtx();
        if (ctx?.state === "suspended") ctx.resume().catch(() => {});
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
      className="fixed z-50 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
      style={{ top: pos.top, left: pos.left }}
    >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notificações</span>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-1 border-b p-1.5">
            <button
              onClick={() => setTab("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                tab === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setTab("unread")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                tab === "unread" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              Não lidas
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {visiveis.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Bell size={22} />
                <span className="text-xs">
                  {tab === "unread" ? "Nenhuma notificação no momento." : "Nenhuma notificação."}
                </span>
              </div>
            )}
            {visiveis.map((item) => {
              const isAvaliacao = item.tipo === "avaliacao";
              const isEditado = item.tipo === "editado";
              const isNaoLida = !lidas.has(item.chave);
              const nota = item.nota || 0;
              return (
                <button
                  key={item.chave}
                  onClick={() => abrirItem(item)}
                  className="flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted"
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      isAvaliacao ? "bg-amber-500/15 text-amber-500" : "bg-primary/15 text-primary"
                    )}
                  >
                    {isAvaliacao ? <Star size={14} /> : <Receipt size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">
                      {isAvaliacao
                        ? "Você recebeu uma nova avaliação."
                        : isEditado
                          ? "Pedido editado."
                          : "Você recebeu um novo pedido."}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      Pedido #{item.codigo ?? item.id} · {item.cliente}
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
    </>
  );
}
