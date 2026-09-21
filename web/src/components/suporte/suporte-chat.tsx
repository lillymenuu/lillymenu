"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headset, ImagePlus, Send, X } from "lucide-react";
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
}: {
  mensagensIniciais: SuporteMensagem[];
  phpAdminUrl: string;
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
    <div className="flex h-[calc(100dvh-9rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl border bg-card">
      <header className="relative z-10 flex items-center gap-3 border-b bg-card px-4 py-3 shadow-md">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Headset size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="text-base leading-tight font-semibold">Suporte Lilly Menu</h1>
          <p className="truncate text-sm text-muted-foreground">
            {suporteDigitando ? "Digitando…" : "Fale com a nossa equipe"}
          </p>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5">
        {mensagens.length === 0 && (
          <div className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Olá! Como podemos ajudar?</p>
            <p className="mt-1">Envie sua dúvida ou problema e a nossa equipe responde por aqui.</p>
          </div>
        )}

        {mensagens.map((m, i) => {
          const minha = m.remetente === "loja";
          const novoDia = i === 0 || chaveDia(mensagens[i - 1].criado_em) !== chaveDia(m.criado_em);
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {novoDia && (
                <div className="self-center text-xs text-foreground">{rotuloDia(m.criado_em)}</div>
              )}
              <div className={cn("flex", minha ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "flex max-w-[min(85%,28rem)] flex-col gap-1.5 rounded-2xl px-4 py-2.5 shadow-md",
                    minha ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-900"
                  )}
                >
                  {m.anexo_arquivo && (
                    <a href={urlAnexo(m.anexo_arquivo, phpAdminUrl)} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlAnexo(m.anexo_arquivo, phpAdminUrl)}
                        alt="Imagem enviada"
                        className="max-h-64 rounded-lg object-cover"
                      />
                    </a>
                  )}
                  {m.mensagem && <p className="text-sm leading-snug break-words whitespace-pre-wrap">{m.mensagem}</p>}
                  <span
                    className={cn("self-end text-[11px] italic", minha ? "text-slate-300" : "text-slate-500")}
                  >
                    {formatarHora(m.criado_em)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={fimRef} />
      </div>

      <div className="px-4 pb-4">
        {previewUrl && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Pré-visualização" className="size-12 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm">{arquivo?.name}</span>
            <button
              type="button"
              onClick={limparArquivo}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Remover imagem"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
          className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2"
        >
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => escolherArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputArquivoRef.current?.click()}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={enviando || (!texto.trim() && !arquivo)}
            className="rounded-md p-1.5 text-foreground hover:bg-muted disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
