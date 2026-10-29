"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Move, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// O banner da loja aparece ~4:1 tanto no desktop (1342x323) quanto no app mobile
// em telas largas; o arquivo final sai sempre nesse tamanho.
export const BANNER_LARGURA = 1920;
export const BANNER_ALTURA = 480;
// No celular (~390px de largura x 210px de altura) so a faixa central aparece.
const FRACAO_VISIVEL_CELULAR = 390 / 210 / (BANNER_LARGURA / BANNER_ALTURA);
const ZOOM_MAX = 3;

type Pos = { x: number; y: number };

export function BannerCropDialog({ src, onCancelar, onConfirmar }: { src: string | null; onCancelar: () => void; onConfirmar: (dataUrl: string) => void }) {
  return (
    <Dialog open={src !== null} onOpenChange={(v) => !v && onCancelar()}>
      <DialogContent className="w-[820px] max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle>Ajustar banner</DialogTitle>
        </DialogHeader>
        {/* key: cada imagem nova comeca centralizada e sem zoom. */}
        {src ? <EditorBanner key={src} src={src} onCancelar={onCancelar} onConfirmar={onConfirmar} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function EditorBanner({ src, onCancelar, onConfirmar }: { src: string; onCancelar: () => void; onConfirmar: (dataUrl: string) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const arrasteRef = useRef<{ inicio: Pos; pos: Pos } | null>(null);
  const [frameLargura, setFrameLargura] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  // null = ainda nao mexeu: imagem centralizada.
  const [posEscolhida, setPosEscolhida] = useState<Pos | null>(null);

  const frameAltura = frameLargura / (BANNER_LARGURA / BANNER_ALTURA);
  const escalaBase = natural && frameLargura ? Math.max(frameLargura / natural.w, frameAltura / natural.h) : 1;
  const escala = escalaBase * zoom;
  const imgW = natural ? natural.w * escala : 0;
  const imgH = natural ? natural.h * escala : 0;

  // Mantem a imagem cobrindo o quadro inteiro (sem sobrar fundo vazio).
  const limitar = useCallback(
    (p: Pos, w: number, h: number): Pos => ({
      x: Math.min(0, Math.max(frameLargura - w, p.x)),
      y: Math.min(0, Math.max(frameAltura - h, p.y)),
    }),
    [frameLargura, frameAltura]
  );

  const pos = limitar(
    posEscolhida ?? {
      x: (frameLargura - imgW) / 2,
      y: (frameAltura - imgH) / 2,
    },
    imgW,
    imgH
  );

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFrameLargura(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function mudarZoom(novo: number) {
    if (!natural) return;
    const z = Math.min(ZOOM_MAX, Math.max(1, novo));
    const s = escalaBase * z;
    // Zoom ancorado no centro do quadro.
    const cx = frameLargura / 2;
    const cy = frameAltura / 2;
    const nx = cx - ((cx - pos.x) / escala) * s;
    const ny = cy - ((cy - pos.y) / escala) * s;
    setZoom(z);
    setPosEscolhida(limitar({ x: nx, y: ny }, natural.w * s, natural.h * s));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasteRef.current = { inicio: { x: e.clientX, y: e.clientY }, pos };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasteRef.current;
    if (!a) return;
    setPosEscolhida(
      limitar(
        {
          x: a.pos.x + e.clientX - a.inicio.x,
          y: a.pos.y + e.clientY - a.inicio.y,
        },
        imgW,
        imgH
      )
    );
  }

  function onPointerUp() {
    arrasteRef.current = null;
  }

  function confirmar() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = BANNER_LARGURA;
    canvas.height = BANNER_ALTURA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -pos.x / escala, -pos.y / escala, frameLargura / escala, frameAltura / escala, 0, 0, BANNER_LARGURA, BANNER_ALTURA);
    onConfirmar(canvas.toDataURL("image/jpeg", 0.88));
  }

  // Largura real (em px da imagem original) do trecho escolhido — abaixo de ~1200
  // o banner tende a ficar borrado no desktop.
  const larguraRecorte = natural && escala ? Math.round(frameLargura / escala) : 0;
  const baixaResolucao = natural !== null && larguraRecorte > 0 && larguraRecorte < 1200;
  const faixaCelular = ((1 - FRACAO_VISIVEL_CELULAR) / 2) * 100;

  return (
    <>
      <p className="text-sm text-muted-foreground">Arraste a imagem para escolher o enquadramento e use o zoom para aproximar.</p>

      <div
        ref={frameRef}
        className="relative aspect-[4/1] w-full cursor-grab touch-none overflow-hidden rounded-xl bg-muted select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {natural ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none"
            style={{
              width: imgW,
              height: imgH,
              transform: `translate(${pos.x}px, ${pos.y}px)`,
            }}
          />
        ) : null}
        {/* Faixa que aparece no celular: as laterais escurecidas so aparecem no desktop. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/35" style={{ width: `${faixaCelular}%` }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/35" style={{ width: `${faixaCelular}%` }} />
        <div
          className="pointer-events-none absolute inset-y-0 border-x-2 border-dashed border-white/80"
          style={{ left: `${faixaCelular}%`, right: `${faixaCelular}%` }}
        >
          <span className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white">
            Visível no celular
          </span>
        </div>
        <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white">
          <Move className="size-3" /> Arraste
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" className="rounded-xl" onClick={() => mudarZoom(zoom - 0.25)} aria-label="Diminuir zoom">
          <Minus className="size-4" />
        </Button>
        <input
          type="range"
          min={1}
          max={ZOOM_MAX}
          step={0.01}
          value={zoom}
          onChange={(e) => mudarZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
          aria-label="Zoom"
        />
        <Button variant="ghost" size="icon-sm" className="rounded-xl" onClick={() => mudarZoom(zoom + 0.25)} aria-label="Aumentar zoom">
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>
          Tamanho ideal: <span className="font-medium text-foreground">1920 × 480 px</span> (proporção 4:1). Deixe o mais importante dentro da área tracejada,
          que é o que aparece no celular.
        </p>
        {baixaResolucao ? <p className="text-amber-600">Essa imagem tem pouca resolução para o banner e pode ficar borrada em telas grandes.</p> : null}
      </div>

      <DialogFooter className="border-t-0 bg-transparent">
        <Button variant="outline" className="rounded-xl" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button className="rounded-xl" onClick={confirmar} disabled={!natural}>
          Aplicar
        </Button>
      </DialogFooter>
    </>
  );
}
