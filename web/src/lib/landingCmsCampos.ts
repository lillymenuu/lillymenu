export type TipoCampoLanding = "texto" | "textarea" | "imagem";

export type CampoLanding = {
  chave: string;
  label: string;
  tipo: TipoCampoLanding;
  ajuda?: string;
};

export type GrupoLanding = {
  titulo: string;
  campos: CampoLanding[];
};

const AJUDA_LISTA_LINK = "Um por linha, no formato: Rótulo|link";
const AJUDA_LISTA = "Um item por linha";

/** Espelha exatamente os campos usados em src/app/page.tsx — nao expõe chave que a landing não renderiza (ex.: theme_*, nav_brand_font). */
export const GRUPOS_LANDING: GrupoLanding[] = [
  {
    titulo: "Marca e navegação",
    campos: [
      { chave: "brand", label: "Nome da marca", tipo: "texto" },
      { chave: "logo_image", label: "Logo", tipo: "imagem" },
      { chave: "nav_links_items", label: "Links do menu", tipo: "textarea", ajuda: AJUDA_LISTA_LINK },
      { chave: "nav_cta_secondary_text", label: "Texto do botão \"Entrar\"", tipo: "texto" },
    ],
  },
  {
    titulo: "Hero (topo da página)",
    campos: [
      { chave: "hero_badge", label: "Selo/badge", tipo: "texto" },
      { chave: "hero_title", label: "Título", tipo: "textarea" },
      { chave: "hero_subtitle", label: "Subtítulo", tipo: "textarea" },
      { chave: "hero_bg_image", label: "Imagem de fundo", tipo: "imagem" },
      { chave: "hero_stat1", label: "Destaque 1", tipo: "texto" },
      { chave: "hero_stat2", label: "Destaque 2", tipo: "texto" },
      { chave: "hero_stat3", label: "Destaque 3", tipo: "texto" },
    ],
  },
  {
    titulo: "Formulário de cadastro",
    campos: [
      { chave: "lead_title", label: "Título do formulário", tipo: "texto" },
      { chave: "lead_name_label", label: "Rótulo: nome", tipo: "texto" },
      { chave: "lead_company_label", label: "Rótulo: empresa", tipo: "texto" },
      { chave: "lead_email_label", label: "Rótulo: e-mail", tipo: "texto" },
      { chave: "lead_whatsapp_label", label: "Rótulo: telefone", tipo: "texto" },
      { chave: "lead_revenue_label", label: "Rótulo: faturamento", tipo: "texto" },
      { chave: "lead_revenue_options", label: "Opções de faturamento", tipo: "textarea", ajuda: AJUDA_LISTA },
      { chave: "lead_segment_label", label: "Rótulo: modelo de negócio", tipo: "texto" },
      { chave: "lead_segment_options", label: "Opções de modelo de negócio", tipo: "textarea", ajuda: AJUDA_LISTA },
      { chave: "lead_privacy_text", label: "Texto de consentimento", tipo: "texto" },
      { chave: "lead_button_text", label: "Texto do botão enviar", tipo: "texto" },
    ],
  },
  {
    titulo: "Soluções",
    campos: [
      { chave: "solucoes_titulo", label: "Título da seção", tipo: "texto" },
      ...[1, 2, 3, 4, 5].flatMap((n) => [
        { chave: `solucao${n}_titulo`, label: `Solução ${n} — título`, tipo: "texto" as const },
        { chave: `solucao${n}_texto`, label: `Solução ${n} — texto`, tipo: "textarea" as const },
        { chave: `solucao${n}_imagem`, label: `Solução ${n} — imagem`, tipo: "imagem" as const },
      ]),
    ],
  },
  {
    titulo: "Segmentos de negócio",
    campos: [
      { chave: "segmentos_titulo", label: "Título da seção", tipo: "texto" },
      { chave: "segmentos_imagem", label: "Imagem de fundo", tipo: "imagem" },
      { chave: "segmentos_items", label: "Tipos de negócio", tipo: "textarea", ajuda: AJUDA_LISTA },
    ],
  },
  {
    titulo: "Planos (vitrine de preços)",
    campos: [
      { chave: "planos_tabela_titulo", label: "Título da seção de planos", tipo: "texto" },
      { chave: "planos_tabela_destaques", label: "Destaques acima dos planos", tipo: "textarea", ajuda: AJUDA_LISTA },
      ...[1, 2, 3, 4].flatMap((n) => [
        { chave: `plano${n}_ativo`, label: `Plano ${n} — ativo (1 ou 0)`, tipo: "texto" as const },
        { chave: `plano${n}_nome`, label: `Plano ${n} — nome`, tipo: "texto" as const },
        { chave: `plano${n}_preco`, label: `Plano ${n} — preço (texto, ex: R$ 97,00)`, tipo: "texto" as const },
        { chave: `plano${n}_badge`, label: `Plano ${n} — selo`, tipo: "texto" as const },
        { chave: `plano${n}_descricao`, label: `Plano ${n} — descrição`, tipo: "textarea" as const },
        { chave: `plano${n}_features`, label: `Plano ${n} — recursos`, tipo: "textarea" as const, ajuda: AJUDA_LISTA },
        { chave: `plano${n}_botao_texto`, label: `Plano ${n} — texto do botão`, tipo: "texto" as const },
        { chave: `plano${n}_botao_link`, label: `Plano ${n} — link do botão`, tipo: "texto" as const },
      ]),
      { chave: "planos_beneficios_titulo", label: "Título dos benefícios", tipo: "texto" },
      ...[1, 2, 3, 4, 5, 6].flatMap((n) => [
        { chave: `planos_beneficio${n}_titulo`, label: `Benefício ${n} — título`, tipo: "texto" as const },
        { chave: `planos_beneficio${n}_texto`, label: `Benefício ${n} — texto`, tipo: "textarea" as const },
      ]),
    ],
  },
  {
    titulo: "Fale com um especialista",
    campos: [
      { chave: "cta_title", label: "Título", tipo: "texto" },
      { chave: "cta_text", label: "Texto", tipo: "textarea" },
      { chave: "cta_button_text", label: "Texto do botão", tipo: "texto" },
      ...[1, 2, 3].flatMap((n) => [
        { chave: `cta_item${n}_titulo`, label: `Item ${n} — título`, tipo: "texto" as const },
        { chave: `cta_item${n}_texto`, label: `Item ${n} — texto`, tipo: "textarea" as const },
      ]),
    ],
  },
  {
    titulo: "Rodapé",
    campos: [
      { chave: "footer_menu_titulo", label: "Título do menu", tipo: "texto" },
      { chave: "footer_menu_items", label: "Links do menu", tipo: "textarea", ajuda: AJUDA_LISTA_LINK },
      { chave: "footer_para_voce_titulo", label: "Título \"Para você\"", tipo: "texto" },
      { chave: "footer_para_voce_items", label: "Links \"Para você\"", tipo: "textarea", ajuda: AJUDA_LISTA_LINK },
      { chave: "footer_email", label: "E-mail de contato", tipo: "texto" },
      { chave: "footer_telefone", label: "Telefone", tipo: "texto" },
      { chave: "footer_endereco", label: "Endereço", tipo: "texto" },
      { chave: "footer_social_instagram", label: "Link do Instagram", tipo: "texto" },
      { chave: "footer_social_linkedin", label: "Link do LinkedIn", tipo: "texto" },
      { chave: "footer_social_youtube", label: "Link do YouTube", tipo: "texto" },
    ],
  },
  {
    titulo: "WhatsApp flutuante",
    campos: [
      { chave: "whatsapp_number", label: "Número (com DDI/DDD, só dígitos)", tipo: "texto" },
      { chave: "whatsapp_message", label: "Mensagem inicial", tipo: "texto" },
    ],
  },
];

export const TODAS_AS_CHAVES_LANDING: string[] = GRUPOS_LANDING.flatMap((g) => g.campos.map((c) => c.chave));
