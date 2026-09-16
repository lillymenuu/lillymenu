"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Cor de marca configuravel por loja (`configuracoes.tema_cor_menu`, mesmo
 * papel do `--brown` de public/assets/css/loja.css). Usa Context em vez de
 * CSS custom property porque os modais (Dialog) sao portados pro final do
 * <body> — uma CSS var setada só na arvore visual normal nao chegaria la,
 * mas o Context do React atravessa portals sem problema.
 */
const StoreThemeContext = createContext({ brown: "#7b5c3e", pink: "#e63770" });

export function StoreThemeProvider({
  brown,
  pink = "#e63770",
  children,
}: {
  brown: string;
  pink?: string;
  children: ReactNode;
}) {
  return <StoreThemeContext.Provider value={{ brown, pink }}>{children}</StoreThemeContext.Provider>;
}

export function useStoreTheme() {
  return useContext(StoreThemeContext);
}
