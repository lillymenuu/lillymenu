/*
 * Recurso do plano (chave de menu do sidebar) que cada API do painel exige. O proxy marca a rota
 * chamada no header x-lm-path e getSessaoAdmin() confere aqui: sem o recurso, a sessao vale como
 * inexistente e a rota responde 401, igual a quem nao esta logado.
 *
 * Cada regra lista as chaves que liberam a rota (basta uma). APIs usadas por varias telas aceitam
 * qualquer uma delas (ex.: o detalhe do pedido abre no Gestor, na Lista e nos Agendados). Rotas sem
 * regra (loja publica, garcom, login, assinatura, notificacoes, webhooks...) nao sao conferidas.
 * A primeira regra que casar vence, entao as excecoes ficam antes do prefixo geral.
 */

export const HEADER_ROTA_API = "x-lm-path";

const PEDIDOS = ["gestor", "pedidos", "pedidosAgendados", "pdv", "modoGarcom"];

const REGRAS: { prefixo: string; recursos: string[] | null }[] = [
  /* Excecoes: usadas fora da propria tela (menu lateral, PDV, orcamentos, app do garcom). */
  { prefixo: "/api/produtos/validade-check", recursos: null },
  { prefixo: "/api/whatslilly/nao-lidas", recursos: null },
  { prefixo: "/api/settings/detalhe", recursos: null },
  { prefixo: "/api/pos/cep-lookup", recursos: ["pdv", "orcamentos"] },
  { prefixo: "/api/cashcontrol/abrir", recursos: ["controleCaixa", "pdv"] },
  { prefixo: "/api/cashcontrol/resumo", recursos: ["controleCaixa", "pdv"] },
  { prefixo: "/api/clients/criar", recursos: ["clientes", "pdv", "controleFiado"] },
  { prefixo: "/api/nfce/cep", recursos: ["configuracoes", "nfce"] },
  { prefixo: "/api/waitermode/garcom-", recursos: null },
  { prefixo: "/api/waitermode/mesa-conta-dispensar", recursos: null },

  /* Dia a dia */
  { prefixo: "/api/pos/", recursos: ["pdv"] },
  { prefixo: "/api/ordermanager/", recursos: PEDIDOS },
  { prefixo: "/api/order-list", recursos: ["pedidos"] },
  { prefixo: "/api/scheduled-orders", recursos: ["pedidosAgendados"] },
  { prefixo: "/api/quotes", recursos: ["orcamentos"] },
  { prefixo: "/api/motoboys", recursos: ["motoboys"] },
  { prefixo: "/api/waitermode/", recursos: ["modoGarcom"] },
  { prefixo: "/api/waiter-report", recursos: ["modoGarcom"] },

  /* Catalogo */
  { prefixo: "/api/produtos", recursos: ["produtos"] },
  { prefixo: "/api/produto-duplicar", recursos: ["produtos"] },
  { prefixo: "/api/categorias", recursos: ["produtos"] },
  { prefixo: "/api/combos", recursos: ["produtos"] },
  { prefixo: "/api/product-complement", recursos: ["produtos"] },
  { prefixo: "/api/estoque-vinculo", recursos: ["produtos", "estoque"] },
  { prefixo: "/api/estoque", recursos: ["produtos", "estoque"] },
  { prefixo: "/api/stock", recursos: ["estoque"] },
  { prefixo: "/api/desperdicios", recursos: ["desperdicios"] },
  { prefixo: "/api/promotion", recursos: ["promo"] },

  /* Clientes */
  { prefixo: "/api/clients", recursos: ["clientes"] },
  { prefixo: "/api/coupons", recursos: ["cupons"] },
  { prefixo: "/api/loyaltyreports", recursos: ["fidelidade"] },

  /* Financeiro */
  { prefixo: "/api/cashcontrol", recursos: ["controleCaixa"] },
  { prefixo: "/api/storecredittracking", recursos: ["controleFiado"] },
  { prefixo: "/api/financial", recursos: ["financeiro"] },
  { prefixo: "/api/nfce/emitir", recursos: ["nfce"] },
  { prefixo: "/api/nfce/atualizar-status", recursos: ["nfce"] },
  { prefixo: "/api/nfce/relatorio", recursos: ["nfceReport", "nfce"] },
  { prefixo: "/api/nfce", recursos: ["nfce"] },

  /* Relatorios */
  { prefixo: "/api/sales", recursos: ["relatorios"] },
  { prefixo: "/api/saleschannels", recursos: ["relatorios"] },
  { prefixo: "/api/clientreports", recursos: ["relatorios"] },
  { prefixo: "/api/crosssellreport", recursos: ["crossSellRelatorio"] },
  { prefixo: "/api/dashboard-grafico", recursos: ["dashboard"] },

  /* Comunicacao */
  { prefixo: "/api/whatslilly", recursos: ["whatslilly"] },
  { prefixo: "/api/broadcastlist", recursos: ["listaTransmissao"] },

  /* Sistema */
  { prefixo: "/api/settings", recursos: ["configuracoes"] },
];

/** Recursos que liberam a rota (basta um), ou null quando a rota nao depende de recurso do plano. */
export function recursosExigidosApi(pathname: string): string[] | null {
  for (const r of REGRAS) {
    if (pathname === r.prefixo || pathname.startsWith(r.prefixo)) return r.recursos;
  }
  return null;
}
