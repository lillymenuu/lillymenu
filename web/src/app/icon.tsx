import { readFile } from "node:fs/promises";
import path from "node:path";
import { getLandingConfig, lc } from "@/db/queries/landingConfig";

/* Favicon dinamico: usa a logo salva em superadmin > Marca e navegação (landing_config.logo_image)
   quando existir, caindo pro favicon estatico do repo quando a loja/plataforma ainda nao tem uma
   configurada. Revalida a cada hora — logo muda raramente, nao vale bater no banco a cada request. */
export const revalidate = 3600;
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function icon() {
  const config = await getLandingConfig();
  const logoUrl = lc(config, "logo_image");

  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl, { next: { revalidate } });
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        return new Response(buffer, {
          headers: { "Content-Type": resp.headers.get("content-type") ?? "image/png" },
        });
      }
    } catch {
      // cai pro favicon estatico abaixo
    }
  }

  const fallback = await readFile(path.join(process.cwd(), "public", "favicon_store.png"));
  return new Response(fallback, { headers: { "Content-Type": "image/png" } });
}
