import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { planos, configuracoes } from "@/db/schema";
import { buscarLojasComDetalhes, resolverStatusLoja, buscarLeadsRecentes } from "@/db/queries/superadminHelpers";

/* Equivalente de admin/api/v1/superadmin_lojas.php: tela "Lojas" do superadmin (leitura). */

const RECURSOS_CATEGORIAS: { titulo: string; itens: Record<string, string> }[] = [
  { titulo: "Dia a dia", itens: { "menu.pdv": "PDV (venda balcão)", "menu.gestor_pedidos": "Gestor de pedidos", "menu.pedidos": "Lista de pedidos", "menu.orcamentos": "Orçamentos", "menu.motoboys": "Motoboys", "menu.modo_garcom": "Modo Garçom" } },
  { titulo: "Catálogo", itens: { "menu.produtos": "Produtos", "menu.promo": "Promoções", "menu.estoque": "Estoque" } },
  { titulo: "Clientes", itens: { "menu.clientes": "Clientes (CRM)", "menu.relatorios_fidelidade": "Fidelidade", "menu.cupons": "Cupons" } },
  { titulo: "Financeiro", itens: { "menu.controle_caixa": "Controle de caixa", "menu.controle_fiado": "Controle de fiado", "menu.financeiro": "Financeiro" } },
  { titulo: "Relatórios", itens: { "menu.relatorios": "Relatórios (vendas)", "menu.relatorio_cross_sell": "Relatório de Cross-sell" } },
  { titulo: "Comunicação", itens: { "menu.whatslilly": "WhatsLilly", "menu.lista_transmissao": "Lista de Transmissão" } },
  { titulo: "Sistema", itens: { "menu.configuracoes": "Configurações", "menu.cross_sell_config": "Configurações do Cross-sell" } },
];

export type PlanoSaas = { id: number; nome: string; valor: number; recursos: string[] | null };

export type LojaListagem = {
  id: number;
  nome: string;
  ativo: boolean;
  criadoEm: string | null;
  status: string;
  emTeste: boolean;
  trialInicio: string | null;
  trialFim: string | null;
  expiraEm: string | null;
  expiraDias: number | null;
  contato: string;
  admin: { id: number; nome: string; email: string; usuario: string };
  planoId: number;
  planoNome: string | null;
  planoValor: number | null;
  planoDesejado: string | null;
  cobranca: { id: number; status: string; valor: number | null; vencimento: string | null; comprovante: string | null; comprovanteEm: string | null; motivoRejeicao: string | null; aguardandoRevisao: boolean; aprovado: boolean };
};

export type ListagemLojasSuperadmin = {
  lojas: LojaListagem[];
  leads: Awaited<ReturnType<typeof buscarLeadsRecentes>>;
  planos: PlanoSaas[];
  categorias: { titulo: string; itens: { chave: string; label: string }[] }[];
  config: { pixChave: string; pixNome: string; whatsNumero: string; nominatimAtivo: boolean };
};

export async function listagemLojasSuperadmin(): Promise<ListagemLojasSuperadmin> {
  const planosLinhas = await db
    .select({ id: planos.id, nome: planos.nome, valor: planos.valor, recursosJson: planos.recursos_json })
    .from(planos)
    .where(eq(planos.ativo, true))
    .orderBy(sql`${planos.landing_slug} is null`, planos.landing_slug);

  const planosSaas: PlanoSaas[] = planosLinhas.map((p) => {
    let recursos: string[] | null = null;
    if (p.recursosJson !== null) {
      try {
        const decoded = JSON.parse(p.recursosJson);
        recursos = Array.isArray(decoded) ? decoded : null;
      } catch {
        recursos = null;
      }
    }
    return { id: p.id, nome: p.nome, valor: p.valor, recursos };
  });

  const categorias = RECURSOS_CATEGORIAS.map((c) => ({ titulo: c.titulo, itens: Object.entries(c.itens).map(([chave, label]) => ({ chave, label })) }));

  const chavesGlobais = ["saas_pix_chave", "saas_pix_nome", "saas_whatsapp_numero", "saas_nominatim_ativo"];
  const configLinhas = await db.select({ chave: configuracoes.chave, valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, 0), inArray(configuracoes.chave, chavesGlobais)));
  const config = { pixChave: "", pixNome: "", whatsNumero: "", nominatimAtivo: false };
  for (const row of configLinhas) {
    if (row.chave === "saas_pix_chave") config.pixChave = row.valor;
    if (row.chave === "saas_pix_nome") config.pixNome = row.valor;
    if (row.chave === "saas_whatsapp_numero") config.whatsNumero = row.valor;
    if (row.chave === "saas_nominatim_ativo") config.nominatimAtivo = row.valor === "1";
  }

  const hoje = new Date();
  const lojasDetalhadas = await buscarLojasComDetalhes();
  const lojasListagem: LojaListagem[] = lojasDetalhadas.map((l) => {
    const r = resolverStatusLoja(l, hoje);
    const temComprovante = Boolean(r.comprovanteArquivo);
    const cobStatus = r.cobrancaStatus ?? "";
    return {
      id: r.id,
      nome: r.nome ?? "",
      ativo: Boolean(r.ativo),
      criadoEm: r.criadoEm,
      status: r.statusResolvido,
      emTeste: r.isTrialPeriodo || r.statusResolvido === "trial",
      trialInicio: r.trialInicio,
      trialFim: r.trialFim,
      expiraEm: r.expiraEm,
      expiraDias: r.expiraDias,
      contato: r.lojaContato ?? "",
      admin: { id: r.adminId ?? 0, nome: r.adminNome ?? "", email: r.adminEmail ?? "", usuario: r.adminUsuario ?? "" },
      planoId: r.planoId ?? 0,
      planoNome: r.planoNome,
      planoValor: r.planoValor,
      planoDesejado: !r.status ? r.planoDesejadoNome : null,
      cobranca: {
        id: r.cobrancaId ?? 0,
        status: cobStatus,
        valor: r.cobrancaValor,
        vencimento: r.cobrancaVencimento,
        comprovante: temComprovante ? r.comprovanteArquivo : null,
        comprovanteEm: r.comprovanteEnviadoEm,
        motivoRejeicao: r.motivoRejeicao,
        aguardandoRevisao: temComprovante && (cobStatus === "pendente" || cobStatus === "atrasado"),
        aprovado: temComprovante && cobStatus === "pago",
      },
    };
  });

  const leads = await buscarLeadsRecentes();

  return { lojas: lojasListagem, leads, planos: planosSaas, categorias, config };
}
