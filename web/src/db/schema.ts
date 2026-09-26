/*
 * Esquema PostgreSQL (Neon) do Lilly Menu — gerado a partir do dump MariaDB de producao
 * (somente estrutura). Convencoes:
 *  - chaves das colunas em snake_case (iguais ao MySQL/PHP), para manter o formato JSON das APIs.
 *  - tinyint(1)/(4) -> boolean; decimal -> numeric (mode number); datetime/timestamp -> timestamp
 *    sem fuso em modo "string" ("YYYY-MM-DD HH:MM:SS"), preservando o horario gravado.
 *  - enum -> text com tipo TypeScript (validacao na aplicacao).
 *  - AUTO_INCREMENT -> identity "by default" (preserva os ids na migracao dos dados).
 */
import { bigint, boolean, char, date, foreignKey, index, integer, numeric, pgTable, primaryKey, smallint, text, time, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const admins = pgTable(
  "admins",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 100 }),
    usuario: varchar("usuario", { length: 50 }),
    perfil: varchar("perfil", { length: 30 }).notNull().default("admin"),
    email: varchar("email", { length: 100 }),
    senha: varchar("senha", { length: 255 }),
    codigo_acesso: varchar("codigo_acesso", { length: 10 }),
    google_id: varchar("google_id", { length: 64 }),
    ativo: boolean("ativo").default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
    reset_token: varchar("reset_token", { length: 255 }),
    reset_expira: timestamp("reset_expira", { mode: "string" }),
    loja_id: integer("loja_id").notNull().default(1),
    foto: varchar("foto", { length: 255 }),
  },
  (t) => [
    unique("admins_email").on(t.email),
    unique("admins_usuario").on(t.usuario),
    unique("admins_idx_admins_codigo_acesso").on(t.codigo_acesso),
    index("admins_idx_admins_google_id").on(t.google_id),
  ]
);

export const adminApiTokens = pgTable(
  "admin_api_tokens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    admin_id: integer("admin_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    token_hash: char("token_hash", { length: 64 }).notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    expira_em: timestamp("expira_em", { mode: "string" }).notNull(),
  },
  (t) => [
    unique("admin_api_tokens_uq_token_hash").on(t.token_hash),
    index("admin_api_tokens_idx_admin").on(t.admin_id),
  ]
);

/** Sessao do app do garcom (/[slug]/garcom) — mesmo desenho do admin_api_tokens, token separado da sessao do lojista. */
export const garcomApiTokens = pgTable(
  "garcom_api_tokens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    garcom_id: integer("garcom_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    token_hash: char("token_hash", { length: 64 }).notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    expira_em: timestamp("expira_em", { mode: "string" }).notNull(),
  },
  (t) => [
    unique("garcom_api_tokens_uq_token_hash").on(t.token_hash),
    index("garcom_api_tokens_idx_garcom").on(t.garcom_id),
  ]
);

export const assinaturas = pgTable(
  "assinaturas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    plano_id: integer("plano_id").notNull(),
    status: text("status").$type<"trial" | "ativa" | "suspensa" | "cancelada">().notNull().default("trial"),
    trial_inicio: date("trial_inicio", { mode: "string" }),
    trial_fim: date("trial_fim", { mode: "string" }),
    ciclo_inicio: date("ciclo_inicio", { mode: "string" }),
    ciclo_fim: date("ciclo_fim", { mode: "string" }),
    bloqueada_em: timestamp("bloqueada_em", { mode: "string" }),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("assinaturas_idx_assinatura_loja").on(t.loja_id),
    index("assinaturas_idx_assinatura_status").on(t.status),
  ]
);

export const avaliacoes = pgTable(
  "avaliacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    pedido_id: integer("pedido_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    cliente_id: integer("cliente_id"),
    nota: smallint("nota").notNull(),
    descricao: text("descricao"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("avaliacoes_uq_pedido").on(t.pedido_id, t.loja_id),
  ]
);

export const caixaMovimentacoes = pgTable(
  "caixa_movimentacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    caixa_id: integer("caixa_id").notNull(),
    operador_id: integer("operador_id").notNull(),
    tipo: text("tipo").$type<"suprimento" | "sangria">().notNull(),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    observacoes: varchar("observacoes", { length: 120 }),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("caixa_movimentacoes_idx_caixa").on(t.caixa_id),
    index("caixa_movimentacoes_idx_operador").on(t.operador_id),
    index("caixa_movimentacoes_idx_data").on(t.criado_em),
  ]
);

export const caixaTurnos = pgTable(
  "caixa_turnos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    operador_id: integer("operador_id"),
    status: text("status").$type<"aberto" | "fechado">().notNull().default("aberto"),
    saldo_inicial: numeric("saldo_inicial", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    saldo_final: numeric("saldo_final", { precision: 10, scale: 2, mode: "number" }),
    aberto_em: timestamp("aberto_em", { mode: "string" }).notNull().defaultNow(),
    fechado_em: timestamp("fechado_em", { mode: "string" }),
    obs_abertura: text("obs_abertura"),
    obs_fechamento: text("obs_fechamento"),
    loja_id: integer("loja_id").notNull().default(1),
  }
);

export const cashbackMovimentacoes = pgTable(
  "cashback_movimentacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    cliente_id: integer("cliente_id").notNull(),
    pedido_id: integer("pedido_id"),
    tipo: text("tipo").$type<"entrada" | "uso" | "expirado" | "ajuste" | "pendente">().notNull(),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    saldo_antes: numeric("saldo_antes", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    saldo_depois: numeric("saldo_depois", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    expira_em: date("expira_em", { mode: "string" }),
    disponivel_em: timestamp("disponivel_em", { mode: "string" }),
    referencia_id: integer("referencia_id"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("cashback_movimentacoes_idx_cashback_cliente").on(t.cliente_id),
    index("cashback_movimentacoes_idx_cashback_pedido").on(t.pedido_id),
    index("cashback_movimentacoes_idx_cashback_tipo").on(t.tipo),
    index("cashback_movimentacoes_idx_cashback_expira").on(t.expira_em),
    index("cashback_movimentacoes_idx_cashback_ref").on(t.referencia_id),
  ]
);

export const categorias = pgTable(
  "categorias",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 100 }),
    ordem: integer("ordem").default(0),
    ativo: boolean("ativo").default(true),
    loja_id: integer("loja_id").notNull().default(1),
    modo_exibicao: varchar("modo_exibicao", { length: 20 }).notNull().default("vertical"),
    dias_semana: text("dias_semana"),
    horario_ini: varchar("horario_ini", { length: 5 }),
    horario_fim: varchar("horario_fim", { length: 5 }),
  }
);

