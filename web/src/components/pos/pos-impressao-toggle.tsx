"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { mensagemErroQZ, salvarPerfil, usePerfisImpressao } from "@/lib/impressao-qz";
import { cn } from "cn";

/*
 * Toggle de impressao automatica do PDV: ligado, todo pedido finalizado no PDV vai direto pras
 * impressoras PDV/ambos da loja (deste computador ou de outro, pela fila); desligado, so imprime
 * pelo "Finalizar e imprimir". Liga/desliga a "Impressao automatica" dessas impressoras.
 */
export function PosImpressaoToggle() {
  const perfis = usePerfisImpressao().filter((p) => p.usoPara === "pdv" || p.usoPara === "ambos");
  const ligada = perfis.some((p) => p.impressaoAutomatica);
  const [salvando, setSalvando] = useState(false);

  async function alternar() {
    if (salvando) return;
    const novo = !ligada;
    setSalvando(true);
    try {
      // em sequencia: cada salvamento regrava a lista da loja inteira
      for (const p of perfis) if (p.impressaoAutomatica !== novo) await salvarPerfil({ ...p, impressaoAutomatica: novo });
      toast.success(novo ? "Impressão automática ligada: os pedidos do PDV vão direto para a impressora." : "Impressão automática desligada.");
    } catch (e) {
      toast.error(mensagemErroQZ(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!perfis.length) {
    return (
      <Link
        href="/settings?abrir=impressao"
        title="Nenhuma impressora do PDV cadastrada — configurar agora"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <Printer className="size-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label="Impressão automática dos pedidos do PDV"
      onClick={() => void alternar()}
      disabled={salvando}
      title={ligada ? "Impressão automática ligada — clique para desligar" : "Impressão automática desligada — clique para ligar"}
      className={cn(
        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-70",
        ligada ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:bg-muted/50"
      )}
    >
      {salvando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
      <span
        aria-hidden
        className={cn(
          "absolute right-2 bottom-2 size-2 rounded-full ring-2",
          ligada ? "bg-emerald-400 ring-primary" : "bg-muted-foreground/40 ring-background"
        )}
      />
    </button>
  );
}
