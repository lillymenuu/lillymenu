import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cobrancas, assinaturas } from "@/db/schema";

/*
 * Faturamento real de uma loja pra superadmin (modal "Editar loja" > grafico): soma das cobrancas
 * pagas (cobrancas.status='pago'), agrupadas por mes (ultimos 12) e por ano — nada fabricado, e
 * a mesma tabela que ja alimenta a revisao de comprovante/aprovacao de pagamento.
 */

export type FaturamentoLoja = {
  mensal: { label: string; valor: number }[];
  anual: { label: string; valor: number }[];
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export async function faturamentoLoja(lojaId: number): Promise<FaturamentoLoja> {
  if (lojaId <= 0) return { mensal: [], anual: [] };

  const linhas = await db
    .select({ pagoEm: cobrancas.pago_em, valor: cobrancas.valor })
    .from(cobrancas)
    .innerJoin(assinaturas, eq(cobrancas.assinatura_id, assinaturas.id))
    .where(and(eq(assinaturas.loja_id, lojaId), eq(cobrancas.status, "pago")));

  const porMes = new Map<string, number>();
  const porAno = new Map<string, number>();
  for (const l of linhas) {
    if (!l.pagoEm) continue;
    const d = new Date(l.pagoEm.replace(" ", "T"));
    if (isNaN(d.getTime())) continue;
    const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const chaveAno = String(d.getFullYear());
    porMes.set(chaveMes, (porMes.get(chaveMes) ?? 0) + l.valor);
    porAno.set(chaveAno, (porAno.get(chaveAno) ?? 0) + l.valor);
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
