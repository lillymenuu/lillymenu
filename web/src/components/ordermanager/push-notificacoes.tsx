"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

/*
 * Ativa o Web Push deste aparelho: notificacao no celular quando chega pedido (ver src/lib/webPush.ts
 * e public/sw.js). No iPhone so existe com o site adicionado a Tela de Inicio (iOS 16.4+), entao
 * fora do app instalado o dialog mostra o passo a passo de instalacao.
 */

type Estado = "carregando" | "instalar-ios" | "sem-suporte" | "negado" | "inativo" | "ativo";

function ehIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function ehAppInstalado() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function temSuporte() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function base64ParaUint8(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const saida = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) saida[i] = raw.charCodeAt(i);
  return saida;
}

async function salvarNoServidor(inscricao: PushSubscription) {
  const res = await fetch("/api/push/inscricao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inscricao.toJSON()),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.msg ?? "Não foi possível salvar a inscrição.");
}

export function PushNotificacoes() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState<string | null>(null);
  const [inscricao, setInscricao] = useState<PushSubscription | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const verificar = useCallback(async () => {
    if (!temSuporte()) {
      setEstado(ehIos() && !ehAppInstalado() ? "instalar-ios" : "sem-suporte");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const atual = await reg.pushManager.getSubscription();
      setInscricao(atual);
      if (atual && Notification.permission === "granted") {
        setEstado("ativo");
        /* Reenvia: mantem a inscricao ligada ao usuario/loja logados agora neste aparelho. */
        salvarNoServidor(atual).catch(() => {});
      } else {
        setEstado(Notification.permission === "denied" ? "negado" : "inativo");
      }
    } catch {
      setEstado("sem-suporte");
    }

    /* Busca a chave antes do clique: no iPhone o pedido de permissao precisa sair direto do toque,
       sem esperar rede no meio. */
    fetch("/api/push/inscricao", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setChave(d.ok ? d.chave : null))
      .catch(() => setChave(null));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura unica do estado do navegador
    void verificar();
  }, [verificar]);

  async function ativar() {
    if (!chave) {
      toast.error("Notificações ainda não configuradas no servidor.");
      return;
    }
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "negado" : "inativo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const nova = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaUint8(chave) });
      await salvarNoServidor(nova);
      setInscricao(nova);
      setEstado("ativo");
      toast.success("Notificações ativadas neste aparelho.");
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível ativar as notificações.");
    } finally {
      setOcupado(false);
    }
  }

  async function desativar() {
    if (!inscricao) return;
    setOcupado(true);
    try {
      await fetch("/api/push/inscricao", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: inscricao.endpoint }),
      });
      await inscricao.unsubscribe();
      setInscricao(null);
      setEstado("inativo");
      toast.success("Notificações desativadas neste aparelho.");
    } catch {
      toast.error("Não foi possível desativar.");
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    if (!inscricao) return;
    setOcupado(true);
    try {
      const res = await fetch("/api/push/teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: inscricao.endpoint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) toast.error(data.msg ?? "Não foi possível enviar o teste.");
      else toast.success("Teste enviado. A notificação deve chegar em alguns segundos.");
    } finally {
      setOcupado(false);
    }
  }

  if (estado === "carregando") return null;

  const ativo = estado === "ativo";

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAberto(true)} title="Notificações de pedido neste aparelho">
        <span className="relative inline-flex">
          {ativo ? <Bell size={14} /> : <BellOff size={14} />}
          {ativo && <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-emerald-500" />}
        </span>
        <span className="hidden sm:inline">Notificações</span>
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent overlayForceRender className="max-w-sm rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Notificações de pedido</DialogTitle>
            <DialogDescription>
              Receba um aviso neste aparelho sempre que chegar um pedido, mesmo com a tela bloqueada.
            </DialogDescription>
          </DialogHeader>

          {estado === "instalar-ios" && (
            <div className="space-y-3 text-sm">
              <p>No iPhone, as notificações só funcionam com o LillyMenu instalado na Tela de Início:</p>
              <ol className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">1</span>
                  <span>
                    Toque em <Share size={14} className="inline align-text-bottom" /> <strong>Compartilhar</strong> na barra do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">2</span>
                  <span>
                    Escolha <SquarePlus size={14} className="inline align-text-bottom" /> <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">3</span>
                  <span>
                    Abra o LillyMenu pelo ícone novo, entre com seu login e toque em <strong>Notificações</strong> de novo.
                  </span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground">Precisa do iOS 16.4 ou mais recente e do Safari.</p>
            </div>
          )}

          {estado === "sem-suporte" && (
            <p className="text-sm text-muted-foreground">
              Este navegador não aceita notificações. No Android, use o Chrome. No iPhone, atualize para o iOS 16.4 ou mais recente.
            </p>
          )}

          {estado === "negado" && (
            <p className="text-sm text-muted-foreground">
              As notificações foram bloqueadas neste aparelho. Libere em <strong>Ajustes &gt; Notificações &gt; LillyMenu</strong> (iPhone) ou
              nas permissões do site no navegador e abra esta tela de novo.
            </p>
          )}

          {(estado === "inativo" || estado === "ativo") && (
            <p className={cn("rounded-xl px-3 py-2 text-sm", ativo ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted")}>
              {ativo ? "Ativadas neste aparelho." : "Desativadas neste aparelho."}
            </p>
          )}

          <DialogFooter className="border-t-0 bg-transparent">
            {estado === "inativo" && (
              <Button className="rounded-full" onClick={ativar} disabled={ocupado}>
                <Bell size={14} /> Ativar notificações
              </Button>
            )}
            {ativo && (
              <>
                <Button variant="outline" className="rounded-full" onClick={desativar} disabled={ocupado}>
                  Desativar
                </Button>
                <Button className="rounded-full" onClick={testar} disabled={ocupado}>
                  Enviar teste
                </Button>
              </>
            )}
            {(estado === "instalar-ios" || estado === "sem-suporte" || estado === "negado") && (
              <Button variant="outline" className="rounded-full" onClick={() => setAberto(false)}>
                Entendi
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
