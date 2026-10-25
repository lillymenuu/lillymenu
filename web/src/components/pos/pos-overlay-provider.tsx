"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { PosOverlay } from "@/components/pos/pos-overlay";
import { PosMobile } from "@/components/pos/pos-mobile";

type AbrirPosOpts = { agendamentoPrefillData?: string };

/* Abaixo disso (celular) o balcao abre no formato de app (PosMobile); tablet/computador seguem no PosOverlay. */
const MEDIA_CELULAR = "(max-width: 767px)";

type PosOverlayContextValue = {
  aberto: boolean;
  abrir: (pedidoIdParaEditar?: number, opts?: AbrirPosOpts) => void;
  fechar: () => void;
};

const PosOverlayContext = createContext<PosOverlayContextValue | null>(null);

export function usePosOverlay() {
  const ctx = useContext(PosOverlayContext);
  if (!ctx) throw new Error("usePosOverlay precisa estar dentro de PosOverlayProvider");
  return ctx;
}

export function PosOverlayProvider({
  children,
  adminPerfil,
  phpAdminUrl,
}: {
  children: React.ReactNode;
  adminPerfil: string;
  phpAdminUrl: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [pedidoEditandoId, setPedidoEditandoId] = useState<number | null>(null);
  const [agendamentoPrefillData, setAgendamentoPrefillData] = useState<string | null>(null);
  const [celular, setCelular] = useState(false);

  const abrir = useCallback((pedidoIdParaEditar?: number, opts?: AbrirPosOpts) => {
    setPedidoEditandoId(pedidoIdParaEditar ?? null);
    setAgendamentoPrefillData(opts?.agendamentoPrefillData ?? null);
    /* Decidido so ao abrir: girar o celular com o PDV aberto nao troca de tela (perderia o carrinho). */
    setCelular(window.matchMedia(MEDIA_CELULAR).matches);
    setAberto(true);
  }, []);
  const fechar = useCallback(() => {
    setAberto(false);
    setPedidoEditandoId(null);
    setAgendamentoPrefillData(null);
  }, []);

  return (
    <PosOverlayContext.Provider value={{ aberto, abrir, fechar }}>
      {children}
      {aberto && celular ? (
        <PosMobile
          onFechar={fechar}
          adminPerfil={adminPerfil}
          phpAdminUrl={phpAdminUrl}
          pedidoEditandoId={pedidoEditandoId}
          agendamentoPrefillData={agendamentoPrefillData}
        />
      ) : aberto ? (
        <PosOverlay
          onFechar={fechar}
          adminPerfil={adminPerfil}
          phpAdminUrl={phpAdminUrl}
          pedidoEditandoId={pedidoEditandoId}
          agendamentoPrefillData={agendamentoPrefillData}
        />
      ) : null}
    </PosOverlayContext.Provider>
  );
}