export const clientes = pgTable(
  "clientes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 100 }),
    telefone: varchar("telefone", { length: 20 }),
    endereco: text("endereco"),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
    email: varchar("email", { length: 150 }),
    pontos: integer("pontos").default(0),
    nivel: text("nivel").$type<"Bronze" | "Prata" | "Ouro" | "VIP">().default("Bronze"),
    aniversario: date("aniversario", { mode: "string" }),
    cep: varchar("cep", { length: 20 }),
    rua: varchar("rua", { length: 255 }),
    numero: varchar("numero", { length: 20 }),
    bairro: varchar("bairro", { length: 100 }),
    cidade: varchar("cidade", { length: 100 }),
    estado: varchar("estado", { length: 50 }),
    complemento: varchar("complemento", { length: 255 }),
    cashback_saldo: numeric("cashback_saldo", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    pontos_saldo: integer("pontos_saldo").notNull().default(0),
    loja_id: integer("loja_id").notNull().default(1),
    saldo_fiado: numeric("saldo_fiado", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  }
);

export const cobrancas = pgTable(
  "cobrancas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    assinatura_id: integer("assinatura_id").notNull(),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    vencimento: date("vencimento", { mode: "string" }).notNull(),
    status: text("status").$type<"pendente" | "pago" | "atrasado">().notNull().default("pendente"),
    pago_em: timestamp("pago_em", { mode: "string" }),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    comprovante_arquivo: varchar("comprovante_arquivo", { length: 255 }),
    comprovante_enviado_em: timestamp("comprovante_enviado_em", { mode: "string" }),
    motivo_rejeicao: varchar("motivo_rejeicao", { length: 255 }),
    origem: text("origem").$type<"manual" | "mercadopago">().notNull().default("manual"),
    mp_payment_id: varchar("mp_payment_id", { length: 64 }),
    mp_qr_code: text("mp_qr_code"),
    mp_qr_code_base64: text("mp_qr_code_base64"),
    mp_expiracao: timestamp("mp_expiracao", { mode: "string" }),
  },
  (t) => [
    unique("cobrancas_uq_cobrancas_mp_payment_id").on(t.mp_payment_id),
    index("cobrancas_idx_cobranca_assinatura").on(t.assinatura_id),
    index("cobrancas_idx_cobranca_status").on(t.status),
  ]
);

export const combos = pgTable(
  "combos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    categoria_id: integer("categoria_id"),
    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    imagem: varchar("imagem", { length: 500 }),
    tipo_preco: text("tipo_preco").$type<"por_combo" | "por_item">().notNull().default("por_combo"),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    preco_promocional: numeric("preco_promocional", { precision: 10, scale: 2, mode: "number" }),
    promo_desativado: boolean("promo_desativado").notNull().default(false),
    ativo: boolean("ativo").notNull().default(true),
    ordem: integer("ordem"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("combos_idx_combos_loja").on(t.loja_id),
    index("combos_idx_combos_categoria").on(t.categoria_id),
  ]
);

export const comboPassos = pgTable(
  "combo_passos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    combo_id: integer("combo_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    obrigatorio: boolean("obrigatorio").notNull().default(true),
    min_itens: integer("min_itens").notNull().default(1),
    max_itens: integer("max_itens").notNull().default(1),
    permite_repetir: boolean("permite_repetir").notNull().default(false),
    ordem: integer("ordem"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("combo_passos_idx_cp_combo").on(t.combo_id),
    index("combo_passos_idx_cp_loja").on(t.loja_id),
  ]
);

export const comboPassoOpcoes = pgTable(
  "combo_passo_opcoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    passo_id: integer("passo_id").notNull(),
    combo_id: integer("combo_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    produto_id: integer("produto_id").notNull(),
    preco_adicional: numeric("preco_adicional", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    ordem: integer("ordem"),
  },
  (t) => [
    index("combo_passo_opcoes_idx_cpo_passo").on(t.passo_id),
    index("combo_passo_opcoes_idx_cpo_combo").on(t.combo_id),
    index("combo_passo_opcoes_idx_cpo_loja").on(t.loja_id),
  ]
);

export const complementosGrupos = pgTable(
  "complementos_grupos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 120 }).notNull(),
    descricao: varchar("descricao", { length: 255 }),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    opcional: boolean("opcional").notNull().default(true),
    obrigatorio: boolean("obrigatorio").notNull().default(false),
    quantidade_minima: integer("quantidade_minima").notNull().default(0),
    quantidade_maxima: integer("quantidade_maxima").notNull().default(0),
    loja_id: integer("loja_id").notNull().default(1),
  }
);

export const complementosGruposCategorias = pgTable(
  "complementos_grupos_categorias",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    grupo_id: integer("grupo_id").notNull(),
    categoria_id: integer("categoria_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("complementos_grupos_categorias_uniq_comp_grupo_cat").on(t.grupo_id, t.categoria_id),
    index("complementos_grupos_categorias_idx_comp_grupo_cat_grupo").on(t.grupo_id),
    index("complementos_grupos_categorias_idx_comp_grupo_cat_cat").on(t.categoria_id),
    index("complementos_grupos_categorias_idx_comp_grupo_cat_loja").on(t.loja_id),
    foreignKey({ columns: [t.grupo_id], foreignColumns: [complementosGrupos.id], name: "complementos_grupos_categorias_fk_comp_grupo_cat_grupo" }).onDelete("cascade"),
  ]
);

