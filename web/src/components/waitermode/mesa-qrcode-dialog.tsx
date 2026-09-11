"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Mesa } from "@/lib/modoGarcom";

export function MesaQrCodeDialog({
  mesa,
  cardapioUrl,
  onOpenChange,
}: {
  mesa: Mesa | null;
  cardapioUrl: string;
  onOpenChange: (v: boolean) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const link = mesa ? `${cardapioUrl}?mesa=${mesa.id}` : "";

  useEffect(() => {
    if (!mesa) {
      setDataUrl(null);
      return;
    }
    let cancelado = false;
    QRCode.toDataURL(link, { width: 480, margin: 2, color: { dark: "#111827", light: "#ffffff" } }).then((url) => {
      if (!cancelado) setDataUrl(url);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesa?.id]);

  function baixar() {
    if (!dataUrl || !mesa) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qrcode-mesa-${mesa.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function imprimir() {
    if (!dataUrl || !mesa) return;
    const janela = window.open("", "_blank", "width=420,height=560");
    if (!janela) return;
    janela.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code - ${mesa.nome}</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; gap: 16px; }
            img { width: 320px; height: 320px; }
            h1 { font-size: 22px; margin: 0; }
            p { color: #666; font-size: 13px; margin: 0; }
          </style>
        </head>
        <body>
          <h1>${mesa.nome}</h1>
          <img src="${dataUrl}" alt="QR Code ${mesa.nome}" />
          <p>Aponte a câmera do celular para pedir</p>
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
  }

  return (
    <Dialog open={mesa !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {mesa?.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O cliente escaneia esse código com a câmera do celular e abre o cardápio já vinculado a esta mesa — o pedido
          feito nasce direto marcado como consumo local nessa mesa.
        </p>
        <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 p-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR Code ${mesa?.nome}`} className="size-56 rounded-lg bg-white p-2" />
          ) : (
            <div className="flex size-56 items-center justify-center text-sm text-muted-foreground">Gerando...</div>
          )}
          <span className="max-w-full truncate text-xs text-muted-foreground" title={link}>
            {link}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" className="gap-1.5 rounded-lg font-normal" onClick={imprimir} disabled={!dataUrl}>
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button className="gap-1.5 rounded-lg font-normal" onClick={baixar} disabled={!dataUrl}>
            <Download className="size-4" /> Baixar PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
