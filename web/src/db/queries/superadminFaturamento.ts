import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidos } from "@/db/schema";

/*
 * Faturamento real de uma loja pra superadmin (card "Lojas" > grafico): soma do total dos pedidos
 * finalizados (pedidos.status='finalizado'), agrupada por mes (ultimos 12) e por ano — mesma
 * definicao de "faturamento" ja usada no dashboard da propria loja (db/queries/dashboard.ts,
 * sum(pedidos.total) where status='finalizado'). E o faturamento DA LOJA com os proprios clientes,
 * nao a cobranca da assinatura SaaS que ela paga pra plataforma (essa fica em cobrancas/
 * assinaturas, usada em outro lugar do superadmin — ver sa-lojas-manager.tsx).
 */

export type FaturamentoLoja = {
  mensal: { label: string; valor: number }[];
  anual: { label: string; valor: number }[];
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export async function faturamentoLoja(lojaId: number): Promise<FaturamentoLoja> {
  if (lojaId <= 0) return { mensal: [], anual: [] };

  const linhas = await db
    .select({ criadoEm: pedidos.criado_em, total: pedidos.total })
    .from(pedidos)
    .where(and(eq(pedidos.loja_id, lojaId), eq(pedidos.status, "finalizado")));

  const porMes = new Map<string, number>();
  const porAno = new Map<string, number>();
  for (const l of linhas) {
    if (!l.criadoEm || l.total === null) continue;
    const d = new Date(l.criadoEm.replace(" ", "T"));
    if (isNaN(d.getTime())) continue;
    const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const chaveAno = String(d.getFullYear());
    porMes.set(chaveMes, (porMes.get(chaveMes) ?? 0) + l.total);
    porAno.set(chaveAno, (porAno.get(chaveAno) ?? 0) + l.total);
  }

  const agora = new Date();
  const mensal: { label: string; valor: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mensal.push({ label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, valor: Math.round((porMes.get(chave) ?? 0) * 100) / 100 });
  }

  const anosComDados = [...porAno.keys()].sort();
  const anual = anosComDados.map((ano) => ({ label: ano, valor: Math.round((porAno.get(ano) ?? 0) * 100) / 100 }));
  if (anual.length === 0) anual.push({ label: String(agora.getFullYear()), valor: 0 });

  return { mensal, anual };
}