export const complementosGruposProdutos = pgTable(
  "complementos_grupos_produtos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    grupo_id: integer("grupo_id").notNull(),
    produto_id: integer("produto_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("complementos_grupos_produtos_uniq_comp_grupo_prod").on(t.grupo_id, t.produto_id),
    index("complementos_grupos_produtos_idx_comp_grupo_prod_grupo").on(t.grupo_id),
    index("complementos_grupos_produtos_idx_comp_grupo_prod_prod").on(t.produto_id),
    index("complementos_grupos_produtos_idx_comp_grupo_prod_loja").on(t.loja_id),
    foreignKey({ columns: [t.grupo_id], foreignColumns: [complementosGrupos.id], name: "complementos_grupos_produtos_fk_comp_grupo_prod_grupo" }).onDelete("cascade"),
  ]
);

export const complementosItens = pgTable(
  "complementos_itens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    grupo_id: integer("grupo_id").notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    descricao: varchar("descricao", { length: 255 }),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    pode_repetir: boolean("pode_repetir").notNull().default(true),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    ordem: integer("ordem").notNull().default(0),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("complementos_itens_idx_comp_grupo").on(t.grupo_id),
    foreignKey({ columns: [t.grupo_id], foreignColumns: [complementosGrupos.id], name: "complementos_itens_fk_comp_grupo" }).onDelete("cascade"),
  ]
);

export const configuracoes = pgTable(
  "configuracoes",
  {
    chave: varchar("chave", { length: 50 }).notNull(),
    valor: text("valor").notNull(),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.loja_id, t.chave] }),
  ]
);

export const cupons = pgTable(
  "cupons",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    codigo: varchar("codigo", { length: 15 }).notNull(),
    tipo: text("tipo").$type<"percent" | "valor" | "frete">().notNull().default("percent"),
    desconto: numeric("desconto", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    minimo: numeric("minimo", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    quantidade_total: integer("quantidade_total").notNull().default(0),
    quantidade_usada: integer("quantidade_usada").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    primeira_compra: boolean("primeira_compra").notNull().default(false),
    publico: boolean("publico").notNull().default(false),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    unique("cupons_codigo").on(t.codigo),
  ]
);

export const entradaSaidaBancos = pgTable(
  "entrada_saida_bancos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    nome: varchar("nome", { length: 120 }).notNull(),
    saldo_atual: numeric("saldo_atual", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("entrada_saida_bancos_idx_entrada_saida_bancos_loja").on(t.loja_id),
  ]
);

export const entradaSaidaCategorias = pgTable(
  "entrada_saida_categorias",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    nome: varchar("nome", { length: 120 }).notNull(),
    tipo: text("tipo").$type<"entrada" | "saida" | "ambos">().notNull().default("ambos"),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("entrada_saida_categorias_uniq_entrada_saida_categoria_loja_nome").on(t.loja_id, t.nome),
    index("entrada_saida_categorias_idx_entrada_saida_categorias_loja").on(t.loja_id),
  ]
);

export const entradaSaidaFormas = pgTable(
  "entrada_saida_formas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    nome: varchar("nome", { length: 120 }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("entrada_saida_formas_uniq_entrada_saida_forma_loja_nome").on(t.loja_id, t.nome),
    index("entrada_saida_formas_idx_entrada_saida_formas_loja").on(t.loja_id),
  ]
);

export const entradaSaidaLancamentos = pgTable(
  "entrada_saida_lancamentos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    tipo: text("tipo").$type<"entrada" | "saida">().notNull().default("entrada"),
    data_lancamento: date("data_lancamento", { mode: "string" }).notNull(),
    descricao: varchar("descricao", { length: 180 }).notNull(),
    quantidade: integer("quantidade").notNull().default(1),
    desconto: numeric("desconto", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    forma_id: integer("forma_id"),
    categoria_id: integer("categoria_id"),
    subcategoria_id: integer("subcategoria_id"),
    banco_id: integer("banco_id"),
    criado_por: integer("criado_por"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("entrada_saida_lancamentos_idx_entrada_saida_lancamentos_loja").on(t.loja_id),
    index("entrada_saida_lancamentos_idx_entrada_saida_lancamentos_data").on(t.data_lancamento),
    index("entrada_saida_lancamentos_idx_entrada_saida_lancamentos_tipo").on(t.tipo),
  ]
);

export const entradaSaidaSubcategorias = pgTable(
  "entrada_saida_subcategorias",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    categoria_id: integer("categoria_id").notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("entrada_saida_subcategorias_uniq_entrada_saida_subcategoria_loj").on(t.loja_id, t.categoria_id, t.nome),
    index("entrada_saida_subcategorias_idx_entrada_saida_subcategorias_loj").on(t.loja_id),
    index("entrada_saida_subcategorias_idx_entrada_saida_subcategorias_cat").on(t.categoria_id),
  ]
);

export const estoque = pgTable(
  "estoque",
  {
    produto_id: integer("produto_id").notNull().primaryKey(),
    quantidade: integer("quantidade").notNull().default(0),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }).defaultNow(), // ON UPDATE CURRENT_TIMESTAMP no MySQL: atualizar na aplicacao
    quantidade_minima: integer("quantidade_minima").notNull().default(0),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    foreignKey({ columns: [t.produto_id], foreignColumns: [produtos.id], name: "estoque_fk_estoque_produto" }).onDelete("cascade"),
  ]
);

export const estoqueGrupos = pgTable(
  "estoque_grupos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  }
);

export const estoqueGrupoMembros = pgTable(
  "estoque_grupo_membros",
  {
    produto_id: integer("produto_id").notNull().primaryKey(),
    grupo_id: integer("grupo_id").notNull(),
    loja_id: integer("loja_id").notNull(),
  },
  (t) => [
    index("estoque_grupo_membros_idx_egm_grupo").on(t.grupo_id, t.loja_id),
  ]
);

