import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* pdfkit le as fontes .afm do disco em runtime; nao pode ser empacotado */
  serverExternalPackages: ["pdfkit"],
  /*
   * O link publico real da loja e a raiz (ex.: lillymenu.com/tewconfeitaria,
   * ja gravado em configuracoes.link_loja) — nao /store/[slug]. Como rewrite
   * "afterFiles", so entra em acao quando nenhuma outra rota bate primeiro
   * (login, dashboard, api/*, etc.), entao e seguro como fallback de um
   * unico segmento.
   */
  /* Service worker do Web Push: sempre buscar a versao nova (sem cache do navegador/CDN). */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  async rewrites() {
    return [{ source: "/:slug", destination: "/store/:slug" }];
  },
};

export default nextConfig;
