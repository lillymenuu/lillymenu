"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { PosOverlay } from "@/components/pos/pos-overlay";

type AbrirPosOpts = { agendamentoPrefillData?: string };

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

  const abrir = useCallback((pedidoIdParaEditar?: number, opts?: AbrirPosOpts) => {
    setPedidoEditandoId(pedidoIdParaEditar ?? null);
    setAgendamentoPrefillData(opts?.agendamentoPrefillData ?? null);
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
      {aberto ? (
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