export const estoqueMovimentacoes = pgTable(
  "estoque_movimentacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    produto_id: integer("produto_id").notNull(),
    tipo: text("tipo").$type<"entrada" | "saida">().notNull(),
    quantidade: integer("quantidade").notNull(),
    origem: varchar("origem", { length: 50 }),
    referencia_id: integer("referencia_id"),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("estoque_movimentacoes_fk_mov_produto").on(t.produto_id),
    foreignKey({ columns: [t.produto_id], foreignColumns: [produtos.id], name: "estoque_movimentacoes_fk_mov_produto" }).onDelete("cascade"),
  ]
);

export const fiadoLancamentos = pgTable(
  "fiado_lancamentos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    cliente_id: integer("cliente_id").notNull(),
    pedido_id: integer("pedido_id"),
    operador_id: integer("operador_id"),
    tipo: text("tipo").$type<"venda" | "pagamento">().notNull(),
    forma_pagamento: varchar("forma_pagamento", { length: 30 }),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull(),
    saldo_antes: numeric("saldo_antes", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    saldo_depois: numeric("saldo_depois", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    observacao: varchar("observacao", { length: 255 }),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("fiado_lancamentos_idx_loja_cliente").on(t.loja_id, t.cliente_id),
  ]
);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    tenant_id: integer("tenant_id").notNull().default(1),
    name: varchar("name", { length: 160 }).notNull(),
    initial_balance: numeric("initial_balance", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    current_balance: numeric("current_balance", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { mode: "string" }),
  },
  (t) => [
    unique("financial_accounts_uniq_financial_accounts_tenant_name").on(t.tenant_id, t.name),
    index("financial_accounts_idx_financial_accounts_tenant").on(t.tenant_id),
  ]
);

export const financialCategories = pgTable(
  "financial_categories",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    tenant_id: integer("tenant_id").notNull().default(1),
    name: varchar("name", { length: 160 }).notNull(),
    type: text("type").$type<"income" | "expense">().notNull(),
    parent_id: integer("parent_id"),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { mode: "string" }),
  },
  (t) => [
    unique("financial_categories_uniq_financial_categories_tenant_name_type").on(t.tenant_id, t.name, t.type, t.parent_id),
    index("financial_categories_idx_financial_categories_tenant").on(t.tenant_id),
    index("financial_categories_idx_financial_categories_parent").on(t.parent_id),
    index("financial_categories_idx_financial_categories_type").on(t.type),
    foreignKey({ columns: [t.parent_id], foreignColumns: [t.id], name: "financial_categories_fk_financial_categories_parent" }).onDelete("set null").onUpdate("cascade"),
  ]
);

export const financialTransactions = pgTable(
  "financial_transactions",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    tenant_id: integer("tenant_id").notNull().default(1),
    order_id: integer("order_id"),
    account_id: integer("account_id").notNull(),
    category_id: integer("category_id").notNull(),
    payment_method_id: integer("payment_method_id"),
    type: text("type").$type<"income" | "expense">().notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" }).notNull().default(0),
    transaction_date: date("transaction_date", { mode: "string" }).notNull(),
    reference_month: smallint("reference_month").notNull(),
    reference_year: smallint("reference_year").notNull(),
    notes: text("notes"),
    created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { mode: "string" }),
  },
  (t) => [
    unique("financial_transactions_uniq_financial_transactions_sale_payment").on(t.tenant_id, t.order_id, t.payment_method_id, t.type),
    index("financial_transactions_idx_financial_transactions_tenant").on(t.tenant_id),
    index("financial_transactions_idx_financial_transactions_account").on(t.account_id),
    index("financial_transactions_idx_financial_transactions_category").on(t.category_id),
    index("financial_transactions_idx_financial_transactions_payment_metho").on(t.payment_method_id),
    index("financial_transactions_idx_financial_transactions_date").on(t.transaction_date),
    index("financial_transactions_idx_financial_transactions_reference").on(t.reference_year, t.reference_month),
    index("financial_transactions_idx_financial_transactions_type").on(t.type),
    index("financial_transactions_idx_financial_transactions_order").on(t.order_id),
    foreignKey({ columns: [t.account_id], foreignColumns: [financialAccounts.id], name: "financial_transactions_fk_financial_transactions_account" }).onUpdate("cascade"),
    foreignKey({ columns: [t.category_id], foreignColumns: [financialCategories.id], name: "financial_transactions_fk_financial_transactions_category" }).onUpdate("cascade"),
    foreignKey({ columns: [t.payment_method_id], foreignColumns: [paymentMethods.id], name: "financial_transactions_fk_financial_transactions_payment_method" }).onDelete("set null").onUpdate("cascade"),
  ]
);

export const garcons = pgTable(
  "garcons",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    email: varchar("email", { length: 150 }).notNull(),
    codigo_acesso_hash: varchar("codigo_acesso_hash", { length: 255 }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("garcons_uq_garcom_loja_email").on(t.loja_id, t.email),
    index("garcons_idx_garcons_loja").on(t.loja_id),
  ]
);

export const landingConfig = pgTable(
  "landing_config",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    chave: varchar("chave", { length: 80 }).notNull(),
    valor: text("valor").notNull(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }).notNull().defaultNow(), // ON UPDATE CURRENT_TIMESTAMP no MySQL: atualizar na aplicacao
  },
  (t) => [
    unique("landing_config_uniq_chave").on(t.chave),
  ]
);

export const leadsEspecialista = pgTable(
  "leads_especialista",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    telefone: varchar("telefone", { length: 30 }).notNull(),
    empresa: varchar("empresa", { length: 160 }).notNull(),
    faturamento: varchar("faturamento", { length: 120 }),
    modelo_negocio: varchar("modelo_negocio", { length: 120 }),
    aceite_whatsapp: boolean("aceite_whatsapp").notNull().default(false),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  }
);

