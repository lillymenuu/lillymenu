"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { salvarPerfil, usePerfisImpressao } from "@/lib/impressao-qz";

export function PosImpressaoToggle() {
  const perfis = usePerfisImpressao().filter((p) => p.usoPara === "pdv" || p.usoPara === "ambos");
  const temPerfil = perfis.length > 0;
  const ligada = perfis.some((p) => p.impressaoAutomatica);

  function alternar() {
    perfis.forEach((p) => salvarPerfil({ ...p, impressaoAutomatica: !ligada }));
  }

  return (
    <>
      {temPerfil ? (
        <button
          type="button"
          onClick={alternar}
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
          title="Nenhuma impressora configurada para o PDV — configurar agora"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Printer className="size-4" />
        </Link>
      )}
    </>
  );
}
