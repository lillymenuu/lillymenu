"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { saCall, urlArquivo } from "@/lib/superadmin";
import { cn } from "cn";

/* Sino de notificações real (não decorativo): mistura lojas que se cadastraram recentemente com
   lojas que mandaram mensagem de suporte (mesmos dados de /superadmin/suporte), igual ao print de
   referência (avatar/logo da loja, título, descrição, "há Xmin"). Clicar numa notificação leva pra
   tela de Suporte já com aquela loja aberta (?loja=<id>, lido em sa-suporte.tsx). */

type SaNotificacao = {
  tipo: "cadastro" | "suporte";
  loja_id: number;
  loja_nome: string;
  logo: string | null;
  titulo: string;
  subtitulo: string;
  quando: string;
  lida: boolean;
};

const CHAVE_VISTAS_EM = "sa-notificacoes-vistas-em";
const PHP_ADMIN_URL = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function tempoRelativo(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const minutos = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos}min atrás`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias}d atrás`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function SaNotificacoesMenu({ naoLidasSuporteInicial }: { naoLidasSuporteInicial: number }) {
  const router = useRouter();
  const [itens, setItens] = useState<SaNotificacao[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [vistasEm, setVistasEm] = useState<string | null>(null);

  useEffect(() => {
    try {
      setVistasEm(localStorage.getItem(CHAVE_VISTAS_EM));
    } catch {
      // sem localStorage: trata tudo como novo nesta sessão
    }
  }, []);

  async function carregar() {
    if (itens !== null || carregando) return;
    setCarregando(true);
    const data = await saCall<{ ok: boolean; notificacoes?: SaNotificacao[] }>("superadmin_notificacoes");
    setItens(data.ok && data.notificacoes ? data.notificacoes : []);
    setCarregando(false);
  }

  function naoVista(n: SaNotificacao) {
    return n.tipo === "suporte" ? !n.lida : !vistasEm || n.quando > vistasEm;
  }

  const naoLidas = itens === null ? naoLidasSuporteInicial : itens.filter(naoVista).length;

  function aoAbrir(aberto: boolean) {
    if (!aberto) return;
    void carregar();
    const agora = new Date().toISOString();
    try {
      localStorage.setItem(CHAVE_VISTAS_EM, agora);
    } catch {
      // sem localStorage: a preferência só dura a sessão
    }
    setVistasEm(agora);
  }

  return (
    <DropdownMenu onOpenChange={aoAbrir}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={naoLidas > 0 ? `Notificações — ${naoLidas} não lidas` : "Notificações"}
          >
            <Bell size={18} />
            {naoLidas > 0 && <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-rose-500 ring-2 ring-background" />}
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {naoLidas > 0 && (
            <span className="text-xs text-muted-foreground">
              {naoLidas} não lida{naoLidas > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <DropdownMenuSeparator className="mx-0 my-0" />

        <div className="max-h-96 overflow-y-auto">
          {carregando && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Carregando…</div>}
          {!carregando && itens?.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por enquanto.</div>}
          {itens?.map((n, i) => (
            <button
              key={`${n.tipo}-${n.loja_id}-${i}`}
              type="button"
              onClick={() => router.push(`/superadmin/suporte?loja=${n.loja_id}`)}
              className={cn("flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60", naoVista(n) && "bg-muted/40")}
            >
              {n.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlArquivo(n.logo, PHP_ADMIN_URL)} alt="" className="size-9 shrink-0 rounded-full border bg-white object-cover" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{iniciais(n.loja_nome)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{n.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{n.subtitulo}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">{tempoRelativo(n.quando)}</p>
              </div>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />
        <Link href="/superadmin/suporte" className="block px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted">
          Ver todo o suporte
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
