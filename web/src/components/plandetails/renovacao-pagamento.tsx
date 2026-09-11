"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { CobrancaPendente } from "@/lib/assinatura";

type PixEstado = "idle" | "gerando" | "erro" | "pronto" | "pago";

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Bloco de renovacao (Pix automatico via Mercado Pago + fallback manual com
 * comprovante), portado de admin/partials/renovacao_pagamento.php. Ao
 * confirmar o pagamento via Pix, redireciona para /dashboard em vez de so
 * recarregar a pagina — o bug relatado pelo usuario no legado.
 */
export function RenovacaoPagamento({
  cobrancaPendenteInicial,
  saasPixChave,
  saasPixNome,
  whatsLink,
  lojaNome,
}: {
  cobrancaPendenteInicial: CobrancaPendente | null;
  saasPixChave: string;
  saasPixNome: string;
  whatsLink: string;
  lojaNome: string;
}) {
  const router = useRouter();
  const [pixEstado, setPixEstado] = useState<PixEstado>("idle");
  const [pixErro, setPixErro] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [cobrancaId, setCobrancaId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [manualAberto, setManualAberto] = useState(false);
  const [cobrancaPendente, setCobrancaPendente] = useState(cobrancaPendenteInicial);
  const [enviandoComprovante, setEnviandoComprovante] = useState(false);
  const [comprovanteJaEnviado, setComprovanteJaEnviado] = useState(
    !!cobrancaPendenteInicial?.comprovante_arquivo
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function verificarStatus(id: number) {
    try {
      const res = await fetch(`/api/plan-details/pix-status?cobranca_id=${id}`);
      const data = await res.json();
      if (data.ok && data.pago) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPixEstado("pago");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch {
      // ignora falha isolada de polling, tenta de novo no proximo tick
    }
  }

  async function gerarPix() {
    setPixEstado("gerando");
    setPixErro("");
    try {
      const res = await fetch("/api/plan-details/pix-criar", { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setPixErro(data.msg ?? "Erro ao gerar o Pix.");
        setPixEstado("erro");
        return;
      }
      setQrCode(data.qr_code);
      setQrCodeBase64(data.qr_code_base64);
      setCobrancaId(data.cobranca_id);
      setPixEstado("pronto");
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => verificarStatus(data.cobranca_id), 5000);
    } catch {
      setPixErro("Erro ao gerar o Pix.");
      setPixEstado("erro");
    }
  }

  function copiarPixAuto() {
    navigator.clipboard.writeText(qrCode).then(() => toast.success("Chave copiada."));
  }

  function copiarPixManual() {
    navigator.clipboard.writeText(saasPixChave).then(() => toast.success("Chave copiada."));
  }

  async function handleComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
      toast.error("Arquivo inválido (use JPG, PNG, WebP ou PDF).");
      return;
    }
    if (file.size > 5242880) {
      toast.error("Arquivo muito grande (máximo 5MB).");
      return;
    }
    setEnviandoComprovante(true);
    try {
      const dataUri = await lerComoBase64(file);
      const base64 = dataUri.split(",")[1] ?? "";
      const res = await fetch("/api/plan-details/comprovante-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comprovante_base64: base64, comprovante_ext: ext }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao enviar o comprovante.");
        return;
      }
      toast.success("Comprovante enviado com sucesso! Aguarde a aprovação.");
      setComprovanteJaEnviado(true);
      setCobrancaPendente((c) => (c ? { ...c, comprovante_arquivo: "enviado", comprovante_enviado_em: new Date().toISOString() } : c));
    } catch {
      toast.error("Erro ao enviar o comprovante.");
    } finally {
      setEnviandoComprovante(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {pixEstado === "idle" && (
          <Button className="rounded-lg font-normal" onClick={gerarPix}>
            Pagar com Pix
          </Button>
        )}
        {pixEstado === "gerando" && (
          <p className="text-sm text-muted-foreground">Gerando Pix...</p>
        )}
        {pixEstado === "erro" && (
          <>
            <p className="text-sm text-destructive">{pixErro}</p>
            <Button className="rounded-lg font-normal" onClick={gerarPix}>
              Pagar com Pix
            </Button>
          </>
        )}
        {pixEstado === "pronto" && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code Pix"
              className="size-44 rounded-lg bg-white p-2"
            />
            <div className="flex w-full items-center gap-2">
              <span className="flex-1 truncate rounded-lg bg-background px-2 py-1.5 text-xs">{qrCode}</span>
              <Button variant="outline" size="sm" className="rounded-lg font-normal" onClick={copiarPixAuto}>
                Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Aguardando confirmação do pagamento...</p>
          </div>
        )}
        {pixEstado === "pago" && (
          <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Pagamento confirmado! Redirecionando...
          </p>
        )}
      </div>

      <button
        type="button"
        className="text-left text-sm text-muted-foreground underline underline-offset-2"
        onClick={() => setManualAberto((v) => !v)}
      >
        Prefere pagar de outro jeito?
      </button>

      {manualAberto && (
        <div className="flex flex-col gap-3 rounded-xl border p-3">
          {saasPixChave !== "" && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase">Chave PIX para pagamento</span>
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate rounded-lg bg-muted/40 px-2 py-1.5 text-xs">{saasPixChave}</span>
                <Button variant="outline" size="sm" className="rounded-lg font-normal" onClick={copiarPixManual}>
                  Copiar
                </Button>
              </div>
              {saasPixNome !== "" && (
                <span className="text-xs text-muted-foreground">Favorecido: {saasPixNome}</span>
              )}
            </div>
          )}

          {comprovanteJaEnviado ? (
            <div className="text-sm text-muted-foreground">
              {cobrancaPendente?.comprovante_enviado_em && (
                <p>Comprovante enviado em {formatDataHoraCurta(cobrancaPendente.comprovante_enviado_em)} — aguardando aprovação.</p>
              )}
              {cobrancaPendente?.motivo_rejeicao && (
                <p className="mt-1 text-destructive">Motivo da última rejeição: {cobrancaPendente.motivo_rejeicao}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cobrancaPendente?.motivo_rejeicao && (
                <p className="text-sm text-destructive">Comprovante anterior rejeitado: {cobrancaPendente.motivo_rejeicao}</p>
              )}
              <label className="text-sm">
                Enviar comprovante (imagem ou PDF, até 5MB)
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  disabled={enviandoComprovante}
                  onChange={handleComprovante}
                  className="mt-1 block w-full text-sm"
                />
              </label>
            </div>
          )}

          <a href={whatsLink} target="_blank" rel="noopener" className="w-full">
            <Button variant="outline" className="w-full rounded-lg font-normal">
              Enviar comprovante no WhatsApp
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
