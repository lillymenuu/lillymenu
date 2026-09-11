export type HorarioDia = { inicio: string; fim: string } | null;

export type ConfiguracoesDetalhe = {
  ok: true;
  sou_admin_principal: boolean;
  loja_link_base: string;
  loja: {
    nome: string;
    contato: string;
    descricao: string;
    cnpj: string;
    link: string;
    instagram: string;
    tiktok: string;
    cep: string;
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento: string;
    capa: string;
    perfil: string;
    verificada: boolean;
    tema_cor_menu: string;
  };
  horarios: {
    abertura: string;
    fechamento: string;
    dias_funcionamento: number[];
    por_dia: Record<string, HorarioDia>;
  };
  pagamento: {
    dinheiro_ativo: boolean;
    pix: { ativo: boolean; chave: string; nome: string };
    credito: {
      ativo: boolean;
      taxa_ativa: boolean;
      taxa: number;
      bandeiras: string[];
      bandeiras_custom: { slug: string; label: string }[];
    };
    debito: {
      ativo: boolean;
      taxa_ativa: boolean;
      taxa: number;
      bandeiras: string[];
      bandeiras_custom: { slug: string; label: string }[];
    };
    voucher_ativo: boolean;
    fiado_ativo: boolean;
  };
  cashback: {
    ativo: boolean;
    expira_dias: number;
    carencia_horas: number;
    percentual: number;
  };
  clube_pontos_ativo: boolean;
  pedidos: {
    receber_pedidos_ativo: boolean;
    gestor_pedidos_ativo: boolean;
    notificar_pedido_whatsapp_ativo: boolean;
    aceite_automatico_diggy_ativo: boolean;
    whatsapp_numero: string;
    entrega: { ativo: boolean; tempo_min: number; tempo_max: number; horario_ini: string; horario_fim: string };
    retirada: { ativo: boolean; tempo_min: number; tempo_max: number };
    local_ativo: boolean;
    pedido_minimo_entrega_ativo: boolean;
    pedido_minimo_entrega: number;
    pedido_minimo_retirada_ativo: boolean;
    pedido_minimo_retirada: number;
  };
  agendamento: {
    delivery: {
      ativo: boolean;
      min_tipo: string;
      min_valor: number;
      max_tipo: string;
      max_valor: number;
      horarios: Record<string, { inicio: string; fim: string }>;
    };
    retirada: {
      ativo: boolean;
      min_tipo: string;
      min_valor: number;
      max_tipo: string;
      max_valor: number;
      horarios: Record<string, { inicio: string; fim: string }>;
    };
  };
  taxa_entrega: {
    tipo: string;
    gratis: boolean;
    fixa: { valor: number; tempo_min: number; tempo_max: number };
  };
  whatsapp: { numero: string; msg: string };
  versiculo_dashboard_ativo: boolean;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  usuario: string | null;
  perfil: string;
  ativo: number;
  codigo_acesso: string | null;
  permissao_id: number | null;
  permissao_nome: string | null;
  permissao_slug: string | null;
  rotulo_nivel: string;
};

export type NivelPermissao = { id: number; nome: string; slug: string };

export type UsuariosListarResposta = {
  ok: true;
  sou_admin_principal: boolean;
  nivel_admin_id: number;
  nivel_garcom_id: number;
  niveis: NivelPermissao[];
  niveis_personalizados: NivelPermissao[];
  usuarios: Usuario[];
};

export type Pausa = {
  id: number;
  titulo: string;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
};

export type PausasListarResposta = { ok: true; pausas: Pausa[] };

export type TaxaBairro = {
  id: number;
  bairro: string;
  taxa: string;
  tempo_min: number | null;
  tempo_max: number | null;
};

export type TaxaBairroListarResposta = { ok: true; itens: TaxaBairro[] };

export type TaxaDinamica = {
  id: number;
  distancia_km: string;
  valor: string;
  tipo: string;
  tempo_min: number | null;
  tempo_max: number | null;
};

export type TaxaDinamicaListarResposta = { ok: true; itens: TaxaDinamica[] };

export const BANDEIRAS_PADRAO: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  elo: "Elo",
  hiper: "Hiper",
  maestro: "Maestro",
  hipercard: "Hipercard",
  diners: "Diners Club",
  alelo: "Alelo",
  amex: "Amex",
};

export const DIAS_SEMANA_CURTO: Record<number, string> = {
  1: "Dom",
  2: "Seg",
  3: "Ter",
  4: "Qua",
  5: "Qui",
  6: "Sex",
  7: "Sab",
};

export const DIAS_SEMANA_LONGO: Record<number, string> = {
  1: "Domingo",
  2: "Segunda",
  3: "Terça",
  4: "Quarta",
  5: "Quinta",
  6: "Sexta",
  7: "Sábado",
};

export const CORES_MENU_OPCOES: { valor: string; nome: string; desc: string }[] = [
  { valor: "#e63770", nome: "Rosa Diggy", desc: "Cor padrão do sistema." },
  { valor: "#dc2626", nome: "Vermelho Vivo", desc: "Neutro, vibrante e enérgico, transmite dinamismo, apetite e proximidade." },
  { valor: "#ea5a3c", nome: "Vermelho Vibrante", desc: "Boa para lanchonetes e hamburguerias." },
  { valor: "#1f2d3d", nome: "Cinza Escuro", desc: "Ideal para cafés modernos ou bistrôs elegantes." },
  { valor: "#9f1d35", nome: "Vermelho Cereja", desc: "Combina com docerias clássicas e cantinas." },
  { valor: "#16a34a", nome: "Verde Natural", desc: "Ótima para restaurantes naturais ou veganos." },
  { valor: "#6f4e37", nome: "Marrom Café", desc: "Perfeita para cafeterias e confeitarias artesanais." },
  { valor: "#d9714a", nome: "Coral Queimado", desc: "Ideal para cafés ou padarias elegantes." },
  { valor: "#a8195f", nome: "Fúcsia", desc: "Boa para marcas femininas e modernas." },
  { valor: "#c98bd9", nome: "Rosa Doce", desc: "Ótima para docerias temáticas e infantis." },
  { valor: "#7b5c3e", nome: "Marrom Rústico", desc: "Estilo rústico combina com pizzarias com forno à lenha." },
];

