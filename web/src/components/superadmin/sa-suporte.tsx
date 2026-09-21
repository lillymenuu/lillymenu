"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Headset, ImagePlus, MessageSquare, Search, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saCall, urlArquivo } from "@/lib/superadmin";
import { cn } from "cn";

export type SaConversa = {
  loja_id: number | string;
  nome: string;
  logo: string | null;
  ultima_mensagem: string | null;
  ultimo_anexo: string | null;
  ultima_em: string | null;
  nao_lidas: number | string;
};

type Mensagem = {
  id: number | string;
  remetente: "loja" | "suporte";
  mensagem: string;
  anexo_arquivo: string | null;
  criado_em: string;
};

const parseData = (iso: string) => new Date(iso.replace(" ", "T"));

function hora(iso: string) {
  const d = parseData(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function chaveDia(iso: string) {
  const d = parseData(iso);
  return isNaN(d.getTime()) ? "" : d.toDateString();
}

function rotuloDia(iso: string) {
  const d = parseData(iso);
  if (isNaN(d.getTime())) return "";
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === new Date().toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function horaLista(iso: string | null) {
  if (!iso) return "";
  const d = parseData(iso);
  if (isNaN(d.getTime())) return "";
  return d.toDateString() === new Date().toDateString()
    ? hora(iso)
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function lerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("leitura"));
    r.readAsDataURL(file);
  });
}

function AvatarLoja({ nome, logo, phpAdminUrl, className }: { nome: string; logo: string | null; phpAdminUrl: string; className?: string }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlArquivo(logo, phpAdminUrl)} alt={nome} className={cn("shrink-0 rounded-full border bg-white object-cover", className)} />
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary", className)}>
      {iniciais(nome)}
    </div>
  );
}

function Pontinhos({ className }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("size-1.5 animate-bounce rounded-full", className)} style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }} />
      ))}
    </span>
  );
}

