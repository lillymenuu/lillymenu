import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { lojas, suporteMensagens } from "@/db/schema";
import { buscarLojasComDetalhes, resolverStatusLoja, buscarLeadsRecentes } from "@/db/queries/superadminHelpers";

/* Equivalente de admin/api/v1/superadmin_dashboard.php. */

export type DashboardSuperadmin = {
  admin: { nome: string };
  kpis: {
    totalLojas: number;
    lojasAtivas: number;
    receitaMes: number;
    lojasTrial: number;
    expira7: number;
    expira15: number;
    expira30: number;
    expiradas: number;
    comprovantesPendentes: number;
    outras: number;
    suporteNaoLidas: number;
  };
  cadastrosMes: { mes: string; total: number }[];
  leads: { id: number; nome: string; contato: string; criadoEm: string | null }[];
  destaque: { id: number; nome: string; plano: string; valor: number; status: string }[];
};

export async function dashboardSuperadmin(adminNome: string): Promise<DashboardSuperadmin> {
  const lojasDetalhadas = await buscarLojasComDetalhes();
  const hoje = new Date();

  let totalAtivas = 0;
  let totalTrial = 0;
  let expira7 = 0;
  let expira15 = 0;
  let expira30 = 0;
  let expiradas = 0;
  let comprovantesPendentes = 0;
  let receitaMes = 0;

  const lojasComStatus = lojasDetalhadas.map((l) => {
    const r = resolverStatusLoja(l, hoje);
    const hasAccess = r.statusResolvido === "ativa" || (!r.status && Boolean(r.ativo));
    if (hasAccess) {
      totalAtivas++;
      receitaMes += r.planoValor ?? 0;
    }
    if (r.comprovanteArquivo && (r.cobrancaStatus === "pendente" || r.cobrancaStatus === "atrasado")) comprovantesPendentes++;
    if (r.isTrialPeriodo || r.statusResolvido === "trial") totalTrial++;
    if (r.expiraDias !== null) {
      if (r.expiraDias < 0) expiradas++;
      else {
        if (r.expiraDias <= 7) expira7++;
        if (r.expiraDias <= 15) expira15++;
        if (r.expiraDias <= 30) expira30++;
      }
    }
    return r;
  });

  const porMesLinhas = await db.select({ mes: sql<string>`to_char(${lojas.criado_em}, 'YYYY-MM')`, total: sql<string>`count(*)` }).from(lojas).groupBy(sql`to_char(${lojas.criado_em}, 'YYYY-MM')`);
  const porMes = new Map(porMesLinhas.map((r) => [r.mes, Number(r.total)]));

  const cadastros: { mes: string; total: number }[] = [];
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    const chave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    cadastros.push({ mes: chave, total: porMes.get(chave) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const leadsRecentes = await buscarLeadsRecentes();
  const leads = leadsRecentes.slice(0, 5).map((lead) => ({
    id: lead.id,
    nome: lead.nome || lead.empresa || "Lead",
    contato: lead.email || lead.whatsapp || "",
    criadoEm: lead.criadoEm,
  }));

  const destaque = [...lojasComStatus]
    .sort((a, b) => (b.planoValor ?? 0) - (a.planoValor ?? 0))
    .slice(0, 5)
    .map((l) => ({ id: l.id, nome: l.nome ?? "Loja", plano: l.planoNome ?? "Sem plano", valor: l.planoValor ?? 0, status: l.statusResolvido }));

  const [{ n: suporteNaoLidas }] = await db.select({ n: sql<string>`count(*)` }).from(suporteMensagens).where(and(eq(suporteMensagens.remetente, "loja"), eq(suporteMensagens.lida_suporte, false)));

  const totalLojas = lojasDetalhadas.length;

  return {
    admin: { nome: adminNome },
    kpis: {
      totalLojas,
      lojasAtivas: totalAtivas,
      receitaMes: Math.round(receitaMes * 100) / 100,
      lojasTrial: totalTrial,
      expira7,
      expira15,
      expira30,
      expiradas,
      comprovantesPendentes,
      outras: Math.max(0, totalLojas - totalAtivas - totalTrial - expiradas),
      suporteNaoLidas: Number(suporteNaoLidas),
    },
    cadastrosMes: cadastros,
    leads,
    destaque,
  };
}
