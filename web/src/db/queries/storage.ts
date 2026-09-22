import "server-only";
import { randomBytes } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { timestampFortaleza } from "@/db/queries/tempo";

/*
 * Equivalente de helpers/storage.php + helpers/storage_r2.php: upload/remocao
 * de imagem (produtos, categorias, combos) no mesmo bucket R2 (Cloudflare,
 * API S3-compativel) ja usado em producao — as URLs ja gravadas no banco
 * (ex.: produtos.imagem) sao `${R2_PUBLIC_URL}/assets/uploads/...`, e essa
 * mesma convencao de chave e mantida aqui. Sem fallback pra disco local (o
 * PHP tem um, pra dev sem R2 configurado) — Vercel/serverless nao tem disco
 * persistente, e R2 ja esta configurado em producao de qualquer forma.
 */

const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: true,
  });
}

function publicBase(): string {
  return (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
}

function chaveRelativa(categoria: string, lojaId: number | null, nomeArquivo: string): string {
  const partes = ["assets/uploads", categoria];
  if (lojaId) partes.push(String(lojaId));
  partes.push(nomeArquivo);
  return partes.join("/");
}

/** Data-URI base64 (png/jpg/webp) -> URL publica no R2, ou null se invalido. */
export async function storageSaveBase64(dataUri: string, categoria: string, prefixo: string, lojaId: number | null = null): Promise<string | null> {
  const match = dataUri.match(/^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/);
  if (!match) return null;
  const extRaw = match[1].toLowerCase();
  const ext = extRaw === "jpeg" ? "jpg" : extRaw;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0) return null;

  const carimbo = timestampFortaleza().replace(/\D/g, "");
  const nome = `${prefixo}_${carimbo}_${randomBytes(4).toString("hex")}.${ext}`;
  const chave = chaveRelativa(categoria, lojaId, nome);

  await r2Client().send(
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: chave, Body: buffer, ContentType: CONTENT_TYPES[ext] ?? "application/octet-stream" })
  );

  return `${publicBase()}/${chave}`;
}

/** Apaga um arquivo dado o valor salvo no banco. So mexe em URLs do nosso bucket R2 — nunca apaga o que nao reconhece. */
export async function storageDelete(caminho: string | null | undefined): Promise<void> {
  if (!caminho || !/^https?:\/\//i.test(caminho)) return;
  const base = publicBase();
  if (!base || !caminho.startsWith(`${base}/`)) return;
  const chave = caminho.slice(base.length + 1);

  try {
    await r2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: chave }));
  } catch (e) {
    console.error("[storage] falha ao apagar", chave, e);
  }
}
