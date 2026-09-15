"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { PosOverlay } from "@/components/pos/pos-overlay";

type PosOverlayContextValue = {
  aberto: boolean;
  abrir: (pedidoIdParaEditar?: number) => void;
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

  const abrir = useCallback((pedidoIdParaEditar?: number) => {
    setPedidoEditandoId(pedidoIdParaEditar ?? null);
    setAberto(true);
  }, []);
  const fechar = useCallback(() => {
    setAberto(false);
    setPedidoEditandoId(null);
  }, []);

  return (
    <PosOverlayContext.Provider value={{ aberto, abrir, fechar }}>
      {children}
      {aberto ? (
        <PosOverlay onFechar={fechar} adminPerfil={adminPerfil} phpAdminUrl={phpAdminUrl} pedidoEditandoId={pedidoEditandoId} />
      ) : null}
    </PosOverlayContext.Provider>
  );
}
