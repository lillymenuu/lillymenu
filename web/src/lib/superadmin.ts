export type SaCobranca = {
  id: number;
  status: string;
  valor: number | null;
  vencimento: string | null;
  comprovante: string | null;
  comprovante_em: string | null;
  motivo_rejeicao: string | null;
  aguardando_revisao: boolean;
  aprovado: boolean;
};

export type SaLoja = {
  id: number;
  nome: string;
  ativo: boolean;
  criado_em: string | null;
  status: string;
  em_teste: boolean;
  trial_inicio: string | null;
  trial_fim: string | null;
  expira_em: string | null;
  expira_dias: number | null;
  contato: string;
  admin: { id: number; nome: string; email: string; usuario: string };
  plano_id: number;
  plano_nome: string | null;
  plano_valor: number | null;
  plano_desejado: string | null;
  cobranca: SaCobranca;
};

export type SaLead = {
  id: number;
  criado_em: string | null;
  nome: string;
  empresa: string;
  email: string;
  whatsapp: string;
  cnpj: string;
  cep: string;
  cidade: string;
  estado: string;
  segmento: string;
};

export type SaPlano = {
  id: number;
  nome: string;
  valor: number;
  /** null = plano sem restricao de recursos */
  recursos: string[] | null;
};

export type SaCategoriaRecursos = {
  titulo: string;
  itens: { chave: string; label: string }[];
};

export type SaConfig = {
  pix_chave: string;
  pix_nome: string;
  whats_numero: string;
  nominatim_ativo: boolean;
};

export type SaLojasResposta = {
  ok: true;
  lojas: SaLoja[];
  leads: SaLead[];
  planos: SaPlano[];
  categorias: SaCategoriaRecursos[];
  config: SaConfig;
};

export type SaResultado = { ok: boolean; msg?: string };

/** Chama o proxy do painel do superadmin (/api/superadmin/call). */
export async function saCall<T = SaResultado>(
  alvo: string,
  corpo?: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const qs = new URLSearchParams({ alvo, ...query });
  const res = await fetch(`/api/superadmin/call?${qs}`, corpo === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, msg: "Erro ao falar com a API." } as T;
  return data as T;
}

export function urlArquivo(caminho: string, phpAdminUrl: string) {
  return caminho.startsWith("http") ? caminho : `${phpAdminUrl}/${caminho}`;
}

export function formatarData(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso.replace(" ", "T"));
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}
