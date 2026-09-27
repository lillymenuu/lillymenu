import "server-only";
import { landingConfig } from "@/db/schema";
import { db } from "@/db";
import { timestampFortaleza } from "@/db/queries/tempo";
import { storageSaveBase64 } from "@/db/queries/storage";

/** Upsert em lote — usado pelo editor de CMS do superadmin (uma chave por vez, mas todas em paralelo). */
export async function salvarLandingConfig(valores: Record<string, string>): Promise<void> {
  const entradas = Object.entries(valores);
  await Promise.all(
    entradas.map(([chave, valor]) =>
      db
        .insert(landingConfig)
        .values({ chave, valor, atualizado_em: timestampFortaleza() })
        .onConflictDoUpdate({ target: landingConfig.chave, set: { valor, atualizado_em: timestampFortaleza() } })
    )
  );
}

export type ImagemLandingInput = { chave: string; dataUri: string };

/** Salva as imagens novas (upload) e devolve chave -> URL publica, pra entrar junto no upsert de texto. */
export async function salvarImagensLanding(imagens: ImagemLandingInput[]): Promise<Record<string, string>> {
  const resultado: Record<string, string> = {};
  for (const img of imagens) {
    const url = await storageSaveBase64(img.dataUri, "landing", img.chave);
    if (url) resultado[img.chave] = url;
  }
  return resultado;
}
