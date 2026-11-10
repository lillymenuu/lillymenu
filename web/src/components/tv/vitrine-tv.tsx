"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ImageOff, Smartphone } from "lucide-react";
import type { CatalogoTv, ProdutoTv } from "@/lib/midiaIndoor";

/*
 * Layout "Vitrine": um produto por vez, foto grande com zoom lento, nome, descricao e preco.
 * Medidas em --uw/--uh (1% da largura/altura do palco) em vez de vw/vh: com a TV na vertical o
 * palco e girado 90 graus e as unidades da janela deixariam de bater com o que aparece na tela.
 */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function hexParaRgb(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : "230 55 112";
}

function useJanela() {
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const medir = () => setTam({ w: window.innerWidth, h: window.innerHeight });
    const t = setTimeout(medir, 0);
    window.addEventListener("resize", medir);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", medir);
    };
  }, []);
  return tam;
}

function useRelogio() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setAgora(new Date());
    const t0 = setTimeout(tick, 0);
    const t = setInterval(tick, 15_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, []);
  return agora;
}

function Preco({ produto, grande }: { produto: ProdutoTv; grande?: boolean }) {
  return (
    <div className="flex flex-col">
      {produto.emPromo && produto.precoBase > produto.precoFinal && (
        <div className="flex items-center gap-[calc(var(--uw)*1)]">
          <span className="text-[calc(var(--u)*2.1)] text-white/45 line-through decoration-[0.08em]">de {brl.format(produto.precoBase)}</span>
          {produto.descPct > 0 && (
            <span className="rounded-full bg-[rgb(var(--tv-cor))] px-[0.7em] py-[0.15em] text-[calc(var(--u)*1.7)] font-semibold">-{produto.descPct}%</span>
          )}
        </div>
      )}
      <div className={`font-semibold tracking-tight tabular-nums ${grande ? "text-[calc(var(--u)*7.4)]" : "text-[calc(var(--u)*5)]"} leading-none`}>
        {brl.format(produto.precoFinal)}
      </div>
    </div>
  );
}

function Foto({ produto, duracao }: { produto: ProdutoTv; duracao: number }) {
  if (!produto.imagem) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-[2%] bg-[linear-gradient(135deg,rgb(var(--tv-cor)/0.35),rgb(var(--tv-cor)/0.08))]">
        <span className="text-[calc(var(--u)*16)] leading-none font-semibold text-white/85">{produto.nome.charAt(0).toUpperCase()}</span>
        <ImageOff className="size-[calc(var(--u)*2.6)] text-white/30" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={produto.imagem}
      alt=""
      className="tv-kenburns h-full w-full object-cover"
      style={{ ["--tv-dur" as string]: `${duracao + 1}s` }}
    />
  );
}

