export type WlConversa = {
  id: number;
  numero: string;
  nome: string;
  ultimo_msg: string | null;
  ultimo_msg_em: string | null;
  nao_lidas: number;
};

export type WlMensagemTipo = "texto" | "pedido";
export type WlMensagemDirecao = "entrada" | "saida";

export type WlMensagem = {
  id: number;
  direcao: WlMensagemDirecao;
  tipo: WlMensagemTipo;
  mensagem: string;
  pedido_id: number | null;
  hora: string;
  data_fmt: string;
  falhou: boolean;
};

export type WlPedidoResumo = {
  id: number;
  total: number;
  status: string;
  criado_fmt: string;
};

export type WlConversasResposta = {
  ok: true;
  conversas: WlConversa[];
  total_nao_lidas: number;
};

export type WlMensagensResposta = {
  ok: true;
  conversa: { id: number; numero: string; nome: string };
  mensagens: WlMensagem[];
  pedidos: WlPedidoResumo[];
};

export type WlPollResposta = {
  ok: true;
  mensagens: WlMensagem[];
  total_nao_lidas: number;
};

export type WlEnviarResposta = {
  ok: true;
  enviado: boolean;
  erro: string | null;
  id: number;
  hora: string;
  data_fmt: string;
};

export type WlNovaConversaResposta = {
  ok: true;
  conversa_id: number;
  nome: string;
};

export const WL_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aceito: "Aceito",
  preparando: "Preparando",
  entrega: "Em entrega",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export function wlInitials(nome: string): string {
  if (!nome) return "?";
  const parts = nome.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase();
}

const WL_AVATAR_COLORS = ["#00a884", "#0277bd", "#7b1fa2", "#c62828", "#6a1b9a", "#0288d1", "#2e7d32", "#e65100"];

export function wlAvatarColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return WL_AVATAR_COLORS[Math.abs(h) % WL_AVATAR_COLORS.length];
}

export function wlTimeAgo(dtStr: string | null): string {
  if (!dtStr) return "";
  const dt = new Date(dtStr.replace(" ", "T"));
  if (Number.isNaN(dt.getTime())) return "";
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = dt.toDateString() === yesterday.toDateString();
  if (isToday) return dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "ontem";
  const diff = Math.floor((now.getTime() - dt.getTime()) / 86400000);
  if (diff < 7) return dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
