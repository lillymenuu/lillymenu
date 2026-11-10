"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Lock, MonitorPlay, WifiOff } from "lucide-react";
import { HEADER_TOKEN_TV, formatarCodigoPareamento, type CatalogoTv } from "@/lib/midiaIndoor";
import { VitrineTv } from "./vitrine-tv";

/*
 * Player da Midia Indoor (/tv). Sem token: mostra o QR de pareamento. Com token: exibe o catalogo
 * da loja e consulta de novo a cada 60 s (precos, esgotados e loja aberta/fechada se atualizam sozinhos).
 * Se a TV for desconectada no Admin, a API responde 401 e a tela volta para o QR.
 */

const CHAVE_TOKEN = "lm_tv_token";
/* Catalogo completo (precos, esgotados, aberto/fechado). */
const ATUALIZAR_MS = 60_000;
/* Estado leve: parar/retomar e configuracoes salvas no Admin chegam em ate 5 s. */
const ESTADO_MS = 5_000;
const STATUS_PAREAMENTO_MS = 2_000;

function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}
function gravarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* navegador sem armazenamento: a TV pede o QR de novo ao recarregar */
  }
}

/* ---------- Tela cheia e tela sempre ligada ---------- */

type WakeLockSentinela = { release: () => Promise<void> };

function useTelaSempreLigada() {
  useEffect(() => {
    let sentinela: WakeLockSentinela | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinela> } };
    async function pedir() {
      try {
        if (nav.wakeLock && document.visibilityState === "visible") sentinela = await nav.wakeLock.request("screen");
      } catch {
        /* sem suporte: depende da configuracao de energia da TV */
      }
    }
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      document.removeEventListener("visibilitychange", pedir);
      sentinela?.release().catch(() => {});
    };
  }, []);
}

function useTelaCheia() {
  const [cheia, setCheia] = useState(false);
  useEffect(() => {
    const atualizar = () => setCheia(document.fullscreenElement !== null);
    /* Navegador so libera tela cheia apos um gesto: qualquer tecla do controle ou clique. */
    const entrar = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    };
    document.addEventListener("fullscreenchange", atualizar);
    window.addEventListener("keydown", entrar);
    window.addEventListener("click", entrar);
    return () => {
      document.removeEventListener("fullscreenchange", atualizar);
      window.removeEventListener("keydown", entrar);
      window.removeEventListener("click", entrar);
    };
  }, []);
  return cheia;
}

/* ---------- Pareamento ---------- */

type Pareamento = { codigo: string; segredo: string; expiraEm: number };