export const leadsLojas = pgTable(
  "leads_lojas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 160 }).notNull(),
    empresa: varchar("empresa", { length: 160 }).notNull(),
    email: varchar("email", { length: 160 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 30 }).notNull(),
    cnpj: varchar("cnpj", { length: 20 }).notNull(),
    cep: varchar("cep", { length: 12 }).notNull(),
    rua: varchar("rua", { length: 160 }).notNull(),
    numero: varchar("numero", { length: 20 }).notNull(),
    bairro: varchar("bairro", { length: 120 }).notNull(),
    cidade: varchar("cidade", { length: 120 }).notNull(),
    estado: varchar("estado", { length: 10 }).notNull(),
    complemento: varchar("complemento", { length: 160 }),
    faturamento: varchar("faturamento", { length: 120 }),
    segmento: varchar("segmento", { length: 120 }),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("leads_lojas_idx_leads_email").on(t.email),
  ]
);

export const listasTransmissao = pgTable(
  "listas_transmissao",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    nome: varchar("nome", { length: 160 }).notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("listas_transmissao_idx_lt_loja").on(t.loja_id),
  ]
);

export const listasTransmissaoEnvios = pgTable(
  "listas_transmissao_envios",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    lista_id: integer("lista_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    mensagem: text("mensagem").notNull(),
    total_destinatarios: integer("total_destinatarios").notNull().default(0),
    total_enviados: integer("total_enviados").notNull().default(0),
    total_falhas: integer("total_falhas").notNull().default(0),
    status: text("status").$type<"em_andamento" | "concluido">().notNull().default("em_andamento"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    finalizado_em: timestamp("finalizado_em", { mode: "string" }),
  },
  (t) => [
    index("listas_transmissao_envios_idx_lte_lista").on(t.lista_id),
    foreignKey({ columns: [t.lista_id], foreignColumns: [listasTransmissao.id], name: "listas_transmissao_envios_fk_lte_lista" }).onDelete("cascade"),
  ]
);

export const listasTransmissaoMembros = pgTable(
  "listas_transmissao_membros",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    lista_id: integer("lista_id").notNull(),
    cliente_id: integer("cliente_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("listas_transmissao_membros_uq_lista_cliente").on(t.lista_id, t.cliente_id),
    index("listas_transmissao_membros_idx_ltm_lista").on(t.lista_id),
    foreignKey({ columns: [t.lista_id], foreignColumns: [listasTransmissao.id], name: "listas_transmissao_membros_fk_ltm_lista" }).onDelete("cascade"),
  ]
);

export const lojas = pgTable(
  "lojas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 100 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    endereco: text("endereco"),
    horario_funcionamento: varchar("horario_funcionamento", { length: 100 }),
    ativo: boolean("ativo").default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    plano_id: integer("plano_id"),
  }
);

export const lojaEventos = pgTable(
  "loja_eventos",
  {
    id: bigint("id", { mode: "number" }).generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    tipo: varchar("tipo", { length: 20 }).notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    visitante: varchar("visitante", { length: 40 }),
  },
  (t) => [
    index("loja_eventos_idx_loja_tipo_data").on(t.loja_id, t.tipo, t.criado_em),
  ]
);

export const materiaPrimaCadastros = pgTable(
  "materia_prima_cadastros",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull().default(1),
    nome_produto: varchar("nome_produto", { length: 180 }).notNull(),
    data_compra: date("data_compra", { mode: "string" }).notNull(),
    valor_unitario: numeric("valor_unitario", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    quantidade: numeric("quantidade", { precision: 10, scale: 3, mode: "number" }).notNull().default(1),
    unidade: varchar("unidade", { length: 40 }).notNull().default("unidade"),
    desconto: numeric("desconto", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    categoria_id: integer("categoria_id"),
    subcategoria_id: integer("subcategoria_id"),
    fornecedor: varchar("fornecedor", { length: 160 }),
    observacao: text("observacao"),
    valor_total: numeric("valor_total", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    criado_por: integer("criado_por"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("materia_prima_cadastros_idx_materia_prima_loja").on(t.loja_id),
    index("materia_prima_cadastros_idx_materia_prima_data").on(t.data_compra),
    index("materia_prima_cadastros_idx_materia_prima_categoria").on(t.categoria_id),
    index("materia_prima_cadastros_idx_materia_prima_subcategoria").on(t.subcategoria_id),
  ]
);

export const mesas = pgTable(
  "mesas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    nome: varchar("nome", { length: 60 }).notNull(),
    cliente_id: integer("cliente_id"),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("mesas_idx_mesas_loja").on(t.loja_id),
    index("mesas_idx_mesas_ativo").on(t.loja_id, t.ativo),
  ]
);

export const motoboys = pgTable(
  "motoboys",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    nome: varchar("nome", { length: 160 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 30 }).notNull(),
    data_cadastro: date("data_cadastro", { mode: "string" }).notNull(),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("motoboys_idx_motoboys_loja").on(t.loja_id),
    index("motoboys_idx_motoboys_ativo").on(t.loja_id, t.ativo),
  ]
);

export const notificacoesBroadcast = pgTable(
  "notificacoes_broadcast",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    titulo: varchar("titulo", { length: 160 }).notNull(),
    mensagem: text("mensagem").notNull(),
    imagem: varchar("imagem", { length: 255 }),
    link: varchar("link", { length: 500 }),
    status: text("status").$type<"rascunho" | "programada" | "enviada" | "cancelada">().notNull().default("rascunho"),
    agendado_para: timestamp("agendado_para", { mode: "string" }),
    enviado_em: timestamp("enviado_em", { mode: "string" }),
    criado_por: integer("criado_por"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("notificacoes_broadcast_idx_status").on(t.status),
  ]
);

export const notificacoesBroadcastVisualizacoes = pgTable(
  "notificacoes_broadcast_visualizacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    notificacao_id: integer("notificacao_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    visualizado_em: timestamp("visualizado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("notificacoes_broadcast_visualizacoes_uq_notif_loja").on(t.notificacao_id, t.loja_id),
  ]
);

export const operacaoLogs = pgTable(
  "operacao_logs",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    operador_id: integer("operador_id"),
    acao: varchar("acao", { length: 60 }).notNull(),
    referencia: varchar("referencia", { length: 60 }),
    dados: text("dados"),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
  }
);

