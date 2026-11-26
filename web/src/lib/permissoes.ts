/*
 * Catalogo das permissoes que um nivel de acesso pode liberar (tela /settings/permissions).
 *
 * Cada permissao e uma chave "menu.*" (a mesma do menu lateral e do plano). Ela libera a tela no
 * menu E as APIs dela: getSessaoAdmin() recusa a chamada de API sem a chave (lib/recursosApi) e cada
 * page.tsx chama exigirRecurso(). Ou seja, o bloqueio vale no servidor, nao so escondendo o menu.
 *
 * O servidor so grava chaves que estao neste catalogo (o resto e descartado).
 */

export type PermissaoOpcao = { chave: string; rotulo: string };
export type PermissaoGrupo = { titulo: string; descricao: string; opcoes: PermissaoOpcao[] };

export const GRUPOS_PERMISSOES: PermissaoGrupo[] = [
  {
    titulo: "Pedidos",
    descricao: "Lançar, acompanhar e consultar pedidos.",
    opcoes: [
      { chave: "menu.dashboard", rotulo: "Dashboard" },
      { chave: "menu.pdv", rotulo: "Pedidos (PDV)" },
      { chave: "menu.gestor_pedidos", rotulo: "Gestor de pedidos" },
      { chave: "menu.pedidos", rotulo: "Lista de pedidos" },
      { chave: "menu.pedidos_agendados", rotulo: "Agendamentos" },
      { chave: "menu.orcamentos", rotulo: "Gerar orçamentos" },
    ],
  },
  {
    titulo: "Catálogo",
    descricao: "Produtos, complementos, promoções e estoque.",
    opcoes: [
      { chave: "menu.produtos", rotulo: "Produtos e complementos" },
      { chave: "menu.promo", rotulo: "Promo" },
      { chave: "menu.estoque", rotulo: "Estoque" },
      { chave: "menu.desperdicios", rotulo: "Desperdícios" },
    ],
  },
  {
    titulo: "Clientes e fidelidade",
    descricao: "Cadastro de clientes, cupons e programa de fidelidade.",
    opcoes: [
      { chave: "menu.clientes", rotulo: "Clientes" },
      { chave: "menu.cupons", rotulo: "Cupons" },
      { chave: "menu.relatorios_fidelidade", rotulo: "Relatório de fidelidade" },
    ],
  },
  {
    titulo: "Relatórios",
    descricao: "Relatórios de vendas e de desempenho.",
    opcoes: [
      { chave: "menu.relatorios", rotulo: "Vendas, canais de venda e relatório de clientes" },
      { chave: "menu.relatorio_cross_sell", rotulo: "Relatório de cross-sell" },
    ],
  },
  {
    titulo: "Financeiro",
    descricao: "Caixa, fiado, lançamentos e notas fiscais.",
    opcoes: [
      { chave: "menu.controle_caixa", rotulo: "Controle de caixa" },
      { chave: "menu.controle_fiado", rotulo: "Controle de fiado" },
      { chave: "menu.financeiro", rotulo: "Financeiro (dashboard, lançamentos, contas e DRE)" },
      { chave: "menu.nfce", rotulo: "NFC-e (emissão e notas emitidas)" },
    ],
  },
  {
    titulo: "Equipe e entregas",
    descricao: "Motoboys e atendimento nas mesas.",
    opcoes: [
      { chave: "menu.motoboys", rotulo: "Motoboys" },
      { chave: "menu.modo_garcom", rotulo: "Modo garçom e relatório de garçons" },
    ],
  },
  {
    titulo: "Comunicação",
    descricao: "Atendimento no WhatsApp e divulgação.",
    opcoes: [
      { chave: "menu.whatslilly", rotulo: "WhatsLilly" },
      { chave: "menu.lista_transmissao", rotulo: "Lista de transmissão" },
      { chave: "menu.midia_indoor", rotulo: "Mídia indoor" },
    ],
  },
  {
    titulo: "Configurações",
    descricao: "Ajustes da loja. Usuários e permissões continuam só com o administrador principal.",
    opcoes: [
      { chave: "menu.configuracoes", rotulo: "Configurações da loja" },
      { chave: "menu.cross_sell_config", rotulo: "Configurar cross-sell" },
    ],
  },
];

export const CHAVES_PERMISSOES: string[] = GRUPOS_PERMISSOES.flatMap((g) => g.opcoes.map((o) => o.chave));

/** Niveis padrao do sistema (iguais para todas as lojas, nao editaveis). */
export const NIVEIS_PADRAO_INFO: Record<string, { nome: string; descricao: string; acessoTotal: boolean }> = {
  "nivel-1": { nome: "Admin", descricao: "Acesso total ao sistema", acessoTotal: true },
  "nivel-2": { nome: "Garçom", descricao: "PDV, gestor de pedidos e clientes", acessoTotal: false },
  "nivel-3": { nome: "Relatórios", descricao: "Consulta de relatórios", acessoTotal: false },
};

export type NivelAcesso = {
  id: number;
  nome: string;
  padrao: boolean;
  acessoTotal: boolean;
  descricao: string;
  permissoes: string[];
  usuarios: number;
};