function TelaPareamento({ onConectado }: { onConectado: (token: string) => void }) {
  const [pareamento, setPareamento] = useState<Pareamento | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [semConexao, setSemConexao] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());

  /* Cada incremento gera um codigo novo (inicio, codigo expirado ou falha de rede). */
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const res = await fetch("/api/tv/parear", { method: "POST" });
        const data = await res.json();
        if (!data.ok) throw new Error();
        const link = `${window.location.origin}/tv/conectar/${data.codigo}`;
        const imagem = await QRCode.toDataURL(link, { width: 640, margin: 1, color: { dark: "#0b0b0f", light: "#ffffff" } });
        if (!ativo) return;
        setPareamento({ codigo: data.codigo, segredo: data.segredo, expiraEm: Date.now() + data.expiraEmSegundos * 1000 });
        setQr(imagem);
        setSemConexao(false);
      } catch {
        if (!ativo) return;
        setSemConexao(true);
        retry = setTimeout(() => setTentativa((n) => n + 1), 5000);
      }
    })();
    return () => {
      ativo = false;
      clearTimeout(retry);
    };
  }, [tentativa]);

  /* Consulta se o admin ja confirmou pelo celular. */
  useEffect(() => {
    if (!pareamento) return;
    let ativo = true;
    const t = setInterval(async () => {
      setAgora(Date.now());
      try {
        const res = await fetch(`/api/tv/parear/status?codigo=${pareamento.codigo}&segredo=${pareamento.segredo}`, { cache: "no-store" });
        const data = await res.json();
        if (!ativo) return;
        if (data.status === "conectado" && data.token) onConectado(data.token);
        else if (data.status === "expirado") {
          setPareamento(null);
          setTentativa((n) => n + 1);
        }
      } catch {
        /* sem rede: tenta de novo no proximo ciclo */
      }
    }, STATUS_PAREAMENTO_MS);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, [pareamento, onConectado]);

  const restante = pareamento ? Math.max(0, Math.ceil((pareamento.expiraEm - agora) / 1000)) : 0;

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#09090b] text-white">
      <div className="tv-glow pointer-events-none absolute -top-[30%] -left-[15%] size-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.28),transparent_60%)]" />
      <div className="tv-glow pointer-events-none absolute -right-[20%] -bottom-[35%] size-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.25),transparent_60%)] [animation-delay:-4s]" />

      <div className="relative grid w-[88vw] max-w-[1500px] items-center gap-[6vw] md:grid-cols-[1.1fr_1fr]">
        <div className="tv-enter-text flex flex-col gap-[2.2vh]">
          <div className="flex items-center gap-3 text-[clamp(14px,1.4vw,26px)] font-medium text-white/60">
            <MonitorPlay className="size-[1.4em]" />
            Mídia Indoor – Menu Digital
          </div>
          <h1 className="text-[clamp(32px,4.4vw,84px)] leading-[1.02] font-semibold tracking-tight text-balance">Transforme esta TV no cardápio da sua loja</h1>
          <ol className="mt-[1vh] flex flex-col gap-[1.6vh] text-[clamp(15px,1.45vw,28px)] text-white/75">
            {["Abra a câmera do celular onde você está logado no Admin", "Aponte para o QR Code ao lado", "Confirme no celular e pronto: o catálogo aparece aqui"].map((passo, i) => (
              <li key={passo} className="flex items-start gap-[1vw]">
                <span className="flex size-[1.7em] shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.85em] font-semibold text-white">{i + 1}</span>
                <span className="pt-[0.1em]">{passo}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="tv-enter-img flex flex-col items-center gap-[2.4vh]">
          <div className="rounded-[2.2vw] bg-white p-[1.6vw] shadow-[0_40px_120px_-30px_rgba(236,72,153,0.45)]">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR Code para conectar a TV" className="block size-[min(30vw,46vh)]" />
            ) : (
              <div className="size-[min(30vw,46vh)] animate-pulse rounded-[1vw] bg-black/5" />
            )}
          </div>
          <div className="flex flex-col items-center gap-[0.6vh]">
            <div className="text-[clamp(12px,1.05vw,20px)] tracking-[0.2em] text-white/50 uppercase">ou digite o código no Admin</div>
            <div className="font-mono text-[clamp(28px,3.4vw,64px)] font-semibold tracking-[0.25em]">{pareamento ? formatarCodigoPareamento(pareamento.codigo) : "···-···"}</div>
            <div className="text-[clamp(12px,1vw,18px)] text-white/40">
              {semConexao
                ? "Sem conexão com a internet. Tentando de novo..."
                : pareamento
                  ? `Código válido por ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`
                  : "Gerando código..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Avisos ---------- */

function Aviso({ icone: Icone, titulo, texto }: { icone: React.ComponentType<{ className?: string }>; titulo: string; texto: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[2vh] bg-[#09090b] px-[8vw] text-center text-white">
      <div className="flex size-[9vh] items-center justify-center rounded-full bg-white/10">
        <Icone className="size-[4.5vh] text-white/80" />
      </div>
      <div className="text-[clamp(24px,2.8vw,54px)] font-semibold">{titulo}</div>
      <div className="max-w-[60vw] text-[clamp(14px,1.4vw,26px)] text-white/60">{texto}</div>
    </div>
  );
}

/* ---------- Exibicao parada ---------- */

/* Parada pelo Admin: tela neutra so com a marca da loja (o cliente nao ve aviso de pausa). */
function TelaPausada({ loja }: { loja: CatalogoTv["loja"] }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-[3vh] overflow-hidden bg-[#09090b] text-white">
      <div
        className="tv-glow pointer-events-none absolute top-1/2 left-1/2 size-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
        style={{ background: `radial-gradient(circle, ${loja.cor}55, transparent 65%)` }}
      />
      {loja.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={loja.logo} alt="" className="tv-fade relative size-[24vmin] rounded-full bg-white object-cover shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]" />
      ) : (
        <div className="tv-fade relative flex size-[24vmin] items-center justify-center rounded-full text-[10vmin] font-semibold" style={{ background: loja.cor }}>
          {loja.nome.charAt(0)}
        </div>
      )}
      <div className="tv-enter-text relative flex items-center gap-[1.2vmin] text-[5.5vmin] font-semibold tracking-tight">
        {loja.nome}
        {loja.verificada && (
          <svg viewBox="0 0 24 24" fill="#3b82f6" className="size-[4.5vmin] shrink-0" aria-label="Loja verificada">
            <path d="M12 2l2.4 1.6 2.8-.6 1.4 2.5 2.5 1.4-.6 2.8L22 12l-1.6 2.4.6 2.8-2.5 1.4-1.4 2.5-2.8-.6L12 22l-2.4-1.6-2.8.6-1.4-2.5-2.5-1.4.6-2.8L2 12l1.6-2.4-.6-2.8 2.5-1.4 1.4-2.5 2.8.6z" />
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

/* ---------- Catalogo ---------- */

type Bloqueio = "loja_bloqueada" | "sem_recurso" | null;

function PlayerCatalogo({ token, onRemovida }: { token: string; onRemovida: () => void }) {
  const [catalogo, setCatalogo] = useState<CatalogoTv | null>(null);
  const [bloqueio, setBloqueio] = useState<Bloqueio>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const res = await fetch("/api/tv/catalogo", { headers: { [HEADER_TOKEN_TV]: token }, cache: "no-store" });
        if (!ativo) return;
        if (res.status === 401) return onRemovida();
        const data = await res.json();
        if (!ativo) return;
        if (data.ok) {
          setCatalogo(data.catalogo);
          setBloqueio(null);
        } else {
          setBloqueio(data.motivo === "sem_recurso" ? "sem_recurso" : "loja_bloqueada");
        }
        setOffline(false);
      } catch {
        /* Sem rede: continua exibindo o ultimo catalogo carregado. */
        if (ativo) setOffline(true);
      }
    }
    carregar();
    const t = setInterval(carregar, ATUALIZAR_MS);

    /* Estado leve: recarrega o catalogo assim que a TV muda no Admin e a pagina quando sai versao nova do sistema. */
    let versao: string | null = null;
    let build: string | null = null;
    const e = setInterval(async () => {
      try {
        const res = await fetch("/api/tv/estado", { headers: { [HEADER_TOKEN_TV]: token }, cache: "no-store" });
        if (!ativo) return;
        if (res.status === 401) return onRemovida();
        const data = await res.json();
        if (!ativo || !data.ok) return;
        if (build !== null && data.build !== build) {
          window.location.reload();
          return;
        }
        build = data.build;
        if (versao !== null && data.versao !== versao) carregar();
        versao = data.versao;
      } catch {
        /* sem rede: o proximo ciclo tenta de novo */
      }
    }, ESTADO_MS);

    return () => {
      ativo = false;
      clearInterval(t);
      clearInterval(e);
    };
  }, [token, onRemovida]);

  if (bloqueio === "sem_recurso") {
    return <Aviso icone={Lock} titulo="Mídia Indoor indisponível" texto="Este recurso não está liberado no plano da loja. Fale com o administrador do sistema." />;
  }
  if (bloqueio === "loja_bloqueada") {
    return <Aviso icone={Lock} titulo="Loja indisponível no momento" texto="O catálogo volta a aparecer automaticamente assim que a loja for liberada." />;
  }
  if (!catalogo) {
    if (offline) return <Aviso icone={WifiOff} titulo="Sem conexão" texto="Verifique a internet da TV. Tentando novamente..." />;
    return <div className="h-full w-full bg-[#09090b]" />;
  }
  if (catalogo.tv.config.pausada) return <TelaPausada loja={catalogo.loja} />;
  return <VitrineTv catalogo={catalogo} />;
}

/* ---------- Raiz ---------- */

export function TvPlayer() {
  /* undefined = ainda lendo o armazenamento da TV (evita piscar o QR antes do catalogo). */
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const telaCheia = useTelaCheia();
  const [dicaTelaCheia, setDicaTelaCheia] = useState(true);
  useTelaSempreLigada();

  useEffect(() => {
    const t = setTimeout(() => setToken(lerToken()), 0);
    const d = setTimeout(() => setDicaTelaCheia(false), 10_000);
    return () => {
      clearTimeout(t);
      clearTimeout(d);
    };
  }, []);

  const conectado = useCallback((novo: string) => {
    gravarToken(novo);
    setToken(novo);
  }, []);
  const removida = useCallback(() => {
    gravarToken(null);
    setToken(null);
  }, []);

  return (
    <div className="fixed inset-0 cursor-none overflow-hidden bg-[#09090b] select-none">
      {token === undefined ? null : token ? <PlayerCatalogo token={token} onRemovida={removida} /> : <TelaPareamento onConectado={conectado} />}
      {!telaCheia && dicaTelaCheia && (
        <div className="tv-fade pointer-events-none absolute top-[3vh] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-[1.6vw] py-[0.8vh] text-[clamp(12px,1vw,18px)] text-white/70 backdrop-blur">
          Pressione OK no controle para tela cheia
        </div>
      )}
    </div>
  );
}
