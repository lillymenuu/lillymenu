import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { admins, configuracoes } from "@/db/schema";
import { getConfigs } from "@/db/queries/config";
import { storageSaveBase64, storageDelete } from "@/db/queries/storage";

/*
 * Equivalente ao bloco de leitura/escrita de admin/configuracoes.php via
 * admin/api/v1/configuracoes_detalhe.php, configuracoes_salvar.php e
 * config_toggle.php: tela de configuracoes gerais da loja (dados da loja,
 * horarios, formas de pagamento, cashback, pontos, pedidos, agendamento,
 * taxa de entrega).
 */

async function souAdminPrincipal(adminId: number, perfil: string): Promise<boolean> {
  if (perfil !== "admin") return false;
  const [linha] = await db.select({ senha: admins.senha }).from(admins).where(eq(admins.id, adminId)).limit(1);
  return Boolean(linha?.senha && linha.senha.trim() !== "");
}

function parseJsonArray<T = unknown>(raw: string, fallback: T[] = []): T[] {
  try {
    const decoded = JSON.parse(raw);
    return Array.isArray(decoded) ? decoded : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject<T extends object = Record<string, unknown>>(raw: string, fallback: T): T {
  try {
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === "object" && !Array.isArray(decoded) ? decoded : fallback;
  } catch {
    return fallback;
  }
}

type HorarioDia = { inicio: string; fim: string };

function normalizarAgendamentoHorarios(raw: string, fallback: Record<number, HorarioDia>): Record<number, HorarioDia> {
  const dados = parseJsonObject<Record<string, unknown>>(raw, {});
  const normalizado: Record<number, HorarioDia> = {};
  for (const [dia, info] of Object.entries(dados)) {
    if (info && typeof info === "object") {
      const o = info as Record<string, unknown>;
      if (typeof o.inicio === "string" && typeof o.fim === "string") {
        const diaId = Number(dia);
        if (diaId > 0) normalizado[diaId] = { inicio: o.inicio, fim: o.fim };
        continue;
      }
      if (typeof o.dia === "number" && typeof o.inicio === "string" && typeof o.fim === "string") {
        if (o.dia > 0) normalizado[o.dia] = { inicio: o.inicio, fim: o.fim };
      }
    }
  }
  return Object.keys(normalizado).length > 0 ? normalizado : fallback;
}

const CHAVES_CONFIGURACOES = [
  "link_loja",
  "horarios_semana",
  "horario_abertura",
  "horario_fechamento",
  "dias_funcionamento",
  "nome_loja",
  "loja_contato",
  "loja_descricao",
  "cobranca_cpf",
  "loja_cnpj",
  "loja_instagram",
  "loja_tiktok",
  "loja_cep",
  "loja_rua",
  "loja_numero",
  "loja_bairro",
  "loja_cidade",
  "loja_estado",
  "loja_complemento",
  "loja_capa",
  "loja_perfil",
  "loja_verificada",
  "tema_cor_menu",
  "pagamento_dinheiro_ativo",
  "pagamento_pix_ativo",
  "pagamento_pix_chave",
  "pagamento_pix_nome",
  "pagamento_credito_ativo",
  "pagamento_credito_taxa_ativa",
  "pagamento_credito_taxa",
  "pagamento_credito_bandeiras",
  "pagamento_credito_bandeiras_custom",
  "pagamento_debito_ativo",
  "pagamento_debito_taxa_ativa",
  "pagamento_debito_taxa",
  "pagamento_debito_bandeiras",
  "pagamento_debito_bandeiras_custom",
  "pagamento_voucher_ativo",
  "pagamento_fiado_ativo",
  "cashback_ativo",
  "cashback_expira_dias",
  "cashback_carencia_horas",
  "cashback_percentual",
  "clube_pontos_ativo",
  "cross_sell_ativo",
  "receber_pedidos_ativo",
  "gestor_pedidos_ativo",
  "notificar_pedido_whatsapp_ativo",
  "aceite_automatico_diggy_ativo",
  "whatsapp_numero",
  "pedido_entrega_ativo",
  "tempo_entrega_min",
  "tempo_entrega_max",
  "horario_entrega_ini",
  "horario_entrega_fim",
  "pedido_retirada_ativo",
  "tempo_retirada_min",
  "tempo_retirada_max",
  "pedido_local_ativo",
  "pedido_minimo_entrega_ativo",
  "pedido_minimo_entrega",
  "pedido_minimo_retirada_ativo",
  "pedido_minimo_retirada",
  "agendamento_delivery_ativo",
  "agendamento_delivery_min_tipo",
  "agendamento_delivery_min_valor",
  "agendamento_delivery_max_tipo",
  "agendamento_delivery_max_valor",
  "agendamento_delivery_horarios",
  "agendamento_retirada_ativo",
  "agendamento_retirada_min_tipo",
  "agendamento_retirada_min_valor",
  "agendamento_retirada_max_tipo",
  "agendamento_retirada_max_valor",
  "agendamento_retirada_horarios",
  "taxa_entrega_tipo",
  "taxa_entrega_gratis",
  "taxa_entrega",
  "taxa_entrega_tempo_min",
  "taxa_entrega_tempo_max",
  "versiculo_dashboard_ativo",
];

export type DetalheConfiguracoes = ReturnType<typeof montarDetalheConfiguracoes> extends Promise<infer T> ? T : never;

async function montarDetalheConfiguracoes(lojaId: number, adminId: number, perfil: string, lojaLinkBase: string) {
  const cfg = await getConfigs(lojaId, CHAVES_CONFIGURACOES);

  const lojaLinkBaseAntigo = `${lojaLinkBase}lilly/`;
  const lojaLink = cfg.link_loja || "";
  let lojaLinkSlug = lojaLink;
  if (lojaLink.startsWith(lojaLinkBaseAntigo)) {
    lojaLinkSlug = decodeURIComponent(lojaLink.slice(lojaLinkBaseAntigo.length));
  } else {
    const mParam = lojaLink.match(/[?&]loja=([^&]+)/);
    if (mParam) lojaLinkSlug = decodeURIComponent(mParam[1]);
    else {
      const mPath = lojaLink.match(/\/([^/?]+)\/?$/);
      if (mPath) lojaLinkSlug = mPath[1];
    }
  }
  lojaLinkSlug = lojaLinkSlug.replace(/\.php$/i, "");

  const horariosSemana = parseJsonObject<Record<string, { inicio?: string; fim?: string }>>(cfg.horarios_semana || "", {});
  const horarioAbertura = cfg.horario_abertura || "";
  const horarioFechamento = cfg.horario_fechamento || "";
  const diasFunc = (cfg.dias_funcionamento || "")
    .split(",")
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isFinite(v) && v !== 0);

  const diasSemanaFull: Record<number, string> = { 1: "Domingo", 2: "Segunda", 3: "Terca", 4: "Quarta", 5: "Quinta", 6: "Sexta", 7: "Sabado" };
  const horariosPorDia: Record<number, HorarioDia | null> = {};
  for (const diaIdStr of Object.keys(diasSemanaFull)) {
    const diaId = Number(diaIdStr);
    let horarioDia: HorarioDia | null = null;
    const doJson = horariosSemana[diaId] ?? horariosSemana[String(diaId)];
    if (doJson && typeof doJson === "object") {
      horarioDia = { inicio: doJson.inicio ?? "", fim: doJson.fim ?? "" };
    } else if (diasFunc.includes(diaId) && horarioAbertura && horarioFechamento) {
      horarioDia = { inicio: horarioAbertura, fim: horarioFechamento };
    }
    if (horarioDia && (!horarioDia.inicio || !horarioDia.fim)) horarioDia = null;
    horariosPorDia[diaId] = horarioDia;
  }

  const defaultHorarioInicio = horarioAbertura || "13:00";
  const defaultHorarioFim = horarioFechamento || "19:00";

  const agendamentoDefault: Record<number, HorarioDia> = {};
  for (const [diaIdStr, horarioDia] of Object.entries(horariosPorDia)) {
    if (!horarioDia || !horarioDia.inicio || !horarioDia.fim) continue;
    agendamentoDefault[Number(diaIdStr)] = { inicio: horarioDia.inicio, fim: horarioDia.fim };
  }
  if (Object.keys(agendamentoDefault).length === 0) {
    for (const diaId of [3, 4, 5, 6, 7]) agendamentoDefault[diaId] = { inicio: defaultHorarioInicio, fim: defaultHorarioFim };
  }

  const pagCreditoBandeiras = (cfg.pagamento_credito_bandeiras || "visa,mastercard").split(",").map((v) => v.trim()).filter(Boolean);
  const pagCreditoCustom = parseJsonArray(cfg.pagamento_credito_bandeiras_custom || "[]");
  const pagDebitoBandeiras = (cfg.pagamento_debito_bandeiras || "visa,mastercard").split(",").map((v) => v.trim()).filter(Boolean);
  const pagDebitoCustom = parseJsonArray(cfg.pagamento_debito_bandeiras_custom || "[]");

  const agendDeliveryHorarios = normalizarAgendamentoHorarios(cfg.agendamento_delivery_horarios || "", agendamentoDefault);
  const agendRetiradaHorarios = normalizarAgendamentoHorarios(cfg.agendamento_retirada_horarios || "", agendamentoDefault);

  return {
    ok: true as const,
    souAdminPrincipal: await souAdminPrincipal(adminId, perfil),
    lojaLinkBase,
    loja: {
      nome: cfg.nome_loja || "",
      contato: cfg.loja_contato || "",
      descricao: cfg.loja_descricao || "",
      cpf: cfg.cobranca_cpf || "",
      cnpj: cfg.loja_cnpj || "",
      link: lojaLink,
      linkSlug: lojaLinkSlug,
      instagram: cfg.loja_instagram || "",
      tiktok: cfg.loja_tiktok || "",
      cep: cfg.loja_cep || "",
      rua: cfg.loja_rua || "",
      numero: cfg.loja_numero || "",
      bairro: cfg.loja_bairro || "",
      cidade: cfg.loja_cidade || "",
      estado: cfg.loja_estado || "",
      complemento: cfg.loja_complemento || "",
      capa: cfg.loja_capa || "",
      perfil: cfg.loja_perfil || "",
      verificada: cfg.loja_verificada === "1",
      temaCorMenu: cfg.tema_cor_menu || "#e63770",
    },
    horarios: { abertura: horarioAbertura, fechamento: horarioFechamento, diasFuncionamento: diasFunc, porDia: horariosPorDia },
    pagamento: {
      dinheiroAtivo: cfg.pagamento_dinheiro_ativo !== "0",
      pix: { ativo: cfg.pagamento_pix_ativo !== "0", chave: cfg.pagamento_pix_chave || "", nome: cfg.pagamento_pix_nome || "" },
      credito: { ativo: cfg.pagamento_credito_ativo !== "0", taxaAtiva: cfg.pagamento_credito_taxa_ativa === "1", taxa: Number(cfg.pagamento_credito_taxa || 0), bandeiras: pagCreditoBandeiras, bandeirasCustom: pagCreditoCustom },
      debito: { ativo: cfg.pagamento_debito_ativo !== "0", taxaAtiva: cfg.pagamento_debito_taxa_ativa === "1", taxa: Number(cfg.pagamento_debito_taxa || 0), bandeiras: pagDebitoBandeiras, bandeirasCustom: pagDebitoCustom },
      voucherAtivo: cfg.pagamento_voucher_ativo === "1",
      fiadoAtivo: cfg.pagamento_fiado_ativo === "1",
    },
    cashback: { ativo: cfg.cashback_ativo === "1", expiraDias: Number(cfg.cashback_expira_dias || 20), carenciaHoras: Number(cfg.cashback_carencia_horas || 12), percentual: Number(cfg.cashback_percentual || 1) },
    clubePontosAtivo: cfg.clube_pontos_ativo === "1",
    crossSellAtivo: cfg.cross_sell_ativo === "1",
    pedidos: {
      receberPedidosAtivo: cfg.receber_pedidos_ativo !== "0",
      gestorPedidosAtivo: cfg.gestor_pedidos_ativo !== "0",
      notificarPedidoWhatsappAtivo: cfg.notificar_pedido_whatsapp_ativo !== "0",
      aceiteAutomaticoDiggyAtivo: cfg.aceite_automatico_diggy_ativo === "1",
      whatsappNumero: cfg.whatsapp_numero || "",
      entrega: { ativo: cfg.pedido_entrega_ativo !== "0", tempoMin: Number(cfg.tempo_entrega_min || 30), tempoMax: Number(cfg.tempo_entrega_max || 40), horarioIni: cfg.horario_entrega_ini || "", horarioFim: cfg.horario_entrega_fim || "" },
      retirada: { ativo: cfg.pedido_retirada_ativo !== "0", tempoMin: Number(cfg.tempo_retirada_min || 15), tempoMax: Number(cfg.tempo_retirada_max || 30) },
      localAtivo: cfg.pedido_local_ativo === "1",
      pedidoMinimoEntregaAtivo: cfg.pedido_minimo_entrega_ativo === "1",
      pedidoMinimoEntrega: Number(cfg.pedido_minimo_entrega || 0),
      pedidoMinimoRetiradaAtivo: cfg.pedido_minimo_retirada_ativo === "1",
      pedidoMinimoRetirada: Number(cfg.pedido_minimo_retirada || 0),
    },
    agendamento: {
      delivery: { ativo: cfg.agendamento_delivery_ativo === "1", minTipo: cfg.agendamento_delivery_min_tipo || "dias", minValor: Number(cfg.agendamento_delivery_min_valor || 1), maxTipo: cfg.agendamento_delivery_max_tipo || "dias", maxValor: Number(cfg.agendamento_delivery_max_valor || 30), horarios: agendDeliveryHorarios },
      retirada: { ativo: cfg.agendamento_retirada_ativo === "1", minTipo: cfg.agendamento_retirada_min_tipo || "dias", minValor: Number(cfg.agendamento_retirada_min_valor || 1), maxTipo: cfg.agendamento_retirada_max_tipo || "dias", maxValor: Number(cfg.agendamento_retirada_max_valor || 30), horarios: agendRetiradaHorarios },
    },
    taxaEntrega: {
      tipo: cfg.taxa_entrega_tipo || "dinamica",
      gratis: cfg.taxa_entrega_gratis === "1",
      fixa: { valor: Number(cfg.taxa_entrega || 0), tempoMin: Number(cfg.taxa_entrega_tempo_min || 40), tempoMax: Number(cfg.taxa_entrega_tempo_max || 60) },
    },
    versiculoDashboardAtivo: cfg.versiculo_dashboard_ativo !== "0",
    horariosSemana,
  };
}

export async function detalheConfiguracoes(lojaId: number, adminId: number, perfil: string, lojaLinkBase: string) {
  return montarDetalheConfiguracoes(lojaId, adminId, perfil, lojaLinkBase);
}

export type SalvarConfiguracoesInput = Record<string, unknown> & {
  loja_capa_base64?: string;
  loja_capa_remover?: boolean;
  loja_perfil_base64?: string;
  loja_perfil_remover?: boolean;
};

function boolFlag(v: unknown): boolean {
  return v === "1" || v === 1 || v === true;
}

function toFloatConfig(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const limpo = String(v).replace(",", ".").replace(/[^0-9.]/g, "");
  return Number(limpo) || 0;
}

function validarCustomJson(json: unknown): boolean {
  if (json === "" || json === undefined || json === null) return true;
  try {
    const decoded = typeof json === "string" ? JSON.parse(json) : json;
    if (!Array.isArray(decoded)) return false;
    for (const item of decoded) {
      if (!item || typeof item !== "object") return false;
      const o = item as Record<string, unknown>;
      if (!String(o.slug ?? "").trim() || !String(o.label ?? "").trim()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function salvarConfiguracoes(lojaId: number, body: SalvarConfiguracoesInput): Promise<{ ok: true } | { ok: false; msg: string }> {
  const dados: Record<string, unknown> = { ...body };

  if ("cashback_ativo" in dados || "cashback_percentual" in dados || "cashback_expira_dias" in dados) {
    const ativo = boolFlag(dados.cashback_ativo ?? "0");
    const percentual = toFloatConfig(dados.cashback_percentual ?? 0);
    const dias = Number(dados.cashback_expira_dias ?? 0);
    if (ativo) {
      if (dias <= 0) return { ok: false, msg: "Informe quantos dias o cashback deve expirar." };
      if (percentual <= 0 || percentual > 100) return { ok: false, msg: "Informe um percentual de cashback valido." };
    }
  }

  if ("pagamento_pix_ativo" in dados || "pagamento_credito_ativo" in dados || "pagamento_debito_ativo" in dados) {
    if (boolFlag(dados.pagamento_pix_ativo ?? "0")) {
      if (!String(dados.pagamento_pix_chave ?? "").trim() || !String(dados.pagamento_pix_nome ?? "").trim()) return { ok: false, msg: "Preencha os dados do Pix." };
    }
    if (boolFlag(dados.pagamento_credito_ativo ?? "0") && !String(dados.pagamento_credito_bandeiras ?? "").trim()) {
      return { ok: false, msg: "Selecione ao menos uma bandeira de credito." };
    }
    if (boolFlag(dados.pagamento_debito_ativo ?? "0") && !String(dados.pagamento_debito_bandeiras ?? "").trim()) {
      return { ok: false, msg: "Selecione ao menos uma bandeira de debito." };
    }
    if (boolFlag(dados.pagamento_credito_taxa_ativa ?? "0")) {
      const taxa = toFloatConfig(dados.pagamento_credito_taxa ?? 0);
      if (taxa <= 0 || taxa > 100) return { ok: false, msg: "Informe uma taxa valida para credito." };
    }
    if (boolFlag(dados.pagamento_debito_taxa_ativa ?? "0")) {
      const taxa = toFloatConfig(dados.pagamento_debito_taxa ?? 0);
      if (taxa <= 0 || taxa > 100) return { ok: false, msg: "Informe uma taxa valida para debito." };
    }
    if ("pagamento_credito_bandeiras_custom" in dados && !validarCustomJson(dados.pagamento_credito_bandeiras_custom)) return { ok: false, msg: "Bandeiras customizadas de credito invalidas." };
    if ("pagamento_debito_bandeiras_custom" in dados && !validarCustomJson(dados.pagamento_debito_bandeiras_custom)) return { ok: false, msg: "Bandeiras customizadas de debito invalidas." };
  }

  const camposImagem: { chave: string; base64Campo: string; removerCampo: string }[] = [
    { chave: "loja_capa", base64Campo: "loja_capa_base64", removerCampo: "loja_capa_remover" },
    { chave: "loja_perfil", base64Campo: "loja_perfil_base64", removerCampo: "loja_perfil_remover" },
  ];

  for (const campo of camposImagem) {
    const base64 = String(dados[campo.base64Campo] ?? "").trim();
    const remover = boolFlag(dados[campo.removerCampo] ?? "0");
    delete dados[campo.base64Campo];
    delete dados[campo.removerCampo];
    if (base64 === "" && !remover) continue;

    const [atualLinha] = await db.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.chave, campo.chave), eq(configuracoes.loja_id, lojaId))).limit(1);
    const atual = atualLinha?.valor ?? null;

    if (remover) {
      await storageDelete(atual);
      dados[campo.chave] = "";
      continue;
    }

    const nova = await storageSaveBase64(base64, "loja", campo.chave, lojaId);
    if (!nova) return { ok: false, msg: "Imagem invalida." };
    dados[campo.chave] = nova;
    if (atual && atual !== nova) await storageDelete(atual);
  }

  for (const [chave, valorBruto] of Object.entries(dados)) {
    let valor: string;
    if (chave === "dias_funcionamento") {
      valor = (Array.isArray(valorBruto) ? valorBruto : []).map((v) => parseInt(String(v), 10)).join(",");
    } else if (Array.isArray(valorBruto) || (valorBruto && typeof valorBruto === "object")) {
      valor = JSON.stringify(valorBruto);
    } else {
      valor = String(valorBruto ?? "");
    }

    await db
      .insert(configuracoes)
      .values({ loja_id: lojaId, chave, valor })
      .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
  }

  return { ok: true };
}

const CHAVES_TOGGLE_PERMITIDAS = ["versiculo_dashboard_ativo"];

export async function toggleConfig(lojaId: number, chave: string, ativo: boolean): Promise<{ ok: true; ativo: boolean } | { ok: false; msg: string }> {
  if (!CHAVES_TOGGLE_PERMITIDAS.includes(chave)) return { ok: false, msg: "Configuracao invalida." };
  const valor = ativo ? "1" : "0";
  await db
    .insert(configuracoes)
    .values({ loja_id: lojaId, chave, valor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor } });
  return { ok: true, ativo };
}
