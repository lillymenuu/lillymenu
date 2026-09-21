"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

export type SuporteMensagem = {
  id: number | string;
  remetente: "loja" | "suporte";
  mensagem: string;
  anexo_arquivo: string | null;
  criado_em: string;
};

const POLL_MENSAGENS_MS = 4000;
const POLL_DIGITANDO_MS = 3000;
const AVISO_DIGITANDO_MS = 3000;

/* criado_em vem como "YYYY-MM-DD HH:mm:ss" — mesmo parse do chat legado. */
function parseData(iso: string) {
  return new Date(iso.replace(" ", "T"));
}

function formatarHora(iso: string) {
  const d = parseData(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function chaveDia(iso: string) {
  const d = parseData(iso);
  return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function rotuloDia(iso: string) {
  const d = parseData(iso);
  if (isNaN(d.getTime())) return "";
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return "Hoje";
  if (d.toDateString() === ontem.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function urlAnexo(anexo: string, phpAdminUrl: string) {
  return anexo.startsWith("http") ? anexo : `${phpAdminUrl}/${anexo}`;
}

function lerBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("leitura"));
    reader.readAsDataURL(file);
  });
}

export function SuporteChat({
  mensagensIniciais,
  phpAdminUrl,
  lojaNome,
  lojaLogo,
}: {
  mensagensIniciais: SuporteMensagem[];
  phpAdminUrl: string;
  lojaNome: string;
  lojaLogo: string | null;
}) {
  const [mensagens, setMensagens] = useState(mensagensIniciais);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [suporteDigitando, setSuporteDigitando] = useState(false);

  const fimRef = useRef<HTMLDivElement>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const ultimoIdRef = useRef(Math.max(0, ...mensagensIniciais.map((m) => Number(m.id))));
  const proximoAvisoRef = useRef(0);
  const primeiraRolagemRef = useRef(true);

  const anexarNovas = useCallback((novas: SuporteMensagem[]) => {
    if (novas.length === 0) return;
    setMensagens((atual) => {
      const ids = new Set(atual.map((m) => Number(m.id)));
      const unicas = novas.filter((m) => !ids.has(Number(m.id)));
      return unicas.length > 0 ? [...atual, ...unicas] : atual;
    });
    ultimoIdRef.current = Math.max(ultimoIdRef.current, ...novas.map((m) => Number(m.id)));
  }, []);

  /* Mensagens novas do suporte (e de outras abas). */
  useEffect(() => {
    let ativo = true;
    async function buscar() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/suporte/mensagens?after_id=${ultimoIdRef.current}`);
        const data = await res.json();
        if (ativo && data.ok) anexarNovas(data.mensagens);
      } catch {
        // proximo poll tenta de novo
      }
    }
    const t = setInterval(buscar, POLL_MENSAGENS_MS);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [anexarNovas]);

  /* "Suporte esta digitando...". */
  useEffect(() => {
    let ativo = true;
    async function buscar() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/suporte/digitando");
        const data = await res.json();
        if (ativo && data.ok) setSuporteDigitando(Boolean(data.digitando));
      } catch {
        // ignora
      }
    }
    const t = setInterval(buscar, POLL_DIGITANDO_MS);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  /* Preview da imagem escolhida. */
  const previewUrl = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* Rola pro fim ao abrir e a cada mensagem nova (ou quando o suporte comeca a digitar). */
  useEffect(() => {
    const comportamento = primeiraRolagemRef.current ? "instant" : "smooth";
    primeiraRolagemRef.current = false;
    fimRef.current?.scrollIntoView({ behavior: comportamento, block: "end" });
  }, [mensagens.length, suporteDigitando]);

  function avisarDigitando(ativo: boolean) {
    void fetch("/api/suporte/digitando", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo }),
    }).catch(() => {});
  }

  function aoDigitar(valor: string) {
    setTexto(valor);
    const agora = Date.now();
    if (valor.trim() && agora >= proximoAvisoRef.current) {
      proximoAvisoRef.current = agora + AVISO_DIGITANDO_MS;
      avisarDigitando(true);
    }
  }

  function escolherArquivo(file: File | undefined) {
    if (!file) return;
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 5MB).");
      return;
    }
    setArquivo(file);
  }

  function limparArquivo() {
    setArquivo(null);
    if (inputArquivoRef.current) inputArquivoRef.current.value = "";
  }

  async function enviar() {
    const msg = texto.trim();
    if ((!msg && !arquivo) || enviando) return;
    setEnviando(true);
    try {
      const corpo: Record<string, string> = { mensagem: msg };
      if (arquivo) {
        corpo.imagem_base64 = await lerBase64(arquivo);
        corpo.imagem_ext = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
      }
      const res = await fetch("/api/suporte/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível enviar a mensagem.");
        return;
      }
      anexarNovas([data.mensagem]);
      setTexto("");
      limparArquivo();
      proximoAvisoRef.current = 0;
      avisarDigitando(false);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[460px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="relative z-10 flex items-center gap-3 border-b bg-card px-4 py-3 shadow-sm">
        <AvatarSuporte className="size-11" />
        <div className="min-w-0 flex-1">
          <h1 className="text-base leading-tight font-semibold">Suporte Lilly Menu</h1>
          <p
            className={cn(
              "flex items-center gap-1.5 truncate text-sm",
              suporteDigitando ? "font-medium text-emerald-600" : "text-muted-foreground"
            )}
          >
            {suporteDigitando ? (
              <>
                digitando
                <PontinhosDigitando className="bg-emerald-600" />
              </>
            ) : (
              <>
                <span className="size-2 rounded-full bg-emerald-500" />
                Equipe online para ajudar
              </>
            )}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto bg-muted/40 px-3 py-5 sm:px-5">
        {mensagens.length === 0 && (
          <div className="m-auto flex max-w-xs flex-col items-center gap-3 text-center text-sm text-muted-foreground">
            <AvatarSuporte className="size-14" />
            <div>
              <p className="text-base font-semibold text-foreground">Olá! Como podemos ajudar?</p>
              <p className="mt-1">Envie sua dúvida ou problema e a nossa equipe responde por aqui.</p>
            </div>
          </div>
        )}

        {mensagens.map((m, i) => {
          const minha = m.remetente === "loja";
          const anterior = mensagens[i - 1];
          const proxima = mensagens[i + 1];
          const novoDia = !anterior || chaveDia(anterior.criado_em) !== chaveDia(m.criado_em);
          const ultimaDoBloco =
            !proxima || proxima.remetente !== m.remetente || chaveDia(proxima.criado_em) !== chaveDia(m.criado_em);
          const primeiraDoBloco = novoDia || anterior.remetente !== m.remetente;
          const url = m.anexo_arquivo ? urlAnexo(m.anexo_arquivo, phpAdminUrl) : null;
          return (
            <div key={m.id} className={cn("flex flex-col", primeiraDoBloco && i > 0 && "mt-2.5")}>
              {novoDia && (
                <div className="my-2 self-center rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                  {rotuloDia(m.criado_em)}
                </div>
              )}
              <div className={cn("flex items-end gap-2", minha ? "flex-row-reverse" : "flex-row")}>
                <div className="size-8 shrink-0">
                  {ultimaDoBloco &&
                    (minha ? (
                      <AvatarLoja nome={lojaNome} logo={lojaLogo} className="size-8" />
                    ) : (
                      <AvatarSuporte className="size-8" />
                    ))}
                </div>
                <div
                  className={cn(
                    "flex max-w-[min(80%,28rem)] flex-col gap-1.5 rounded-2xl px-3.5 py-2 shadow-sm",
                    minha ? "bg-primary text-primary-foreground" : "border bg-card text-foreground",
                    ultimaDoBloco && (minha ? "rounded-br-md" : "rounded-bl-md")
                  )}
                >
                  {url && (
                    <a href={url} target="_blank" rel="noreferrer" className="-mx-1.5 -mt-0.5 block overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Imagem enviada" className="max-h-64 w-full object-cover" />
                    </a>
                  )}
                  {m.mensagem && <p className="text-sm leading-snug break-words whitespace-pre-wrap">{m.mensagem}</p>}
                  <span
                    className={cn(
                      "self-end text-[11px] tabular-nums",
                      minha ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatarHora(m.criado_em)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {suporteDigitando && (
          <div className="mt-2.5 flex items-end gap-2">
            <AvatarSuporte className="size-8" />
            <div className="flex flex-col gap-1 rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 shadow-sm">
              <span className="text-xs font-medium text-emerald-600">Digitando...</span>
              <PontinhosDigitando className="bg-muted-foreground" tamanho="md" />
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
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-background px-3 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
            <button
              type="button"
              onClick={() => inputArquivoRef.current?.click()}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Anexar imagem"
              title="Anexar imagem"
            >
              <ImagePlus size={18} />
            </button>
            <input
              value={texto}
              onChange={(e) => aoDigitar(e.target.value)}
              onBlur={() => avisarDigitando(false)}
              maxLength={2000}
              placeholder="Digite sua mensagem..."
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
    </div>
  );
}

function AvatarSuporte({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon_store.png" alt="Suporte Lilly Menu" className="size-[70%] object-contain" />
    </div>
  );
}

function AvatarLoja({ nome, logo, className }: { nome: string; logo: string | null; className?: string }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={nome} className={cn("shrink-0 rounded-full border bg-white object-cover", className)} />
    );
  }
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary", className)}>
      {nome.trim().charAt(0).toUpperCase() || "L"}
    </div>
  );
}

/* Tres pontinhos pulando, como o "digitando..." do WhatsApp. */
function PontinhosDigitando({ className, tamanho = "sm" }: { className?: string; tamanho?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("animate-bounce rounded-full", tamanho === "md" ? "size-2" : "size-1.5", className)}
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  );
}