export const orcamentos = pgTable(
  "orcamentos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    status: text("status").$type<"pendente" | "aprovado" | "recusado">().notNull().default("pendente"),
    cliente_nome: varchar("cliente_nome", { length: 191 }).notNull(),
    cliente_tipo_documento: text("cliente_tipo_documento").$type<"fisica" | "juridica">().notNull().default("fisica"),
    cliente_documento: varchar("cliente_documento", { length: 30 }),
    cliente_whatsapp: varchar("cliente_whatsapp", { length: 30 }),
    cliente_endereco: text("cliente_endereco"),
    desconto_tipo: text("desconto_tipo").$type<"valor" | "percent">().notNull().default("valor"),
    desconto_valor: numeric("desconto_valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    subtotal: numeric("subtotal", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    total: numeric("total", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    admin_id: integer("admin_id"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("orcamentos_idx_orcamentos_loja").on(t.loja_id, t.criado_em),
  ]
);

export const orcamentoItens = pgTable(
  "orcamento_itens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    orcamento_id: integer("orcamento_id").notNull(),
    produto_id: integer("produto_id"),
    nome: varchar("nome", { length: 191 }).notNull(),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull(),
    qtd: integer("qtd").notNull(),
    observacoes: varchar("observacoes", { length: 255 }),
  },
  (t) => [
    index("orcamento_itens_orcamento_id").on(t.orcamento_id),
    foreignKey({ columns: [t.orcamento_id], foreignColumns: [orcamentos.id], name: "orcamento_itens_orcamento_itens_ibfk_1" }).onDelete("cascade"),
  ]
);

export const pausasProgramadas = pgTable(
  "pausas_programadas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    titulo: varchar("titulo", { length: 100 }).notNull(),
    data_inicio: date("data_inicio", { mode: "string" }).notNull(),
    hora_inicio: time("hora_inicio").notNull(),
    data_fim: date("data_fim", { mode: "string" }).notNull(),
    hora_fim: time("hora_fim").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("pausas_programadas_idx_loja").on(t.loja_id),
  ]
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    tenant_id: integer("tenant_id").notNull().default(1),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true),
    created_at: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { mode: "string" }),
  },
  (t) => [
    unique("payment_methods_uniq_payment_methods_tenant_name").on(t.tenant_id, t.name),
    index("payment_methods_idx_payment_methods_tenant").on(t.tenant_id),
  ]
);

export const pdvReservas = pgTable(
  "pdv_reservas",
  {
    loja_id: integer("loja_id").notNull(),
    sessao: varchar("sessao", { length: 64 }).notNull(),
    produto_id: integer("produto_id").notNull(),
    quantidade: integer("quantidade").notNull(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.loja_id, t.sessao, t.produto_id] }),
    index("pdv_reservas_idx_pdvres_loja_atual").on(t.loja_id, t.atualizado_em),
  ]
);

export const pedidos = pgTable(
  "pedidos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    codigo: varchar("codigo", { length: 64 }),
    cliente_id: integer("cliente_id"),
    mesa_id: integer("mesa_id"),
    garcom_id: integer("garcom_id"),
    motoboy_id: integer("motoboy_id"),
    operador_id: integer("operador_id"),
    caixa_id: integer("caixa_id"),
    offline_uuid: varchar("offline_uuid", { length: 36 }),
    tipo_entrega: text("tipo_entrega").$type<"retirada" | "entrega">(),
    taxa_entrega: numeric("taxa_entrega", { precision: 10, scale: 2, mode: "number" }),
    taxa_servico: numeric("taxa_servico", { precision: 10, scale: 2, mode: "number" }),
    total: numeric("total", { precision: 10, scale: 2, mode: "number" }),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
    tipo: text("tipo").$type<"retirada" | "entrega" | "mesa">().notNull().default("retirada"),
    endereco_entrega: text("endereco_entrega"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    desconto: numeric("desconto", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    forma_pagamento: varchar("forma_pagamento", { length: 30 }).notNull().default("pix"),
    valor_pago: numeric("valor_pago", { precision: 10, scale: 2, mode: "number" }),
    troco: numeric("troco", { precision: 10, scale: 2, mode: "number" }),
    status: text("status").$type<"pendente" | "aceito" | "preparando" | "entrega" | "finalizado" | "cancelado">().notNull().default("pendente"),
    origem: varchar("origem", { length: 20 }),
    updated_at: timestamp("updated_at", { mode: "string" }).defaultNow(), // ON UPDATE CURRENT_TIMESTAMP no MySQL: atualizar na aplicacao
    cupom: varchar("cupom", { length: 60 }),
    taxa_maquininha: numeric("taxa_maquininha", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    cashback_valor: numeric("cashback_valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    cashback_percentual: numeric("cashback_percentual", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    cashback_expira_em: date("cashback_expira_em", { mode: "string" }),
    cashback_aplicado: boolean("cashback_aplicado").notNull().default(false),
    agendamento: timestamp("agendamento", { mode: "string" }),
    observacoes_cliente: varchar("observacoes_cliente", { length: 255 }),
    loja_id: integer("loja_id").notNull().default(1),
    cashback_usado: numeric("cashback_usado", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
  },
  (t) => [
    unique("pedidos_idx_pedidos_offline_uuid").on(t.offline_uuid),
    index("pedidos_cliente_id").on(t.cliente_id),
    index("pedidos_idx_pedidos_motoboy").on(t.motoboy_id),
    index("pedidos_idx_pedidos_mesa").on(t.mesa_id),
    index("pedidos_idx_pedidos_garcom").on(t.garcom_id),
    foreignKey({ columns: [t.cliente_id], foreignColumns: [clientes.id], name: "pedidos_pedidos_ibfk_1" }),
  ]
);

export const pedidoComboItens = pgTable(
  "pedido_combo_itens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    pedido_id: integer("pedido_id").notNull(),
    pedido_item_id: integer("pedido_item_id").notNull(),
    produto_id: integer("produto_id").notNull(),
    quantidade: integer("quantidade").notNull(),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("pedido_combo_itens_idx_pci_pedido").on(t.pedido_id, t.loja_id),
    index("pedido_combo_itens_idx_pci_item").on(t.pedido_item_id),
  ]
);

export const pedidoItens = pgTable(
  "pedido_itens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    pedido_id: integer("pedido_id"),
    produto_nome: varchar("produto_nome", { length: 150 }),
    quantidade: integer("quantidade"),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }),
    observacoes: text("observacoes"),
    cross_sell: boolean("cross_sell").notNull().default(false),
    loja_id: integer("loja_id").notNull().default(1),
    produto_id: integer("produto_id"),
  },
  (t) => [
    index("pedido_itens_pedido_id").on(t.pedido_id),
    foreignKey({ columns: [t.pedido_id], foreignColumns: [pedidos.id], name: "pedido_itens_pedido_itens_ibfk_1" }),
  ]
);

