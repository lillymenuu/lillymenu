"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Moldura de recorte na mesma proporcao usada nos cards de produto (aspect-[4/3]),
// pra nao cortar de novo na exibicao depois de cortar aqui.
const FRAME_W = 280;
const FRAME_H = 210;
const OUTPUT_W = 800;
const OUTPUT_H = 600;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

export function ImageCropDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  file: File | null;
  onConfirm: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!open || !file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  function baseScale(w: number, h: number) {
    return Math.max(FRAME_W / w, FRAME_H / h);
  }

  function clampOffset(x: number, y: number, z: number) {
    if (!natural.w || !natural.h) return { x, y };
    const scale = baseScale(natural.w, natural.h) * z;
    const dispW = natural.w * scale;
    const dispH = natural.h * scale;
    const minX = FRAME_W - dispW;
    const minY = FRAME_H - dispH;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  }

  function onImgLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const scale = baseScale(w, h);
    setOffset({ x: (FRAME_W - w * scale) / 2, y: (FRAME_H - h * scale) / 2 });
  }

  function handleZoomChange(v: number) {
    setZoom(v);
    setOffset((prev) => clampOffset(prev.x, prev.y, v));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.origX + dx, dragRef.current.origY + dy, zoom));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function confirmar() {
    const img = imgRef.current;
    if (!img || !natural.w) return;
    const scale = baseScale(natural.w, natural.h) * zoom;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = FRAME_W / scale;
    const sh = FRAME_H / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_W, OUTPUT_H);
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imagem do produto</DialogTitle>
        </DialogHeader>

        <div
          className="relative mx-auto overflow-hidden rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted select-none touch-none"
          style={{ width: FRAME_W, height: FRAME_H }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onImgLoad}
              className="absolute left-0 top-0 max-w-none cursor-grab active:cursor-grabbing"
              style={{
                width: natural.w * baseScale(natural.w, natural.h) * zoom || undefined,
                height: natural.h * baseScale(natural.w, natural.h) * zoom || undefined,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
