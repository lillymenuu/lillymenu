import "server-only";
import { createHash } from "node:crypto";
import { and, eq, lte, gte, or, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { mesas, cupons, avaliacoes, lojas, configuracoes } from "@/db/schema";
import { getConfigs, getConfig } from "@/db/queries/config";
import { estaAberto } from "@/db/queries/lojaStatus";
import { reservaMapaPdv } from "@/db/queries/pdvReservas";
import { BANDEIRAS_PADRAO } from "@/lib/settings";

/*
 * Equivalente de helpers/loja_context.php::obterLojaIdDaRequisicao() (so o
 * caminho por slug — o Next resolve a loja pelo path /store/[slug], nao por
 * query string): casa contra configuracoes.link_loja (exato ou como sufixo
 * de URL) e, por ultimo, contra o nome exato da loja.
 */
export async function resolverLojaIdPorSlug(slugInput: string): Promise<number | null> {
  const slug = slugInput.replace(/\.php$/i, "").trim();
  if (slug === "") return null;
  if (/^\d+$/.test(slug)) return Number(slug);

  const slugLimpo = slug.replace(/[^a-zA-Z0-9_-]/g, "");
  if (slugLimpo !== "") {
    const [linha] = await db
      .select({ lojaId: configuracoes.loja_id })
      .from(configuracoes)
      .where(and(eq(configuracoes.chave, "link_loja"), or(eq(configuracoes.valor, slugLimpo), like(configuracoes.valor, `%/${slugLimpo}`), like(configuracoes.valor, `%/${slugLimpo}/%`))))
      .limit(1);
    if (linha) return linha.lojaId;
  }

  const [porNome] = await db.select({ id: lojas.id }).from(lojas).where(eq(lojas.nome, slug)).limit(1);
  return porNome?.id ?? null;
}

/*
 * Equivalente de helpers/loja_perfil.php (montarPerfilLoja): perfil/config/
 * contexto completo da loja publica (/store/[slug]). Usado so pela pagina
 * inicial da loja — o resto (catalogo, variacoes, cupom, etc.) tem suas
 * proprias funcoes.
 */

function fixImgPath(caminho: string, baseUrl: string): string {
  if (!caminho) return "";
  if (/^https?:\/\//i.test(caminho) || caminho.startsWith("/")) return caminho;
  return `${baseUrl.replace(/\/+$/, "")}/${caminho}`;
}

/** Equivalente de admin/helpers/whatsapp.php::entregaDisponivelAgora(). */
async function entregaDisponivelAgora(lojaId: number): Promise<boolean> {
  const cfg = await getConfigs(lojaId, ["pedido_entrega_ativo", "horario_entrega_ini", "horario_entrega_fim", "fuso_horario"]);
  if (cfg.pedido_entrega_ativo !== "" && cfg.pedido_entrega_ativo !== "1") return false;

  const ini = cfg.horario_entrega_ini.trim();
  const fim = cfg.horario_entrega_fim.trim();
  if (ini === "" || fim === "") return true;

  const fuso = cfg.fuso_horario || "America/Fortaleza";
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const hora = `${partes.find((p) => p.type === "hour")?.value ?? "00"}:${partes.find((p) => p.type === "minute")?.value ?? "00"}`;
  return hora >= ini && hora <= fim;
}

function bandeirasLabelPorGrupo(selecionadasRaw: string, customRaw: string): string[] {
  const selecionadas = selecionadasRaw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const mapa: Record<string, string> = { ...BANDEIRAS_PADRAO };
  try {
    const custom = JSON.parse(customRaw || "[]");
    if (Array.isArray(custom)) {
      for (const item of custom) {
        if (!item || typeof item !== "object") continue;
        const slug = String((item as Record<string, unknown>).slug ?? "").trim();
        const label = String((item as Record<string, unknown>).label ?? "").trim();
        if (slug === "" || label === "") continue;
        mapa[slug] = label;
      }
    }
  } catch {
    /* JSON invalido: ignora bandeiras customizadas */
  }
  return selecionadas.filter((s) => mapa[s]).map((s) => mapa[s]);
}

function jsonOuVazio<T extends object>(raw: string, fallback: T): T {
  try {
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === "object" ? (decoded as T) : fallback;
  } catch {
    return fallback;
  }
}

export type SemanaHorarioDia = { dia: string; hoje: boolean; aberto: boolean; inicio: string; fim: string; fechaBreve: boolean };
export type AgendHorario = { inicio: string; fim: string };

export type PerfilLoja = {
  mesaId: number;
  mesaNome: string | null;
  cupomPreenchido: string | null;
  nomeLoja: string;
  lojaVerificada: boolean;
  lojaAtiva: boolean;
  slug: string;
  lojaCanonicalUrl: string;
  descLoja: string;
  capaLoja: string;
  perfilLoja: string;
  lojaFlyers: string[];
  flyersAtivo: boolean;
  taxaEntrega: number;
  pedidoMin: number;
  pedidoMinEntregaAtivo: boolean;
  pedidoMinEntrega: number;
  pedidoMinRetiradaAtivo: boolean;
  pedidoMinRetirada: number;
  pedidoMinExibir: number;
  tEntMin: number;
  tEntMax: number;
  tRetMin: number;
  tRetMax: number;
  pixAtivo: boolean;
  pixChave: string;
  pixNome: string;
  dinAtivo: boolean;
  credAtivo: boolean;
  debAtivo: boolean;
  bandeirasCredito: string[];
  bandeirasDebito: string[];
  entAtiva: boolean;
  retAtiva: boolean;
  taxasBairro: Record<string, number>;
  taxaEntregaTipo: string;
  taxaEntregaGratis: boolean;
  clubePontosAtivo: boolean;
  temaCorMenu: string;
  cashbackPct: number;
  cashbackAtivo: boolean;
  cuponsAtivo: boolean;
  avaliacaoMedia: number;
  avaliacaoTotal: number;
  lojaAberta: boolean;
  pausaAtivaTitulo: string;
  pausaAtivaFim: string;
  proximoHorario: string;
  lojaContato: string;
  lojaInstagram: string;
  lojaTiktok: string;
  lojaRua: string;
  lojaNumero: string;
  lojaBairro: string;
  lojaCidade: string;
  lojaEstado: string;
  lojaCep: string;
  enderecoLoja: string;
  catalogoVersao: string;
  semanaHorarios: SemanaHorarioDia[];
  geoAtivo: boolean;
  agendamentoDeliveryAtivo: boolean;
  agendamentoRetiradaAtivo: boolean;
  agendDeliveryMinTipo: string;
  agendDeliveryMinVal: number;
  agendDeliveryMaxVal: number;
  agendDeliveryMaxTipo: string;
  agendRetiradaMinTipo: string;
  agendRetiradaMinVal: number;
  agendRetiradaMaxVal: number;
  agendRetiradaMaxTipo: string;
  agendDeliveryHorarios: Record<string, AgendHorario>;
  agendRetiradaHorarios: Record<string, AgendHorario>;
};

const CHAVES = [
  "nome_loja",
  "loja_verificada",
  "link_loja",
  "loja_descricao",
  "loja_capa",
  "loja_perfil",
  "loja_flyers",
  "loja_flyers_ativo",
  "taxa_entrega",
  "pedido_minimo",
  "pedido_minimo_entrega_ativo",
  "pedido_minimo_entrega",
  "pedido_minimo_retirada_ativo",
  "pedido_minimo_retirada",
  "tempo_entrega_min",
  "tempo_entrega_max",
  "tempo_retirada_min",
  "tempo_retirada_max",
  "pagamento_pix_ativo",
  "pagamento_pix_chave",
  "pagamento_pix_nome",
  "pagamento_dinheiro_ativo",
  "pagamento_credito_ativo",
  "pagamento_debito_ativo",
  "pagamento_credito_bandeiras",
  "pagamento_credito_bandeiras_custom",
  "pagamento_debito_bandeiras",
  "pagamento_debito_bandeiras_custom",
  "pedido_retirada_ativo",
  "taxas_bairro",
  "taxa_entrega_tipo",
  "taxa_entrega_gratis",
  "clube_pontos_ativo",
  "tema_cor_menu",
  "cashback_percentual",
  "cashback_ativo",
  "receber_pedidos_ativo",
  "loja_contato",
  "loja_instagram",
  "loja_tiktok",
  "loja_rua",
  "loja_numero",
  "loja_bairro",
  "loja_cidade",
  "loja_estado",
  "loja_cep",
  "agendamento_delivery_ativo",
  "agendamento_retirada_ativo",
  "agendamento_delivery_min_tipo",
  "agendamento_delivery_min_valor",
  "agendamento_delivery_max_valor",
  "agendamento_delivery_max_tipo",
  "agendamento_retirada_min_tipo",
  "agendamento_retirada_min_valor",
  "agendamento_retirada_max_valor",
  "agendamento_retirada_max_tipo",
  "agendamento_delivery_horarios",
  "agendamento_retirada_horarios",
  "catalogo_versao",
  "horarios_semana",
  "horario_abertura",
  "horario_fechamento",
  "dias_funcionamento",
];

export async function montarPerfilLoja(lojaId: number, opts: { mesaId?: number; cupom?: string; baseUrl: string }): Promise<PerfilLoja> {
  const cfg = await getConfigs(lojaId, CHAVES);
  const baseUrl = opts.baseUrl;

  let mesaId = 0;
  let mesaNome: string | null = null;
  if (opts.mesaId && opts.mesaId > 0) {
    const [mesa] = await db.select({ id: mesas.id, nome: mesas.nome }).from(mesas).where(and(eq(mesas.id, opts.mesaId), eq(mesas.loja_id, lojaId), eq(mesas.ativo, true))).limit(1);
    if (mesa) {
      mesaId = mesa.id;
      mesaNome = mesa.nome;
    }
  }

  let cupomPreenchido: string | null = null;
  const cupomParam = (opts.cupom ?? "").trim().toUpperCase();
  if (cupomParam !== "") {
    const [cupom] = await db.select({ codigo: cupons.codigo }).from(cupons).where(and(eq(cupons.codigo, cupomParam), eq(cupons.loja_id, lojaId), eq(cupons.ativo, true))).limit(1);
    if (cupom) cupomPreenchido = cupom.codigo;
  }

  const nomeLoja = cfg.nome_loja || "Minha Loja";
  const lojaVerificada = cfg.loja_verificada === "1";

  const [lojaRow] = await db.select({ ativo: lojas.ativo }).from(lojas).where(eq(lojas.id, lojaId)).limit(1);
  const lojaAtiva = lojaRow?.ativo !== false;

  const linkLoja = cfg.link_loja || "";
  let lojaLinkSlugCurto = "";
  if (linkLoja) {
    const mParam = linkLoja.match(/[?&]loja=([^&]+)/);
    const mPath = linkLoja.match(/\/([^/?]+)\/?$/);
    if (mParam) lojaLinkSlugCurto = decodeURIComponent(mParam[1]);
    else if (mPath) lojaLinkSlugCurto = mPath[1];
    else lojaLinkSlugCurto = linkLoja.replace(/^\/+|\/+$/g, "");
    lojaLinkSlugCurto = lojaLinkSlugCurto.replace(/\.php$/i, "");
  }
  if (lojaLinkSlugCurto === "") {
    lojaLinkSlugCurto = nomeLoja
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  const slug = lojaLinkSlugCurto;
  const lojaCanonicalUrl = slug ? `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(slug)}` : "";

  const descLoja = cfg.loja_descricao || "";
  const capaLoja = fixImgPath(cfg.loja_capa || "", baseUrl);
  const perfilLoja = fixImgPath(cfg.loja_perfil || "", baseUrl);
  const lojaFlyersRaw = jsonOuVazio<string[]>(cfg.loja_flyers || "[]", []);
  const lojaFlyers = (Array.isArray(lojaFlyersRaw) ? lojaFlyersRaw : []).map((f) => fixImgPath(f, baseUrl)).filter(Boolean);
  const flyersAtivo = cfg.loja_flyers_ativo !== "0";

  const taxaEntrega = Number(cfg.taxa_entrega || 0);
  const pedidoMin = Number(cfg.pedido_minimo || 0);
  const pedidoMinEntregaAtivo = cfg.pedido_minimo_entrega_ativo === "1";
  const pedidoMinEntrega = Number(cfg.pedido_minimo_entrega || 0);
  const pedidoMinRetiradaAtivo = cfg.pedido_minimo_retirada_ativo === "1";
  const pedidoMinRetirada = Number(cfg.pedido_minimo_retirada || 0);
  const pedidoMinsAtivos = [pedidoMinEntregaAtivo ? pedidoMinEntrega : 0, pedidoMinRetiradaAtivo ? pedidoMinRetirada : 0].filter((v) => v > 0);
  const pedidoMinExibir = pedidoMinsAtivos.length > 0 ? Math.min(...pedidoMinsAtivos) : 0;

  const tEntMin = Number(cfg.tempo_entrega_min || 30);
  const tEntMax = Number(cfg.tempo_entrega_max || 50);
  const tRetMin = Number(cfg.tempo_retirada_min || 15);
  const tRetMax = Number(cfg.tempo_retirada_max || 25);

  const pixAtivo = cfg.pagamento_pix_ativo !== "0";
  const pixChave = cfg.pagamento_pix_chave || "";
  const pixNome = cfg.pagamento_pix_nome || "";
  const dinAtivo = cfg.pagamento_dinheiro_ativo !== "0";
  const credAtivo = cfg.pagamento_credito_ativo !== "0";
  const debAtivo = cfg.pagamento_debito_ativo !== "0";
  const bandeirasCredito = credAtivo ? bandeirasLabelPorGrupo(cfg.pagamento_credito_bandeiras || "visa,mastercard", cfg.pagamento_credito_bandeiras_custom || "[]") : [];
  const bandeirasDebito = debAtivo ? bandeirasLabelPorGrupo(cfg.pagamento_debito_bandeiras || "visa,mastercard", cfg.pagamento_debito_bandeiras_custom || "[]") : [];

  const entAtiva = await entregaDisponivelAgora(lojaId);
  const retAtiva = cfg.pedido_retirada_ativo !== "0";
  const taxasBairro = jsonOuVazio<Record<string, number>>(cfg.taxas_bairro || "{}", {});
  const taxaEntregaTipo = cfg.taxa_entrega_tipo || "fixa";
  const taxaEntregaGratis = cfg.taxa_entrega_gratis === "1";
  const clubePontosAtivo = cfg.clube_pontos_ativo === "1";
  let temaCorMenu = cfg.tema_cor_menu || "#e63770";
  if (!/^#[0-9a-fA-F]{6}$/.test(temaCorMenu)) temaCorMenu = "#e63770";
  const cashbackPct = Number(cfg.cashback_percentual || 0);
  const cashbackAtivo = cfg.cashback_ativo === "1";

  const [{ n: cuponsCount }] = await db.select({ n: sql<string>`count(*)` }).from(cupons).where(and(eq(cupons.loja_id, lojaId), eq(cupons.ativo, true)));
  const cuponsAtivo = Number(cuponsCount) > 0;

  const [avRow] = await db.select({ media: sql<string>`round(avg(${avaliacoes.nota}), 1)`, total: sql<string>`count(*)` }).from(avaliacoes).where(eq(avaliacoes.loja_id, lojaId));
  const avaliacaoTotal = Number(avRow?.total ?? 0);
  const avaliacaoMedia = avaliacaoTotal > 0 ? Number(avRow?.media ?? 0) : 0;

  const receberPedidosAtivo = cfg.receber_pedidos_ativo !== "0";
  const lojaAberta = (await estaAberto(lojaId)) && receberPedidosAtivo;

  let pausaAtivaTitulo = "";
  let pausaAtivaFim = "";
  if (!lojaAberta) {
    const fuso = (await getConfig(lojaId, "fuso_horario", "America/Fortaleza")) || "America/Fortaleza";
    const dataHoje = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
    const partes = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const hora = `${partes.find((p) => p.type === "hour")?.value ?? "00"}:${partes.find((p) => p.type === "minute")?.value ?? "00"}`;
    const agoraStr = `${dataHoje} ${hora}:00`;
    const { pausasProgramadas } = await import("@/db/schema");
    const [pausa] = await db
      .select({ titulo: pausasProgramadas.titulo, dataFim: pausasProgramadas.data_fim, horaFim: pausasProgramadas.hora_fim })
      .from(pausasProgramadas)
      .where(
        and(
          eq(pausasProgramadas.loja_id, lojaId),
          lte(sql`concat(${pausasProgramadas.data_inicio}, ' ', ${pausasProgramadas.hora_inicio})`, agoraStr),
          gte(sql`concat(${pausasProgramadas.data_fim}, ' ', ${pausasProgramadas.hora_fim})`, agoraStr)
        )
      )
      .limit(1);
    if (pausa) {
      pausaAtivaTitulo = pausa.titulo;
      pausaAtivaFim = `${pausa.dataFim} ${pausa.horaFim}`;
    }
  }

  let proximoHorario = "";
  const diasNomes: Record<number, string> = { 1: "Dom", 2: "Seg", 3: "Ter", 4: "Qua", 5: "Qui", 6: "Sex", 7: "Sab" };
  if (!lojaAberta) {
    const hs = jsonOuVazio<Record<string, AgendHorario>>(cfg.horarios_semana || "", {});
    const fuso = (await getConfig(lojaId, "fuso_horario", "America/Fortaleza")) || "America/Fortaleza";
    const dataHoje = new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(new Date());
    const diaJsHoje = new Date(`${dataHoje}T00:00:00`).getDay();
    const ckHoje = diaJsHoje + 1;
    const partes = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const horaAtual = `${partes.find((p) => p.type === "hour")?.value ?? "00"}:${partes.find((p) => p.type === "minute")?.value ?? "00"}`;

    const hdHoje = hs[ckHoje] ?? hs[String(ckHoje)];
    if (hdHoje?.inicio && horaAtual < hdHoje.inicio) {
      proximoHorario = `hoje às ${hdHoje.inicio}`;
    }
    if (!proximoHorario) {
      for (let i = 1; i <= 7; i++) {
        const ck = ((ckHoje - 1 + i) % 7) + 1;
        const hd = hs[ck] ?? hs[String(ck)];
        if (hd?.inicio) {
          proximoHorario = `${diasNomes[ck]} às ${hd.inicio}`;
          break;
        }
      }
    }
    if (!proximoHorario && cfg.horario_abertura) proximoHorario = `às ${cfg.horario_abertura}`;
  }

  const lojaContato = cfg.loja_contato || "";
  const lojaInstagram = (cfg.loja_instagram || "").replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, "").replace(/^\/+|\/+$|^@+/g, "");
  const lojaTiktok = cfg.loja_tiktok || "";
  const lojaRua = cfg.loja_rua || "";
  const lojaNumero = cfg.loja_numero || "";
  const lojaBairro = cfg.loja_bairro || "";
  const lojaCidade = cfg.loja_cidade || "";
  const lojaEstado = cfg.loja_estado || "";
  const lojaCep = cfg.loja_cep || "";
  const enderecoLoja = [
    (lojaRua + (lojaNumero ? `, ${lojaNumero}` : "")).trim(),
    lojaBairro,
    (lojaCidade + (lojaEstado ? `/${lojaEstado}` : "")).trim(),
    lojaCep ? `CEP ${lojaCep}` : "",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();

  const agendDeliveryAtivo = cfg.agendamento_delivery_ativo === "1";
  const agendRetiradaAtivo = cfg.agendamento_retirada_ativo === "1";
  const agendDeliveryHorarios = jsonOuVazio<Record<string, AgendHorario>>(cfg.agendamento_delivery_horarios || "{}", {});
  const agendRetiradaHorarios = jsonOuVazio<Record<string, AgendHorario>>(cfg.agendamento_retirada_horarios || "{}", {});

  const reservas = await reservaMapaPdv(lojaId);
  const catalogoVersaoBase = cfg.catalogo_versao || "";
  let catalogoVersao = catalogoVersaoBase;
  if (reservas.size > 0) {
    const ordenado = Object.fromEntries([...reservas.entries()].sort((a, b) => a[0] - b[0]));
    const hash = createHash("md5").update(JSON.stringify(ordenado)).digest("hex").slice(0, 10);
    catalogoVersao = `${catalogoVersaoBase}|r${hash}`;
  }

  const geoAtivo = (await getConfig(0, "saas_nominatim_ativo", "1")) === "1";

  const diasFuncInfo = (cfg.dias_funcionamento || "")
    .split(",")
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isFinite(v));
  const diasNomesInfo: Record<number, string> = { 1: "Domingo", 2: "Segunda", 3: "Terça", 4: "Quarta", 5: "Quinta", 6: "Sexta", 7: "Sábado" };
  const fusoInfo = (await getConfig(lojaId, "fuso_horario", "America/Fortaleza")) || "America/Fortaleza";
  const dataHojeInfo = new Intl.DateTimeFormat("en-CA", { timeZone: fusoInfo }).format(new Date());
  const ckHojeInfo = new Date(`${dataHojeInfo}T00:00:00`).getDay() + 1;
  const partesInfo = new Intl.DateTimeFormat("en-CA", { timeZone: fusoInfo, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const horaAtualMinInfo = Number(partesInfo.find((p) => p.type === "hour")?.value ?? "0") * 60 + Number(partesInfo.find((p) => p.type === "minute")?.value ?? "0");
  const horSemanaInfo = jsonOuVazio<Record<string, AgendHorario>>(cfg.horarios_semana || "", {});

  const semanaHorarios: SemanaHorarioDia[] = [];
  for (let dk = 1; dk <= 7; dk++) {
    let hd = horSemanaInfo[dk] ?? horSemanaInfo[String(dk)];
    if (!hd && cfg.horario_abertura && cfg.horario_fechamento) {
      if (diasFuncInfo.length === 0 || diasFuncInfo.includes(dk)) {
        hd = { inicio: cfg.horario_abertura, fim: cfg.horario_fechamento };
      }
    }
    const isHoje = dk === ckHojeInfo;
    const aberto = Boolean(hd?.inicio && hd?.fim);
    let fechaBreve = false;
    if (isHoje && aberto && hd?.fim) {
      const [hh, mm] = hd.fim.split(":").map(Number);
      const fimMin = (hh || 0) * 60 + (mm || 0);
      const diff = fimMin - horaAtualMinInfo;
      fechaBreve = diff > 0 && diff <= 60;
    }
    semanaHorarios.push({ dia: diasNomesInfo[dk], hoje: isHoje, aberto, inicio: aberto ? hd!.inicio : "", fim: aberto ? hd!.fim : "", fechaBreve });
  }

  return {
    mesaId,
    mesaNome,
    cupomPreenchido,
    nomeLoja,
    lojaVerificada,
    lojaAtiva,
    slug,
    lojaCanonicalUrl,
    descLoja,
    capaLoja,
    perfilLoja,
    lojaFlyers,
    flyersAtivo,
    taxaEntrega,
    pedidoMin,
    pedidoMinEntregaAtivo,
    pedidoMinEntrega,
    pedidoMinRetiradaAtivo,
    pedidoMinRetirada,
    pedidoMinExibir,
    tEntMin,
    tEntMax,
    tRetMin,
    tRetMax,
    pixAtivo,
    pixChave,
    pixNome,
    dinAtivo,
    credAtivo,
    debAtivo,
    bandeirasCredito,
    bandeirasDebito,
    entAtiva,
    retAtiva,
    taxasBairro,
    taxaEntregaTipo,
    taxaEntregaGratis,
    clubePontosAtivo,
    temaCorMenu,
    cashbackPct,
    cashbackAtivo,
    cuponsAtivo,
    avaliacaoMedia,
    avaliacaoTotal,
    lojaAberta,
    pausaAtivaTitulo,
    pausaAtivaFim,
    proximoHorario,
    lojaContato,
    lojaInstagram,
    lojaTiktok,
    lojaRua,
    lojaNumero,
    lojaBairro,
    lojaCidade,
    lojaEstado,
    lojaCep,
    enderecoLoja,
    catalogoVersao,
    semanaHorarios,
    geoAtivo,
    agendamentoDeliveryAtivo: agendDeliveryAtivo,
    agendamentoRetiradaAtivo: agendRetiradaAtivo,
    agendDeliveryMinTipo: cfg.agendamento_delivery_min_tipo || "dias",
    agendDeliveryMinVal: Number(cfg.agendamento_delivery_min_valor || 1),
    agendDeliveryMaxVal: Number(cfg.agendamento_delivery_max_valor || 30),
    agendDeliveryMaxTipo: cfg.agendamento_delivery_max_tipo || "dias",
    agendRetiradaMinTipo: cfg.agendamento_retirada_min_tipo || "dias",
    agendRetiradaMinVal: Number(cfg.agendamento_retirada_min_valor || 1),
    agendRetiradaMaxVal: Number(cfg.agendamento_retirada_max_valor || 30),
    agendRetiradaMaxTipo: cfg.agendamento_retirada_max_tipo || "dias",
    agendDeliveryHorarios,
    agendRetiradaHorarios,
  };
}