export const pedidoPagamentos = pgTable(
  "pedido_pagamentos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    pedido_id: integer("pedido_id").notNull(),
    forma: varchar("forma", { length: 30 }).notNull(),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull(),
    taxa_maquininha: numeric("taxa_maquininha", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
    loja_id: integer("loja_id").notNull().default(1),
  }
);

export const pedidoStatusLog = pgTable(
  "pedido_status_log",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    pedido_id: integer("pedido_id").notNull(),
    loja_id: integer("loja_id").notNull().default(1),
    status: varchar("status", { length: 20 }).notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("pedido_status_log_pedido_id").on(t.pedido_id),
    index("pedido_status_log_idx_pedido_status_log_loja_pedido").on(t.loja_id, t.pedido_id),
    foreignKey({ columns: [t.pedido_id], foreignColumns: [pedidos.id], name: "pedido_status_log_pedido_status_log_ibfk_1" }).onDelete("cascade"),
  ]
);

export const permissoesNiveis = pgTable(
  "permissoes_niveis",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    permissoes_json: text("permissoes_json").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    unique("permissoes_niveis_slug").on(t.slug),
  ]
);

export const permissoesUsuarios = pgTable(
  "permissoes_usuarios",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    permissao_id: integer("permissao_id").notNull(),
    admin_id: integer("admin_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    unique("permissoes_usuarios_uniq_perm_usuario").on(t.permissao_id, t.admin_id),
    index("permissoes_usuarios_idx_perm_admin").on(t.admin_id),
    index("permissoes_usuarios_idx_perm_perm").on(t.permissao_id),
  ]
);

export const planos = pgTable(
  "planos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    nome: varchar("nome", { length: 120 }).notNull(),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    periodicidade: text("periodicidade").$type<"mensal">().notNull().default("mensal"),
    dias_trial: integer("dias_trial").notNull().default(15),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    landing_slug: varchar("landing_slug", { length: 20 }),
    recursos_json: text("recursos_json"),
  },
  (t) => [
    unique("planos_uq_planos_landing_slug").on(t.landing_slug),
  ]
);

export const pontosMovimentacoes = pgTable(
  "pontos_movimentacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    cliente_id: integer("cliente_id").notNull(),
    pedido_id: integer("pedido_id"),
    tipo: text("tipo").$type<"ganho" | "resgate" | "expirado" | "ajuste" | "pendente">().notNull(),
    pontos: integer("pontos").notNull().default(0),
    saldo_antes: integer("saldo_antes").notNull().default(0),
    saldo_depois: integer("saldo_depois").notNull().default(0),
    referencia_id: integer("referencia_id"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("pontos_movimentacoes_idx_pontos_cliente").on(t.cliente_id),
    index("pontos_movimentacoes_idx_pontos_pedido").on(t.pedido_id),
    index("pontos_movimentacoes_idx_pontos_tipo").on(t.tipo),
    index("pontos_movimentacoes_idx_pontos_ref").on(t.referencia_id),
  ]
);

export const produtos = pgTable(
  "produtos",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    categoria_id: integer("categoria_id"),
    nome: varchar("nome", { length: 150 }),
    descricao: text("descricao"),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }),
    pontos_ganho: integer("pontos_ganho").notNull().default(0),
    pontos_custo: integer("pontos_custo").notNull().default(0),
    imagem: varchar("imagem", { length: 255 }),
    ativo: boolean("ativo").default(true),
    ordem: integer("ordem"),
    preco_promocional: numeric("preco_promocional", { precision: 10, scale: 2, mode: "number" }),
    promo_desativado: boolean("promo_desativado").notNull().default(true),
    tem_variacoes: boolean("tem_variacoes").notNull().default(false),
    disponivel_catalogo: boolean("disponivel_catalogo").notNull().default(true),
    disponivel_mesa: boolean("disponivel_mesa").notNull().default(true),
    loja_id: integer("loja_id").notNull().default(1),
    apenas_agendamento: boolean("apenas_agendamento").notNull().default(false),
    quantidade_minima: integer("quantidade_minima").notNull().default(0),
    dias_semana: text("dias_semana"),
    horario_ini: varchar("horario_ini", { length: 5 }),
    horario_fim: varchar("horario_fim", { length: 5 }),
    data_fabricacao: date("data_fabricacao", { mode: "string" }),
    data_validade: date("data_validade", { mode: "string" }),
    promo_dias: integer("promo_dias"),
    promo_inicio: date("promo_inicio", { mode: "string" }),
    promo_imagem: varchar("promo_imagem", { length: 255 }),
    promo_descricao: text("promo_descricao"),
    promo_etiqueta: varchar("promo_etiqueta", { length: 30 }),
    destaque: boolean("destaque").notNull().default(false),
  },
  (t) => [
    index("produtos_fk_produtos_categoria").on(t.categoria_id),
    foreignKey({ columns: [t.categoria_id], foreignColumns: [categorias.id], name: "produtos_fk_produtos_categoria" }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ columns: [t.categoria_id], foreignColumns: [categorias.id], name: "produtos_produtos_ibfk_1" }),
  ]
);

