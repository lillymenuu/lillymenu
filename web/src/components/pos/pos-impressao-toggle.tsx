"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { mensagemErroQZ, salvarPerfil, usePerfisImpressao } from "@/lib/impressao-qz";

export function PosImpressaoToggle() {
  /* So contam as impressoras da loja vinculadas a uma impressora deste computador. */
  const perfis = usePerfisImpressao().filter((p) => p.qzPrinterName && (p.usoPara === "pdv" || p.usoPara === "ambos"));
  const temPerfil = perfis.length > 0;
  const ligada = perfis.some((p) => p.impressaoAutomatica);

  async function alternar() {
    try {
      // em sequencia: cada salvamento regrava a lista da loja inteira
      for (const p of perfis) await salvarPerfil({ ...p, impressaoAutomatica: !ligada });
    } catch (e) {
      toast.error(mensagemErroQZ(e));
    }
  }

  return (
    <>
      {temPerfil ? (
        <button
          type="button"
          onClick={() => void alternar()}
          title={ligada ? "Impressão automática ligada — clique para desligar" : "Impressão automática desligada — clique para ligar"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
            ligada ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Printer className="size-4" />
        </button>
      ) : (
        <Link
          href="/settings?abrir=impressao"
          title="Nenhuma impressora do PDV vinculada neste computador — configurar agora"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Printer className="size-4" />
        </Link>
      )}
    </>
  );
}
