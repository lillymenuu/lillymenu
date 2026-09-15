"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckSquare,
  MessageCircleDashed,
  MessagesSquare,
  Pencil,
  QrCode,
  Receipt,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { WlNovaConversaDialog } from "@/components/whatslilly/wl-nova-conversa-dialog";
import { WlPedidosDrawer } from "@/components/whatslilly/wl-pedidos-drawer";
import { WlMensagemBubble } from "@/components/whatslilly/wl-mensagem-bubble";
import { wlAvatarColor, wlInitials, wlTimeAgo } from "@/lib/whatslilly";
import type { WlConversa, WlConversasResposta, WlMensagem, WlMensagensResposta, WlPedidoResumo, WlPollResposta } from "@/lib/whatslilly";
import { cn } from "cn";

type ConversaAtivaInfo = { id: number; nome: string; numero: string };

export function WhatslillyManager({ dadosIniciais }: { dadosIniciais: WlConversasResposta }) {
  const [conversas, setConversas] = useState<WlConversa[]>(dadosIniciais.conversas);
  const [busca, setBusca] = useState("");
  const buscaRef = useRef("");

  const [conversaAtiva, setConversaAtiva] = useState<ConversaAtivaInfo | null>(null);
  const [mensagens, setMensagens] = useState<WlMensagem[]>([]);
  const [pedidos, setPedidos] = useState<WlPedidoResumo[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  const [textoInput, setTextoInput] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [novaConversaOpen, setNovaConversaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modoSelContatos, setModoSelContatos] = useState(false);
  const [contatosSelecionados, setContatosSelecionados] = useState<Set<number>>(new Set());
  const [confirmExcluirContatos, setConfirmExcluirContatos] = useState(false);
  const [excluindoContatos, setExcluindoContatos] = useState(false);

  const [modoSelMsgs, setModoSelMsgs] = useState(false);
  const [mensagensSelecionadas, setMensagensSelecionadas] = useState<Set<number>>(new Set());
  const [confirmExcluirMsgs, setConfirmExcluirMsgs] = useState(false);
  const [excluindoMsgs, setExcluindoMsgs] = useState(false);

  const [pixInfo, setPixInfo] = useState<{ chave: string; nome: string } | null>(null);

  const lastMsgIdRef = useRef(0);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversaAtivaIdRef = useRef<number | null>(null);
  conversaAtivaIdRef.current = conversaAtiva?.id ?? null;

  useEffect(() => {
    fetch("/api/settings/detalhe")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.pagamento?.pix) {
          setPixInfo({ chave: data.pagamento.pix.chave ?? "", nome: data.pagamento.pix.nome ?? "" });
        }
      })
      .catch(() => {});
  }, []);

  async function carregarConversas(buscaTexto?: string) {
    const termo = buscaTexto ?? buscaRef.current;
    try {
      const res = await fetch(`/api/whatslilly/conversas?busca=${encodeURIComponent(termo)}`);
      const data: WlConversasResposta | { ok: false } = await res.json();
      if (data.ok) setConversas(data.conversas);
    } catch {
      // silencioso — proximo poll tenta de novo
    }
  }

  function onBuscaChange(v: string) {
    setBusca(v);
    buscaRef.current = v;
    carregarConversas(v);
  }

  // Poll da lista de conversas quando nenhuma esta aberta (10s, igual ao legado)
  useEffect(() => {
    if (conversaAtiva) return;
    const t = setInterval(() => carregarConversas(), 10000);
    return () => clearInterval(t);
  }, [conversaAtiva]);

  // Poll de mensagens novas da conversa aberta (4s, igual ao legado)
  useEffect(() => {
    if (!conversaAtiva) return;
    const t = setInterval(async () => {
      const id = conversaAtivaIdRef.current;
      if (!id) return;
      try {
        const res = await fetch(`/api/whatslilly/poll?conversa_id=${id}&after_id=${lastMsgIdRef.current}`);
        const data: WlPollResposta | { ok: false } = await res.json();
        if (!data.ok) return;
        if (data.mensagens.length) {
          setMensagens((prev) => [...prev, ...data.mensagens]);
          lastMsgIdRef.current = data.mensagens[data.mensagens.length - 1].id;
          carregarConversas();
        }
      } catch {
        // silencioso — proximo poll tenta de novo
      }
    }, 4000);
    return () => clearInterval(t);
  }, [conversaAtiva]);

  useEffect(() => {
    messagesAreaRef.current?.scrollTo({ top: messagesAreaRef.current.scrollHeight });
  }, [mensagens.length]);

  async function abrirConversa(id: number, nomeFallback: string, numeroFallback: string) {
    if (modoSelMsgs) cancelarModoSelMsgs();
    setConversaAtiva({ id, nome: nomeFallback, numero: numeroFallback });
    lastMsgIdRef.current = 0;
    setPedidos([]);
    setDrawerOpen(false);
    setMensagens([]);
    setCarregandoMensagens(true);
    try {
      const res = await fetch(`/api/whatslilly/mensagens?conversa_id=${id}`);
      const data: WlMensagensResposta | { ok: false; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar a conversa.");
        return;
      }
      setConversaAtiva(data.conversa);
      setMensagens(data.mensagens);
      setPedidos(data.pedidos);
      if (data.mensagens.length) lastMsgIdRef.current = data.mensagens[data.mensagens.length - 1].id;
      setConversas((prev) => prev.map((c) => (c.id === id ? { ...c, nao_lidas: 0 } : c)));
    } catch {
      toast.error("Erro ao carregar a conversa.");
    } finally {
      setCarregandoMensagens(false);
    }
    carregarConversas();
  }

  function fecharConversa() {
    setConversaAtiva(null);
    setMensagens([]);
    setPedidos([]);
    setDrawerOpen(false);
    if (modoSelMsgs) cancelarModoSelMsgs();
  }

  async function enviarMensagem() {
    if (!conversaAtiva) return;
    const texto = textoInput.trim();
    if (!texto) return;

    setEnviando(true);
    setTextoInput("");
    if (textareaRef.current) textareaRef.current.style.height = "";

    try {
      const res = await fetch("/api/whatslilly/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversa_id: conversaAtiva.id, mensagem: texto }),
      });
      const data = await res.json();
      if (data.ok) {
        const fake: WlMensagem = {
          id: data.id,
          direcao: "saida",
          tipo: "texto",
          mensagem: texto,
          pedido_id: null,
          hora: data.hora ?? "",
          data_fmt: data.data_fmt ?? "",
          falhou: !data.enviado,
        };
        setMensagens((prev) => [...prev, fake]);
        if (data.id) lastMsgIdRef.current = data.id;
        carregarConversas();
        if (!data.enviado && data.erro) toast.error(data.erro);
      } else {
        toast.error(data.msg ?? "Erro ao enviar mensagem.");
      }
    } catch {
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  function inserirPix() {
    if (!conversaAtiva) return;
    if (!pixInfo?.chave) {
      toast.error("Nenhuma chave Pix cadastrada. Configure em Configurações > Formas de pagamento.");
      return;
    }
    const linhas = ["*Chave Pix:*", pixInfo.chave];
    if (pixInfo.nome) linhas.push("", "*Nome:*", pixInfo.nome);
    const texto = linhas.join("\n");
    setTextoInput((prev) => (prev ? `${prev}\n${texto}` : texto));
    textareaRef.current?.focus();
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // ─── Selecao de contatos ─────────────────────────────────────────────────
  function ativarModoSelContatos() {
    setModoSelContatos(true);
    setContatosSelecionados(new Set());
  }
  function cancelarModoSelContatos() {
    setModoSelContatos(false);
    setContatosSelecionados(new Set());
  }
  function toggleSelecaoContato(id: number) {
    setContatosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function confirmarExclusaoContatos() {
    const ids = [...contatosSelecionados];
    if (!ids.length) return;
    setExcluindoContatos(true);
    try {
      const res = await fetch("/api/whatslilly/excluir-conversas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao apagar conversas.");
        return;
      }
      if (conversaAtiva && ids.includes(conversaAtiva.id)) fecharConversa();
      cancelarModoSelContatos();
      setConfirmExcluirContatos(false);
      await carregarConversas();
      toast.success("Conversas apagadas.");
    } catch {
      toast.error("Erro ao apagar conversas.");
    } finally {
      setExcluindoContatos(false);
    }
  }

  // ─── Selecao de mensagens ────────────────────────────────────────────────
  function ativarModoSelMsgs() {
    setModoSelMsgs(true);
    setMensagensSelecionadas(new Set());
  }
  function cancelarModoSelMsgs() {
    setModoSelMsgs(false);
    setMensagensSelecionadas(new Set());
  }
  function toggleSelecaoMsg(id: number) {
    setMensagensSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function confirmarExclusaoMsgs() {
    const ids = [...mensagensSelecionadas];
    if (!ids.length) return;
    setExcluindoMsgs(true);
    try {
      const res = await fetch("/api/whatslilly/excluir-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao apagar mensagens.");
        return;
      }
      setMensagens((prev) => prev.filter((m) => !ids.includes(m.id)));
      cancelarModoSelMsgs();
      setConfirmExcluirMsgs(false);
      toast.success("Mensagens apagadas.");
    } catch {
      toast.error("Erro ao apagar mensagens.");
    } finally {
      setExcluindoMsgs(false);
    }
  }

  const termo = busca.trim().toLowerCase();
  const conversasFiltradas = useMemo(() => {
    if (!termo) return conversas;
    return conversas.filter((c) => c.nome.toLowerCase().includes(termo) || c.numero.includes(termo));
  }, [conversas, termo]);

  return (
    <div className="flex h-[calc(100dvh-56px)] overflow-hidden md:h-dvh">
      {/* ─── Painel de conversas ─────────────────────────────────────── */}
      <div className={cn("flex w-full flex-col border-r md:w-[340px] md:shrink-0", conversaAtiva && "hidden md:flex")}>
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
          {modoSelContatos ? (
            <>
              <button type="button" onClick={cancelarModoSelContatos} className="rounded-md p-1.5 hover:bg-muted">
                <X className="size-4" />
              </button>
              <span className="flex-1 text-sm font-medium">
                {contatosSelecionados.size === 0 ? "Selecionar" : `${contatosSelecionados.size} selecionada${contatosSelecionados.size !== 1 ? "s" : ""}`}
              </span>
              <button
                type="button"
                disabled={contatosSelecionados.size === 0}
                onClick={() => setConfirmExcluirContatos(true)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" /> Excluir
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <MessagesSquare className="size-4 text-emerald-600" /> WhatsLilly
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={ativarModoSelContatos} title="Selecionar conversas" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <CheckSquare className="size-4" />
                </button>
                <button type="button" onClick={() => setNovaConversaOpen(true)} title="Nova conversa" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <Pencil className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => onBuscaChange(e.target.value)} placeholder="Pesquisar ou começar uma conversa" className="h-9 pl-9" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversasFiltradas.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <MessageCircleDashed className="size-8" />
              <p>Nenhuma conversa ainda.{"\n"}Clique no lápis para iniciar.</p>
            </div>
          ) : (
            conversasFiltradas.map((c) => {
              const selecionado = contatosSelecionados.has(c.id);
              const ativo = conversaAtiva?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (modoSelContatos ? toggleSelecaoContato(c.id) : abrirConversa(c.id, c.nome, c.numero))}
                  className={cn(
                    "flex w-full items-center gap-2.5 border-b px-4 py-2.5 text-left transition-colors hover:bg-muted/60",
                    ativo && "bg-muted",
                    selecionado && "bg-primary/10"
                  )}
                >
                  <div className="relative shrink-0">
                    <div
                      className="flex size-11 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ background: wlAvatarColor(c.numero) }}
                    >
                      {wlInitials(c.nome)}
                    </div>
                    {modoSelContatos && (
                      <div
                        className={cn(
                          "absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-background",
                          selecionado ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.ultimo_msg || ""}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] text-muted-foreground">{wlTimeAgo(c.ultimo_msg_em)}</span>
                    {c.nao_lidas > 0 && (
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                        {c.nao_lidas > 99 ? "99+" : c.nao_lidas}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Painel de chat ──────────────────────────────────────────── */}
      <div className={cn("relative flex flex-1 flex-col", !conversaAtiva && "hidden md:flex")}>
        {!conversaAtiva ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <MessagesSquare className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground">WhatsLilly</h3>
            <p className="text-sm">Selecione uma conversa para começar a responder.</p>
          </div>
        ) : (
          <>
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-3">
              <button type="button" onClick={fecharConversa} className="rounded-md p-1.5 hover:bg-muted md:hidden">
                <ArrowLeft className="size-4" />
              </button>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: wlAvatarColor(conversaAtiva.numero) }}
              >
                {wlInitials(conversaAtiva.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{conversaAtiva.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{conversaAtiva.numero}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => (modoSelMsgs ? cancelarModoSelMsgs() : ativarModoSelMsgs())}
                  title="Selecionar mensagens"
                  className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-muted", modoSelMsgs && "bg-muted text-foreground")}
                >
                  <CheckSquare className="size-4" />
                </button>
                <button type="button" onClick={() => setDrawerOpen((v) => !v)} title="Ver pedidos do cliente" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                  <Receipt className="size-4" />
                </button>
              </div>
            </div>

            <div ref={messagesAreaRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-muted/20 p-4">
              {carregandoMensagens ? (
                <div className="pt-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : mensagens.length === 0 ? (
                <div className="pt-8 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira mensagem!</div>
              ) : (
                mensagens.map((m) => (
                  <WlMensagemBubble
                    key={m.id}
                    mensagem={m}
                    selecionavel={modoSelMsgs}
                    selecionada={mensagensSelecionadas.has(m.id)}
                    onToggleSelecao={() => toggleSelecaoMsg(m.id)}
                  />
                ))
              )}
            </div>

            {modoSelMsgs ? (
              <div className="flex h-14 shrink-0 items-center gap-2 border-t px-3">
                <button type="button" onClick={cancelarModoSelMsgs} className="flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted">
                  <X className="size-4" /> Cancelar
                </button>
                <span className="flex-1 text-sm text-muted-foreground">
                  {mensagensSelecionadas.size === 0 ? "Selecionar mensagens" : `${mensagensSelecionadas.size} selecionada(s)`}
                </span>
                <button
                  type="button"
                  disabled={mensagensSelecionadas.size === 0}
                  onClick={() => setConfirmExcluirMsgs(true)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" /> Excluir
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-end gap-2 border-t p-3">
                <button type="button" onClick={inserirPix} title="Inserir chave Pix" className="mb-1 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted">
                  <QrCode className="size-4" />
                </button>
                <textarea
                  ref={textareaRef}
                  value={textoInput}
                  onChange={(e) => {
                    setTextoInput(e.target.value);
                    autoResize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensagem();
                    }
                  }}
                  placeholder="Digite uma mensagem"
                  rows={1}
                  className="max-h-[120px] min-h-9 flex-1 resize-none rounded-2xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <button
                  type="button"
                  onClick={enviarMensagem}
                  disabled={enviando || !textoInput.trim()}
                  className="mb-1 shrink-0 rounded-full bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  <Send className="size-4" />
                </button>
              </div>
            )}

            <WlPedidosDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} pedidos={pedidos} />
          </>
        )}
      </div>

      <WlNovaConversaDialog
        open={novaConversaOpen}
        onOpenChange={setNovaConversaOpen}
        onCriada={(id, nome, numero) => {
          carregarConversas();
          abrirConversa(id, nome, numero);
        }}
      />

      <ConfirmDialog
        open={confirmExcluirContatos}
        onOpenChange={setConfirmExcluirContatos}
        titulo={`Excluir conversa${contatosSelecionados.size !== 1 ? "s" : ""}`}
        descricao="Tem certeza que deseja excluir a(s) conversa(s) selecionada(s) e todas as suas mensagens? Essa ação não pode ser desfeita."
        confirmando={excluindoContatos}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusaoContatos}
      />

      <ConfirmDialog
        open={confirmExcluirMsgs}
        onOpenChange={setConfirmExcluirMsgs}
        titulo={`Excluir mensagen${mensagensSelecionadas.size !== 1 ? "s" : ""}`}
        descricao="Tem certeza que deseja excluir a(s) mensagem(ns) selecionada(s)? Essa ação não pode ser desfeita."
        confirmando={excluindoMsgs}
        textoConfirmar="Excluir"
        onConfirmar={confirmarExclusaoMsgs}
      />
    </div>
  );
}