export const produtoComplementosItens = pgTable(
  "produto_complementos_itens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    produto_id: integer("produto_id").notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    obrigatorio: boolean("obrigatorio").notNull().default(false),
    ativo: boolean("ativo").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    loja_id: integer("loja_id").notNull(),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    index("produto_complementos_itens_idx_produto_complementos_itens_produ").on(t.produto_id),
    index("produto_complementos_itens_idx_produto_complementos_itens_loja").on(t.loja_id),
    foreignKey({ columns: [t.produto_id], foreignColumns: [produtos.id], name: "produto_complementos_itens_fk_produto_complementos_itens_produt" }).onDelete("cascade"),
  ]
);

export const produtoExtras = pgTable(
  "produto_extras",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    produto_id: integer("produto_id").notNull(),
    nome: varchar("nome", { length: 120 }).notNull(),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    obrigatorio: boolean("obrigatorio").notNull().default(false),
    ativo: boolean("ativo").notNull().default(true),
    ordem: integer("ordem").notNull().default(0),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("produto_extras_idx_produto_extras_produto").on(t.produto_id),
    foreignKey({ columns: [t.produto_id], foreignColumns: [produtos.id], name: "produto_extras_fk_produto_extras_produto" }).onDelete("cascade"),
  ]
);

export const produtoVariacoes = pgTable(
  "produto_variacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    produto_id: integer("produto_id").notNull(),
    tamanho: varchar("tamanho", { length: 60 }),
    cor: varchar("cor", { length: 60 }),
    preco: numeric("preco", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    index("produto_variacoes_idx_produto_variacoes_produto").on(t.produto_id),
    foreignKey({ columns: [t.produto_id], foreignColumns: [produtos.id], name: "produto_variacoes_fk_produto_variacoes_produto" }).onDelete("cascade"),
  ]
);

export const suporteDigitando = pgTable(
  "suporte_digitando",
  {
    loja_id: integer("loja_id").notNull(),
    quem: text("quem").$type<"loja" | "suporte">().notNull(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.loja_id, t.quem] }),
  ]
);

export const suporteMensagens = pgTable(
  "suporte_mensagens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    remetente: text("remetente").$type<"loja" | "suporte">().notNull(),
    mensagem: text("mensagem").notNull(),
    lida_loja: boolean("lida_loja").notNull().default(false),
    lida_suporte: boolean("lida_suporte").notNull().default(false),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    anexo_arquivo: varchar("anexo_arquivo", { length: 255 }),
  },
  (t) => [
    index("suporte_mensagens_idx_loja").on(t.loja_id),
  ]
);

export const taxasBairro = pgTable(
  "taxas_bairro",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    bairro: varchar("bairro", { length: 120 }).notNull(),
    taxa: numeric("taxa", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    tempo_min: integer("tempo_min"),
    tempo_max: integer("tempo_max"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    loja_id: integer("loja_id").notNull().default(1),
  },
  (t) => [
    unique("taxas_bairro_uniq_bairro").on(t.loja_id, t.bairro),
  ]
);

export const taxasDinamicas = pgTable(
  "taxas_dinamicas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    distancia_km: numeric("distancia_km", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    valor: numeric("valor", { precision: 10, scale: 2, mode: "number" }).notNull().default(0),
    tipo: text("tipo").$type<"fixa" | "por_km">().notNull().default("fixa"),
    tempo_min: integer("tempo_min"),
    tempo_max: integer("tempo_max"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
    loja_id: integer("loja_id").notNull().default(1),
  }
);

export const versiculoReacoes = pgTable(
  "versiculo_reacoes",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    admin_id: integer("admin_id").notNull(),
    data_versiculo: date("data_versiculo", { mode: "string" }).notNull(),
    reacao: text("reacao").$type<"gostou" | "nao_gostou">().notNull(),
    referencia: varchar("referencia", { length: 80 }),
    texto: text("texto"),
    criado_em: timestamp("criado_em", { mode: "string" }).notNull().defaultNow(),
    atualizado_em: timestamp("atualizado_em", { mode: "string" }),
  },
  (t) => [
    unique("versiculo_reacoes_uniq_reacao_admin_data").on(t.admin_id, t.data_versiculo),
    index("versiculo_reacoes_idx_reacao_data").on(t.data_versiculo),
    index("versiculo_reacoes_idx_reacao_admin").on(t.admin_id),
  ]
);

export const whatsConversas = pgTable(
  "whats_conversas",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    loja_id: integer("loja_id").notNull(),
    numero: varchar("numero", { length: 30 }).notNull(),
    nome: varchar("nome", { length: 150 }),
    ultimo_msg: text("ultimo_msg"),
    ultimo_msg_em: timestamp("ultimo_msg_em", { mode: "string" }),
    nao_lidas: integer("nao_lidas").default(0),
    created_at: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    unique("whats_conversas_uq_loja_numero").on(t.loja_id, t.numero),
  ]
);

export const whatsMensagens = pgTable(
  "whats_mensagens",
  {
    id: integer("id").generatedByDefaultAsIdentity().notNull().primaryKey(),
    conversa_id: integer("conversa_id").notNull(),
    loja_id: integer("loja_id").notNull(),
    direcao: text("direcao").$type<"entrada" | "saida">().notNull(),
    tipo: text("tipo").$type<"texto" | "pedido">().default("texto"),
    mensagem: text("mensagem").notNull(),
    pedido_id: integer("pedido_id"),
    whats_msg_id: varchar("whats_msg_id", { length: 120 }),
    created_at: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (t) => [
    index("whats_mensagens_idx_conversa").on(t.conversa_id),
    foreignKey({ columns: [t.conversa_id], foreignColumns: [whatsConversas.id], name: "whats_mensagens_whats_mensagens_ibfk_1" }).onDelete("cascade"),
  ]
);

