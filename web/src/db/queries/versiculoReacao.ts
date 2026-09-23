import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { versiculoReacoes } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/versiculo_reacao.php: guarda a reacao
 * (gostou/nao_gostou) do admin ao versiculo do dia exibido no dashboard.
 *
 * A busca do texto do versiculo em si (admin/api/v1/versiculo_dia.php)
 * ficou FORA desta etapa por decisao deliberada: e um scraper de HTML de
 * terceiros (bibliaon.com) com ~150 linhas de heuristicas de extracao
 * (varias estrategias de fallback via XPath) pra um widget decorativo do
 * dashboard — exigiria adicionar uma dependencia de parsing de HTML nova
 * ao projeto so pra isso, e o resultado seria inerentemente fragil (quebra
 * se o site de origem mudar o HTML). Fica marcado aqui pra retomar se
 * o widget for considerado prioridade.
 */

const REACOES_VALIDAS = ["gostou", "nao_gostou"] as const;

export async function salvarReacaoVersiculo(adminId: number, reacaoInput: string, dataInput: string, referenciaInput: string, textoInput: string): Promise<{ ok: true } | { ok: false; msg: string }> {
  const reacao = reacaoInput.trim();
  if (!(REACOES_VALIDAS as readonly string[]).includes(reacao)) return { ok: false, msg: "Dados invalidos." };

  const data = dataInput.trim();
  const referencia = referenciaInput.trim();
  const texto = textoInput.trim();

  await db
    .insert(versiculoReacoes)
    .values({ admin_id: adminId, data_versiculo: data, reacao: reacao as (typeof REACOES_VALIDAS)[number], referencia: referencia || null, texto: texto || null })
    .onConflictDoUpdate({
      target: [versiculoReacoes.admin_id, versiculoReacoes.data_versiculo],
      set: { reacao: reacao as (typeof REACOES_VALIDAS)[number], referencia: referencia || null, texto: texto || null, atualizado_em: new Date().toISOString() },
    });

  return { ok: true };
}

export async function reacaoVersiculoDoDia(adminId: number, data: string): Promise<string | null> {
  const [linha] = await db.select({ reacao: versiculoReacoes.reacao }).from(versiculoReacoes).where(and(eq(versiculoReacoes.admin_id, adminId), eq(versiculoReacoes.data_versiculo, data))).limit(1);
  return linha?.reacao ?? null;
}
