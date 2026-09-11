export type ClienteEndereco = {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  cep: string;
};

export type ClienteStats = {
  nome: string;
  telefone: string;
  email: string;
  nivel: string;
  endereco: ClienteEndereco;
  aniversario: string;
  criado_em: string;
  cashback: number;
  pontos: number;
  saldo_fiado: number;
  ticket_medio: number;
  ultimo_pedido: string | null;
  pedidos_feitos: number;
  avaliacao_media: number | null;
};

export type ClientePedido = {
  id: number;
  total: number;
  tipo: string;
  criado_em: string;
  resumo: string;
};

export type ClienteAvaliacao = {
  id: number;
  nota: number;
  descricao: string;
  pedido_id: number | null;
  criado_em: string;
};

export type ClientePonto = {
  id: number;
  pedido_id: number | null;
  tipo: string;
  pontos: number;
  saldo_antes: number;
  saldo_depois: number;
  criado_em: string;
};

export function formatEndereco(e: ClienteEndereco): string {
  const partes: string[] = [];
  if (e.rua) partes.push(e.numero ? `${e.rua}, ${e.numero}` : e.rua);
  if (e.bairro) partes.push(e.bairro);
  const cidadeEstado = [e.cidade, e.estado].filter(Boolean).join(" / ");
  if (cidadeEstado) partes.push(cidadeEstado);
  if (e.cep) partes.push(e.cep);
  if (e.complemento) partes.push(e.complemento);
  return partes.join(" - ");
}

export function formatDataCurta(iso: string | null): string {
  if (!iso) return "-";
  // Data pura ("YYYY-MM-DD", sem hora) e interpretada pelo JS como UTC
  // meia-noite — em fusos negativos (ex.: America/Fortaleza) isso exibe o
  // dia anterior. Forca meia-noite local nesse caso.
  const comHora = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso.replace(" ", "T");
  const d = new Date(comHora);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

export function formatDataHoraCurta(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