export function SaSuporte({ conversasIniciais, phpAdminUrl }: { conversasIniciais: SaConversa[]; phpAdminUrl: string }) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [aba, setAba] = useState<"chat" | "todas">("chat");
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<SaConversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [lojaDigitando, setLojaDigitando] = useState(false);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const ultimoIdRef = useRef(0);
  const proximoAvisoRef = useRef(0);
  const lojaIdSel = selecionada ? Number(selecionada.loja_id) : 0;

  const previewUrl = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const recarregarConversas = useCallback(async () => {
    const r = await saCall<{ ok: boolean; conversas: SaConversa[] }>("superadmin_suporte", undefined, { acao: "conversas" });
    if (r.ok) setConversas(r.conversas);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void recarregarConversas();
    }, 6000);
    return () => clearInterval(t);
  }, [recarregarConversas]);

  const anexarNovas = useCallback((novas: Mensagem[]) => {
    if (novas.length === 0) return;
    setMensagens((atual) => {
      const ids = new Set(atual.map((m) => Number(m.id)));
      const unicas = novas.filter((m) => !ids.has(Number(m.id)));
      return unicas.length ? [...atual, ...unicas] : atual;
    });
    ultimoIdRef.current = Math.max(ultimoIdRef.current, ...novas.map((m) => Number(m.id)));
  }, []);

  /* Abre a conversa: carrega historico e passa a acompanhar mensagens novas / "digitando". */
  useEffect(() => {
    if (!lojaIdSel) return;
    let ativo = true;
    ultimoIdRef.current = 0;

    async function buscar(primeira: boolean) {
      if (!primeira && document.visibilityState !== "visible") return;
      const r = await saCall<{ ok: boolean; mensagens: Mensagem[] }>("superadmin_suporte", undefined, {
        acao: "mensagens",
        loja_id: String(lojaIdSel),
        after_id: String(ultimoIdRef.current),
      });
      if (!ativo) return;
      if (r.ok) {
        anexarNovas(r.mensagens);
        if (r.mensagens.length > 0) {
          void recarregarConversas();
        }
      }
      if (primeira) setCarregandoMsgs(false);
    }
    async function buscarDigitando() {
      if (document.visibilityState !== "visible") return;
      const r = await saCall<{ ok: boolean; digitando: boolean }>("superadmin_suporte", undefined, { acao: "digitando", loja_id: String(lojaIdSel) });
      if (ativo && r.ok) setLojaDigitando(Boolean(r.digitando));
    }

    void buscar(true);
    const t1 = setInterval(() => void buscar(false), 3000);
    const t2 = setInterval(() => void buscarDigitando(), 3000);
    return () => {
      ativo = false;
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [lojaIdSel, anexarNovas, recarregarConversas]);

  const primeiraRolagemRef = useRef(true);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: primeiraRolagemRef.current ? "instant" : "smooth", block: "end" });
    if (mensagens.length > 0) primeiraRolagemRef.current = false;
  }, [mensagens.length, lojaDigitando]);

  function abrir(c: SaConversa) {
    primeiraRolagemRef.current = true;
    setSelecionada(c);
    setMensagens([]);
    setLojaDigitando(false);
    setCarregandoMsgs(true);
    setTexto("");
    setArquivo(null);
    /* zera o contador localmente; o servidor marca como lida ao carregar as mensagens */
    setConversas((atual) => atual.map((x) => (x.loja_id === c.loja_id ? { ...x, nao_lidas: 0 } : x)));
  }

  function avisarDigitando(ativo: boolean) {
    if (!lojaIdSel) return;
    void saCall("superadmin_suporte", { acao: "digitando", loja_id: lojaIdSel, ativo });
  }

  function aoDigitar(v: string) {
    setTexto(v);
    const agora = Date.now();
    if (v.trim() && agora >= proximoAvisoRef.current) {
      proximoAvisoRef.current = agora + 3000;
      avisarDigitando(true);
    }
  }

  function escolherArquivo(file: File | undefined) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) return void toast.error("Envie uma imagem JPG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) return void toast.error("Imagem muito grande (máximo 5MB).");
    setArquivo(file);
  }

  function limparArquivo() {
    setArquivo(null);
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  async function enviar() {
    const msg = texto.trim();
    if ((!msg && !arquivo) || enviando || !lojaIdSel) return;
    setEnviando(true);
    try {
      const corpo: Record<string, unknown> = { acao: "enviar", loja_id: lojaIdSel, mensagem: msg };
      if (arquivo) {
        corpo.imagem_base64 = await lerBase64(arquivo);
        corpo.imagem_ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
      }
      const r = await saCall<{ ok: boolean; msg?: string; mensagem: Mensagem }>("superadmin_suporte", corpo);
      if (!r.ok) {
        toast.error(r.msg ?? "Não foi possível enviar.");
        return;
      }
      anexarNovas([r.mensagem]);
      setTexto("");
      limparArquivo();
      proximoAvisoRef.current = 0;
      avisarDigitando(false);
      void recarregarConversas();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return conversas.filter((c) => {
      if (aba === "chat" && !c.ultima_em) return false;
      return !termo || c.nome.toLowerCase().includes(termo);
    });
  }, [conversas, aba, busca]);

  const totalNaoLidas = conversas.reduce((s, c) => s + Number(c.nao_lidas || 0), 0);

  return (
    <div className="mx-auto grid h-[calc(100dvh-10rem)] min-h-[480px] max-w-7xl overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[340px_1fr]">
      {/* Lista de conversas */}
      <div className={cn("flex min-h-0 flex-col border-r", selecionada && "hidden lg:flex")}>
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Atendimento</h2>
            {totalNaoLidas > 0 && (
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">{totalNaoLidas} não lidas</span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
            <Search size={15} className="text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar loja..." className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
            {(["chat", "todas"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAba(a)}
                className={cn("rounded-md py-1.5 transition-colors", aba === a ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {a === "chat" ? "Conversas" : "Todas as lojas"}
              </button>
            ))}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {lista.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              {aba === "chat" ? "Nenhuma conversa ainda." : "Nenhuma loja encontrada."}
            </li>
          )}
          {lista.map((c) => {
            const naoLidas = Number(c.nao_lidas || 0);
            const previa = c.ultima_mensagem || (c.ultimo_anexo ? "📷 Imagem" : "Sem mensagens");
            return (
              <li key={c.loja_id}>
                <button
                  type="button"
                  onClick={() => abrir(c)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    selecionada?.loja_id === c.loja_id && "bg-muted"
                  )}
                >
                  <AvatarLoja nome={c.nome} logo={c.logo} phpAdminUrl={phpAdminUrl} className="size-11" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", naoLidas > 0 ? "font-semibold" : "font-medium")}>{c.nome}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{horaLista(c.ultima_em)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className={cn("truncate text-xs", naoLidas > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>{previa}</p>
                      {naoLidas > 0 && (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-white">
                          {naoLidas > 99 ? "99+" : naoLidas}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Conversa */}
      <div className={cn("flex min-h-0 flex-col", !selecionada && "hidden lg:flex")}>
        {!selecionada ? (
          <div className="m-auto flex max-w-xs flex-col items-center gap-3 p-6 text-center text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare size={28} />
            </div>
            <p className="text-sm">Selecione uma loja na lista para iniciar o atendimento.</p>
          </div>
        ) : (
          <>
            <header className="relative z-10 flex items-center gap-3 border-b bg-card px-4 py-3 shadow-sm">
              <button type="button" onClick={() => setSelecionada(null)} className="rounded-md p-1.5 hover:bg-muted lg:hidden" aria-label="Voltar">
                <ArrowLeft size={18} />
              </button>
              <AvatarLoja nome={selecionada.nome} logo={selecionada.logo} phpAdminUrl={phpAdminUrl} className="size-11" />
              <div className="min-w-0 flex-1 leading-tight">
                <h3 className="truncate text-base font-semibold">{selecionada.nome}</h3>
                <p className={cn("flex items-center gap-1.5 text-sm", lojaDigitando ? "font-medium text-emerald-600" : "text-muted-foreground")}>
                  {lojaDigitando ? (
                    <>
                      digitando <Pontinhos className="bg-emerald-600" />
                    </>
                  ) : (
                    `Loja #${selecionada.loja_id}`
                  )}
                </p>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto bg-muted/40 px-3 py-5 sm:px-5">
              {carregandoMsgs && <p className="m-auto text-sm text-muted-foreground">Carregando...</p>}
              {!carregandoMsgs && mensagens.length === 0 && (
                <div className="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                  <Headset size={26} />
                  Nenhuma mensagem ainda. Envie a primeira!
                </div>
              )}
              {mensagens.map((m, i) => {
                const meu = m.remetente === "suporte";
                const anterior = mensagens[i - 1];
                const proxima = mensagens[i + 1];
                const novoDia = !anterior || chaveDia(anterior.criado_em) !== chaveDia(m.criado_em);
                const ultimaDoBloco = !proxima || proxima.remetente !== m.remetente || chaveDia(proxima.criado_em) !== chaveDia(m.criado_em);
                const url = m.anexo_arquivo ? urlArquivo(m.anexo_arquivo, phpAdminUrl) : null;
                return (
                  <div key={m.id} className={cn("flex flex-col", (novoDia || anterior?.remetente !== m.remetente) && i > 0 && "mt-2.5")}>
                    {novoDia && (
                      <div className="my-2 self-center rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">{rotuloDia(m.criado_em)}</div>
                    )}
                    <div className={cn("flex items-end gap-2", meu ? "flex-row-reverse" : "flex-row")}>
                      <div className="size-8 shrink-0">
                        {ultimaDoBloco &&
                          (meu ? (
                            <div className="flex size-8 items-center justify-center overflow-hidden rounded-full border bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/favicon_store.png" alt="Suporte" className="size-[70%] object-contain" />
                            </div>
                          ) : (
                            <AvatarLoja nome={selecionada.nome} logo={selecionada.logo} phpAdminUrl={phpAdminUrl} className="size-8" />
                          ))}
                      </div>
                      <div
                        className={cn(
                          "flex max-w-[min(80%,28rem)] flex-col gap-1.5 rounded-2xl px-3.5 py-2 shadow-sm",
                          meu ? "bg-primary text-primary-foreground" : "border bg-card text-foreground",
                          ultimaDoBloco && (meu ? "rounded-br-md" : "rounded-bl-md")
                        )}
                      >
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="-mx-1.5 -mt-0.5 block overflow-hidden rounded-xl">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Imagem enviada" className="max-h-64 w-full object-cover" />
                          </a>
                        )}
                        {m.mensagem && <p className="text-sm leading-snug break-words whitespace-pre-wrap">{m.mensagem}</p>}
                        <span className={cn("self-end text-[11px] tabular-nums", meu ? "text-primary-foreground/70" : "text-muted-foreground")}>{hora(m.criado_em)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {lojaDigitando && (
                <div className="mt-2.5 flex items-end gap-2">
                  <AvatarLoja nome={selecionada.nome} logo={selecionada.logo} phpAdminUrl={phpAdminUrl} className="size-8" />
                  <div className="flex flex-col gap-1 rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 shadow-sm">
                    <span className="text-xs font-medium text-emerald-600">Digitando...</span>
                    <Pontinhos className="bg-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={fimRef} />
            </div>

            <div className="border-t bg-card px-3 py-3 sm:px-4">
              {previewUrl && (
                <div className="mb-3 flex items-start gap-3">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Pré-visualização" className="size-24 rounded-xl border object-cover" />
                    <button
                      type="button"
                      onClick={limparArquivo}
                      className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-destructive text-white shadow-md transition-transform hover:scale-105"
                      aria-label="Excluir imagem"
                      title="Excluir imagem"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="min-w-0 flex-1 truncate pt-1 text-sm text-muted-foreground">{arquivo?.name}</p>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void enviar();
                }}
                className="flex items-center gap-2"
              >
                <input ref={inputArquivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0])} />
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-background px-3 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
                  <button type="button" onClick={() => inputArquivoRef.current?.click()} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Anexar imagem" title="Anexar imagem">
                    <ImagePlus size={18} />
                  </button>
                  <input
                    value={texto}
                    onChange={(e) => aoDigitar(e.target.value)}
                    onBlur={() => avisarDigitando(false)}
                    maxLength={2000}
                    placeholder="Digite sua resposta..."
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviando || (!texto.trim() && !arquivo)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90 disabled:opacity-40"
                  aria-label="Enviar"
                >
                  <Send size={17} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
