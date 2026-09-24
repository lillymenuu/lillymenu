import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * O link publico real da loja e a raiz (ex.: lillymenu.com/tewconfeitaria,
   * ja gravado em configuracoes.link_loja) — nao /store/[slug]. Como rewrite
   * "afterFiles", so entra em acao quando nenhuma outra rota bate primeiro
   * (login, dashboard, api/*, etc.), entao e seguro como fallback de um
   * unico segmento.
   */
  async rewrites() {
    return [{ source: "/:slug", destination: "/store/:slug" }];
  },
};

export default nextConfig;