export function VitrineTv({ catalogo }: { catalogo: CatalogoTv }) {
  const janela = useJanela();
  const agora = useRelogio();
  const [indice, setIndice] = useState(0);
  const [qrLoja, setQrLoja] = useState<string | null>(null);

  const { produtos, loja, tv } = catalogo;
  const { config } = tv;
  const total = produtos.length;
  const atual = total > 0 ? produtos[indice % total] : null;
  const proximo = total > 1 ? produtos[(indice + 1) % total] : null;

  /* Troca de produto. O efeito reinicia a cada slide, entao uma mudanca no tempo vale ja no proximo. */
  useEffect(() => {
    if (total <= 1) return;
    const t = setTimeout(() => setIndice((i) => (i + 1) % total), config.tempoSlide * 1000);
    return () => clearTimeout(t);
  }, [indice, total, config.tempoSlide]);

  useEffect(() => {
    if (!config.mostrarQrLoja || !loja.link) return;
    let ativo = true;
    QRCode.toDataURL(loja.link, { width: 360, margin: 1, color: { dark: "#0b0b0f", light: "#ffffff" } })
      .then((url) => ativo && setQrLoja(url))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [loja.link, config.mostrarQrLoja]);

  const vertical = config.orientacao === "vertical";
  const palco = useMemo(() => {
    if (!janela) return null;
    /* Na vertical o palco tem as medidas trocadas e e girado pra caber na tela. */
    const w = vertical ? janela.h : janela.w;
    const h = vertical ? janela.w : janela.h;
    return { w, h, retrato: h > w };
  }, [janela, vertical]);

  if (!palco) return null;

  const estiloPalco: React.CSSProperties = {
    width: palco.w,
    height: palco.h,
    ["--uw" as string]: `${palco.w / 100}px`,
    ["--uh" as string]: `${palco.h / 100}px`,
    /* --u: unidade base pra texto, pela menor dimensao (equivale a vmin do palco). */
    ["--u" as string]: `${Math.min(palco.w, palco.h) / 100}px`,
    ["--tv-cor" as string]: hexParaRgb(loja.cor),
    ...(vertical ? { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(90deg)" } : {}),
  };

  const hora = agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div style={estiloPalco} className="relative overflow-hidden bg-[#09090b] text-white">
      {/* Fundo: a foto do produto desfocada e a cor da loja. */}
      {atual?.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`bg-${atual.id}`} src={atual.imagem} alt="" className="tv-fade absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-[48px] saturate-[1.35]" />
      )}
      {/* Veu leve: a foto continua viva, so escurece um pouco embaixo e atras do texto pra manter a leitura. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgb(var(--tv-cor)/0.28),transparent_55%),linear-gradient(90deg,rgba(9,9,11,0.05)_0%,rgba(9,9,11,0.32)_60%,rgba(9,9,11,0.4)_100%),linear-gradient(180deg,rgba(9,9,11,0.18)_0%,rgba(9,9,11,0)_35%,rgba(9,9,11,0.55)_100%)]" />

      <div className="relative flex h-full flex-col px-[calc(var(--u)*5)] py-[calc(var(--u)*4)] [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]">
        {/* Cabecalho */}
        <header className="flex items-center justify-between gap-[calc(var(--u)*2)]">
          <div className="flex min-w-0 items-center gap-[calc(var(--u)*1.6)]">
            {loja.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={loja.logo} alt="" className="size-[calc(var(--u)*7)] rounded-full bg-white object-cover" />
            ) : (
              <div className="flex size-[calc(var(--u)*7)] items-center justify-center rounded-full bg-[rgb(var(--tv-cor))] text-[calc(var(--u)*3.2)] font-semibold">
                {loja.nome.charAt(0)}
              </div>
            )}
            <div className="truncate text-[calc(var(--u)*3.2)] font-semibold tracking-tight">{loja.nome}</div>
            {loja.verificada && (
              <svg viewBox="0 0 24 24" fill="#3b82f6" className="size-[calc(var(--u)*3)] shrink-0 drop-shadow" aria-label="Loja verificada">
                <path d="M12 2l2.4 1.6 2.8-.6 1.4 2.5 2.5 1.4-.6 2.8L22 12l-1.6 2.4.6 2.8-2.5 1.4-1.4 2.5-2.8-.6L12 22l-2.4-1.6-2.8.6-1.4-2.5-2.5-1.4.6-2.8L2 12l1.6-2.4-.6-2.8 2.5-1.4 1.4-2.5 2.8.6z" />
                <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-[calc(var(--u)*1.6)]">
            <span className="text-[calc(var(--u)*3)] font-medium text-white/80 tabular-nums">{hora}</span>
            <span
              className={`flex items-center gap-[0.5em] rounded-full px-[0.9em] py-[0.35em] text-[calc(var(--u)*1.8)] font-semibold ${loja.aberta ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}
            >
              <span className={`size-[0.55em] rounded-full ${loja.aberta ? "bg-emerald-400" : "bg-white/50"}`} />
              {loja.aberta ? "Aberto" : "Fechado"}
            </span>
          </div>
        </header>

        {/* Produto */}
        {atual ? (
          <main
            key={atual.id}
            className={`flex min-h-0 flex-1 gap-[calc(var(--u)*4.5)] py-[calc(var(--u)*2)] ${palco.retrato ? "flex-col" : "items-center"}`}
          >
            <div
              className={`tv-enter-img relative overflow-hidden rounded-[calc(var(--u)*3.2)] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 ${palco.retrato ? "aspect-[4/3] w-full" : "aspect-[4/3] h-full max-h-full max-w-[56%]"}`}
            >
              <Foto produto={atual} duracao={config.tempoSlide} />
              {atual.emPromo && (
                <div className="absolute top-[5%] left-[5%] rounded-full bg-[rgb(var(--tv-cor))] px-[1em] py-[0.35em] text-[calc(var(--u)*2)] font-semibold shadow-lg">
                  Promoção
                </div>
              )}
            </div>

            <div className={`tv-enter-text flex min-w-0 flex-1 flex-col justify-center gap-[calc(var(--u)*2.2)] [animation-delay:.15s] ${palco.retrato ? "" : "pr-[calc(var(--u)*2)]"}`}>
              <span className="w-fit rounded-full border border-white/25 bg-black/15 px-[1em] py-[0.35em] text-[calc(var(--u)*1.9)] font-medium tracking-[0.18em] text-white/70 uppercase">
                {atual.categoria}
              </span>
              <h2 className="line-clamp-2 text-[calc(var(--u)*7)] leading-[1.02] font-semibold tracking-tight text-balance">{atual.nome}</h2>
              {atual.descricao && <p className="line-clamp-3 text-[calc(var(--u)*2.6)] leading-snug text-white/85">{atual.descricao}</p>}
              <div className="mt-[calc(var(--u)*1)]">
                <Preco produto={atual} grande />
              </div>
            </div>
          </main>
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center gap-[calc(var(--u)*1.5)] text-center">
            <div className="text-[calc(var(--u)*4)] font-semibold">Nenhum produto para exibir</div>
            <div className="text-[calc(var(--u)*2.2)] text-white/55">Confira as categorias e opções desta TV no Admin, em Mídia Indoor.</div>
          </main>
        )}

        {/* Rodape: progresso, proximo produto e QR da loja */}
        <footer className="flex items-end justify-between gap-[calc(var(--u)*3)]">
          <div className="flex min-w-0 flex-1 flex-col gap-[calc(var(--u)*1.4)]">
            {total > 1 && (
              <div className="h-[calc(var(--u)*0.5)] w-full max-w-[calc(var(--uw)*40)] overflow-hidden rounded-full bg-white/10">
                <div key={`p-${indice}`} className="tv-progress h-full w-full rounded-full bg-[rgb(var(--tv-cor))]" style={{ ["--tv-dur" as string]: `${config.tempoSlide}s` }} />
              </div>
            )}
            <div className="flex items-center gap-[calc(var(--u)*1.5)] text-[calc(var(--u)*1.9)] text-white/50">
              {total > 0 && (
                <span className="tabular-nums">
                  {(indice % total) + 1} / {total}
                </span>
              )}
              {proximo && <span className="truncate">A seguir: {proximo.nome}</span>}
            </div>
          </div>
          {config.mostrarQrLoja && qrLoja && (
            <div className="flex shrink-0 items-center gap-[calc(var(--u)*1.6)] rounded-[calc(var(--u)*2.2)] bg-white/[0.07] p-[calc(var(--u)*1.2)] pr-[calc(var(--u)*2.2)] ring-1 ring-white/10 backdrop-blur">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrLoja} alt="" className="size-[calc(var(--u)*11)] rounded-[calc(var(--u)*1.2)] bg-white p-[calc(var(--u)*0.5)]" />
              <div className="flex flex-col">
                <span className="flex items-center gap-[0.4em] text-[calc(var(--u)*2.2)] font-semibold">
                  <Smartphone className="size-[1em]" />
                  Peça pelo celular
                </span>
                <span className="text-[calc(var(--u)*1.7)] text-white/55">Aponte a câmera para o QR</span>
              </div>
            </div>
          )}
        </footer>
      </div>

      {/* Pre-carrega a proxima foto pra troca nao piscar. */}
      {proximo?.imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={proximo.imagem} alt="" className="hidden" />
      )}
    </div>
  );
}
