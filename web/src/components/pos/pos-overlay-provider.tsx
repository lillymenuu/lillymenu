"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { PosOverlay } from "@/components/pos/pos-overlay";

type PosOverlayContextValue = {
  aberto: boolean;
  abrir: () => void;
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

  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);

  return (
    <PosOverlayContext.Provider value={{ aberto, abrir, fechar }}>
      {children}
      {aberto ? <PosOverlay onFechar={fechar} adminPerfil={adminPerfil} phpAdminUrl={phpAdminUrl} /> : null}
    </PosOverlayContext.Provider>
  );
}
