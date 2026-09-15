"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { Settings } from "lucide-react";
import type { PerfilImpressao } from "@/lib/impressao";

function perfisPdv(): PerfilImpressao[] {
  if (!window.impressaoQZ) return [];
  return window.impressaoQZ.listarPerfis().filter((p) => p.usoPara === "pdv" || p.usoPara === "ambos");
}

export function PosImpressaoToggle({ phpAdminUrl }: { phpAdminUrl: string }) {
  const [scriptPronto, setScriptPronto] = useState(false);
  const [ligada, setLigada] = useState(false);
  const [temPerfil, setTemPerfil] = useState(false);

  function atualizarEstado() {
    const perfis = perfisPdv();
    setTemPerfil(perfis.length > 0);
    setLigada(perfis.some((p) => p.impressaoAutomatica));
  }

  useEffect(() => {
    if (scriptPronto) atualizarEstado();
  }, [scriptPronto]);

  function alternar() {
    const perfis = perfisPdv();
    if (!perfis.length || !window.impressaoQZ) return;
    const novoEstado = !ligada;
    perfis.forEach((p) => {
      p.impressaoAutomatica = novoEstado;
      window.impressaoQZ!.salvarPerfil(p);
    });
    setLigada(novoEstado);
  }

  return (
    <>
      <Script src={`${phpAdminUrl}/admin/assets/js/impressao_qz.js`} strategy="afterInteractive" onLoad={() => setScriptPronto(true)} />
      {temPerfil ? (
        <button
          type="button"
          onClick={alternar}
          title={ligada ? "Impressão automática ligada — clique para desligar" : "Impressão automática desligada — clique para ligar"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            ligada ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <Settings className="size-5" />
        </button>
      ) : (
        <Link
          href="/settings?abrir=impressao"
          title="Nenhuma impressora configurada para o PDV — configurar agora"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Settings className="size-5" />
        </Link>
      )}
    </>
  );
}
