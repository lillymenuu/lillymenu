import "server-only";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes, dadosFiscaisLoja, certificadosFiscais, notasFiscais, pedidos, pedidoItens, pedidoPagamentos, produtos } from "@/db/schema";
import { getConfig, getConfigs } from "@/db/queries/config";
import { dataFortaleza } from "@/db/queries/tempo";
import {
  pnCadastrarCertificado,
  pnCadastrarEmpresa,
  pnAtualizarEmpresa,
  pnEmitirNfce,
  pnConsultarResumoNfce,
  pnCancelarNfce,
  type EnderecoFiscal,
} from "@/db/queries/plugnotas";
import { fnCriarEmpresa, fnAtualizarEmpresa, fnEmitirNfce, fnConsultarNfce, fnCancelarNfce, type EnderecoFiscalFn, type DadosEmpresaFocusNfe } from "@/db/queries/focusnfe";

/*
 * Orquestra o modulo NFCe: cadastro fiscal da loja, upload de certificado,
 * emissao a partir de um pedido e atualizacao de status. Suporta DOIS
 * provedores (PlugNotas e Focus NFe) por tras de uma unica configuracao
 * global (nfce_provedor_ativo, nao e por loja — ver getProvedorNfceAtivo).
 * Ver db/queries/plugnotas.ts e db/queries/focusnfe.ts pros clientes HTTP.
 */

const CHAVE_POR_MEIO_PAGAMENTO: Record<string, string> = {
  dinheiro: "01",
  pix: "17",
  credito: "03",
  debito: "04",
  fiado: "99",
  cashback: "19",
};

export type ProvedorNfce = "plugnotas" | "focusnfe";

export async function getProvedorNfceAtivo(): Promise<ProvedorNfce> {
  const valor = await getConfig(0, "nfce_provedor_ativo", "plugnotas");
  return valor === "focusnfe" ? "focusnfe" : "plugnotas";
}

export async function salvarProvedorNfceAtivo(provedor: ProvedorNfce): Promise<void> {
  await db
    .insert(configuracoes)
    .values({ loja_id: 0, chave: "nfce_provedor_ativo", valor: provedor })
    .onConflictDoUpdate({ target: [configuracoes.loja_id, configuracoes.chave], set: { valor: provedor } });
}

export type DadosFiscaisLoja = typeof dadosFiscaisLoja.$inferSelect;

export async function getDadosFiscaisLoja(lojaId: number): Promise<DadosFiscaisLoja | null> {
  const [linha] = await db.select().from(dadosFiscaisLoja).where(eq(dadosFiscaisLoja.loja_id, lojaId)).limit(1);
  return linha ?? null;
}

export type CertificadoFiscal = typeof certificadosFiscais.$inferSelect;

export async function getCertificadoFiscal(lojaId: number): Promise<CertificadoFiscal | null> {
  const [linha] = await db.select().from(certificadosFiscais).where(eq(certificadosFiscais.loja_id, lojaId)).limit(1);
  return linha ?? null;
}

async function upsertCertificadoFiscalRegistro(lojaId: number, provedor: ProvedorNfce, plugnotasCertificadoId: string | null): Promise<void> {
  const existente = await getCertificadoFiscal(lojaId);
  const patch = { provedor, plugnotas_certificado_id: plugnotasCertificadoId, status: "ativo" as const, atualizado_em: new Date().toISOString() };
  if (existente) {
    await db.update(certificadosFiscais).set(patch).where(eq(certificadosFiscais.loja_id, lojaId));
  } else {
    await db.insert(certificadosFiscais).values({ loja_id: lojaId, ...patch });
  }
}

export type SalvarDadosFiscaisInput = {
  razaoSocial: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  regimeTributario: number;
  regimeTributarioEspecial: number;
  simplesNacional: boolean;
  ambienteProducao: boolean;
  serieNfce: number;
  numeroInicialNfce: number;
  numeracaoAutomatica: boolean;
  idCodigoSegurancaContribuinte?: string;
  codigoSegurancaContribuinte?: string;
};

async function upsertDadosFiscaisLoja(lojaId: number, patch: Partial<typeof dadosFiscaisLoja.$inferInsert>): Promise<void> {
  const existente = await getDadosFiscaisLoja(lojaId);
  if (existente) {
    await db.update(dadosFiscaisLoja).set({ ...patch, atualizado_em: new Date().toISOString() }).where(eq(dadosFiscaisLoja.loja_id, lojaId));
  } else {
    await db.insert(dadosFiscaisLoja).values({ loja_id: lojaId, ...patch });
  }
}

/** Salva os dados fiscais da loja e tenta cadastrar/atualizar a empresa no provedor ativo (exige certificado ja cadastrado). */
export async function salvarDadosFiscaisLoja(lojaId: number, input: SalvarDadosFiscaisInput): Promise<{ ok: true } | { ok: false; erro: string }> {
  await upsertDadosFiscaisLoja(lojaId, {
    razao_social: input.razaoSocial,
    inscricao_estadual: input.inscricaoEstadual,
    inscricao_municipal: input.inscricaoMunicipal,
    regime_tributario: input.regimeTributario,
    regime_tributario_especial: input.regimeTributarioEspecial,
    simples_nacional: input.simplesNacional,
    ambiente_producao: input.ambienteProducao,
    serie_nfce: input.serieNfce,
    numero_inicial_nfce: input.numeroInicialNfce,
    numeracao_automatica: input.numeracaoAutomatica,
    id_codigo_seguranca_contribuinte: input.idCodigoSegurancaContribuinte,
    codigo_seguranca_contribuinte: input.codigoSegurancaContribuinte,
    status: "pendente",
  });

  return cadastrarEmpresaFiscal(lojaId);
}

/** Envia o certificado digital pro provedor ativo. PlugNotas tem endpoint proprio (gera um id referenciavel); Focus NFe nao — o certificado vai embutido direto no cadastro/atualizacao da empresa. */
export async function salvarCertificadoFiscal(
  lojaId: number,
  arquivo: Buffer,
  nomeArquivo: string,
  senha: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const provedor = await getProvedorNfceAtivo();

  if (provedor === "focusnfe") {
    const resultado = await cadastrarEmpresaFiscal(lojaId, { certificadoBase64: arquivo.toString("base64"), senhaCertificado: senha });
    if (!resultado.ok) return resultado;
    await upsertCertificadoFiscalRegistro(lojaId, "focusnfe", null);
    return { ok: true };
  }

  const dadosFiscais = await getDadosFiscaisLoja(lojaId);
  const producao = dadosFiscais?.ambiente_producao ?? false;
  const emailNotificacao = await getConfig(lojaId, "loja_email", "");

  const resultado = await pnCadastrarCertificado(arquivo, nomeArquivo, senha, producao, emailNotificacao || undefined);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  await upsertCertificadoFiscalRegistro(lojaId, "plugnotas", resultado.dados.id);
  return { ok: true };
}

type CertificadoEmbutido = { certificadoBase64: string; senhaCertificado: string };
type MarcarErro = (erro: string) => Promise<{ ok: false; erro: string }>;

/** Cadastra (ou re-cadastra) a loja como empresa no provedor ativo, usando certificado e dados fiscais ja salvos. `certificadoOverride` so e usado pelo fluxo do Focus NFe (ver salvarCertificadoFiscal). */
export async function cadastrarEmpresaFiscal(lojaId: number, certificadoOverride?: CertificadoEmbutido): Promise<{ ok: true } | { ok: false; erro: string }> {
  const provedor = await getProvedorNfceAtivo();
  const [dadosFiscais, cfg] = await Promise.all([
    getDadosFiscaisLoja(lojaId),
    getConfigs(lojaId, ["loja_cnpj", "loja_email", "loja_rua", "loja_numero", "loja_bairro", "loja_cidade", "loja_estado", "loja_cep", "loja_codigo_ibge", "nome_loja"]),
  ]);

  if (!dadosFiscais) return { ok: false, erro: "Preencha os dados fiscais da loja antes de cadastrar." };

  const marcarErro: MarcarErro = async (erro) => {
    await upsertDadosFiscaisLoja(lojaId, { status: "erro", erro_mensagem: erro });
    return { ok: false, erro };
  };

  if (!cfg.loja_cnpj) return marcarErro("CNPJ da loja não cadastrado em Configurações.");
  if (!cfg.loja_codigo_ibge) return marcarErro("Código IBGE do município não cadastrado (use o CEP pra preencher automaticamente).");

  if (provedor === "focusnfe") return cadastrarEmpresaFocusNfe(lojaId, dadosFiscais, cfg, certificadoOverride, marcarErro);
  return cadastrarEmpresaPlugNotas(lojaId, dadosFiscais, cfg, marcarErro);
}

async function cadastrarEmpresaPlugNotas(
  lojaId: number,
  dadosFiscais: DadosFiscaisLoja,
  cfg: Record<string, string>,
  marcarErro: MarcarErro
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const certificado = await getCertificadoFiscal(lojaId);
  if (!certificado || !certificado.plugnotas_certificado_id) return marcarErro("Cadastre o certificado digital antes de prosseguir.");

  const endereco: EnderecoFiscal = {
    logradouro: cfg.loja_rua,
    numero: cfg.loja_numero || "S/N",
    bairro: cfg.loja_bairro,
    cep: cfg.loja_cep.replace(/\D/g, ""),
    estado: cfg.loja_estado,
    codigoCidade: cfg.loja_codigo_ibge,
    descricaoCidade: cfg.loja_cidade,
  };

  const dadosEmpresa = {
    cpfCnpj: cfg.loja_cnpj.replace(/\D/g, ""),
    razaoSocial: dadosFiscais.razao_social ?? cfg.nome_loja,
    nomeFantasia: cfg.nome_loja,
    email: cfg.loja_email || "contato@lillymenu.com",
    inscricaoEstadual: dadosFiscais.inscricao_estadual ?? undefined,
    inscricaoMunicipal: dadosFiscais.inscricao_municipal ?? undefined,
    simplesNacional: dadosFiscais.simples_nacional,
    regimeTributario: dadosFiscais.regime_tributario ?? 1,
    regimeTributarioEspecial: dadosFiscais.regime_tributario_especial ?? 0,
    endereco,
    certificadoId: certificado.plugnotas_certificado_id,
    producao: dadosFiscais.ambiente_producao,
    serieNfce: dadosFiscais.serie_nfce,
    numeroInicialNfce: dadosFiscais.numero_inicial_nfce,
    numeracaoAutomatica: dadosFiscais.numeracao_automatica,
    idCodigoSegurancaContribuinte: dadosFiscais.id_codigo_seguranca_contribuinte ?? undefined,
    codigoSegurancaContribuinte: dadosFiscais.codigo_seguranca_contribuinte ?? undefined,
  };

  // Tenta sempre POST primeiro; se o CNPJ ja estiver cadastrado naquele ambiente
  // (sandbox e producao sao cadastros independentes no PlugNotas), cai pra PATCH.
  let resultado = await pnCadastrarEmpresa(dadosEmpresa);
  if (!resultado.ok && resultado.status === 409) resultado = await pnAtualizarEmpresa(dadosEmpresa);
  if (!resultado.ok) return marcarErro(resultado.erro);

  await upsertDadosFiscaisLoja(lojaId, { status: "ativo", plugnotas_empresa_cadastrada: true, erro_mensagem: null });
  return { ok: true };
}

async function cadastrarEmpresaFocusNfe(
  lojaId: number,
  dadosFiscais: DadosFiscaisLoja,
  cfg: Record<string, string>,
  certificadoOverride: CertificadoEmbutido | undefined,
  marcarErro: MarcarErro
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const endereco: EnderecoFiscalFn = {
    logradouro: cfg.loja_rua,
    numero: cfg.loja_numero || "S/N",
    bairro: cfg.loja_bairro,
    cep: cfg.loja_cep.replace(/\D/g, ""),
    municipio: cfg.loja_cidade,
    uf: cfg.loja_estado,
  };

  const dadosEmpresa: DadosEmpresaFocusNfe = {
    cnpj: cfg.loja_cnpj.replace(/\D/g, ""),
    nome: dadosFiscais.razao_social ?? cfg.nome_loja,
    nomeFantasia: cfg.nome_loja,
    email: cfg.loja_email || undefined,
    inscricaoEstadual: dadosFiscais.inscricao_estadual ?? undefined,
    inscricaoMunicipal: dadosFiscais.inscricao_municipal ?? undefined,
    regimeTributario: dadosFiscais.regime_tributario ?? 1,
    endereco,
    serieNfce: dadosFiscais.serie_nfce,
    numeroInicialNfce: dadosFiscais.numero_inicial_nfce,
    cscIdProducao: dadosFiscais.id_codigo_seguranca_contribuinte ?? undefined,
    cscProducao: dadosFiscais.codigo_seguranca_contribuinte ?? undefined,
    certificadoBase64: certificadoOverride?.certificadoBase64,
    senhaCertificado: certificadoOverride?.senhaCertificado,
  };

  const resultado = dadosFiscais.focusnfe_empresa_id
    ? await fnAtualizarEmpresa(dadosFiscais.focusnfe_empresa_id, dadosEmpresa)
    : await fnCriarEmpresa(dadosEmpresa);

  if (!resultado.ok) return marcarErro(resultado.erro);

  const certificadoPresente = Boolean(certificadoOverride) || Boolean(await getCertificadoFiscal(lojaId));

  await upsertDadosFiscaisLoja(lojaId, {
    status: certificadoPresente ? "ativo" : "pendente",
    erro_mensagem: certificadoPresente ? null : "Cadastre o certificado digital pra ativar a emissão.",
    focusnfe_empresa_id: resultado.dados.id,
    focusnfe_token_producao: resultado.dados.tokenProducao || dadosFiscais.focusnfe_token_producao,
    focusnfe_token_homologacao: resultado.dados.tokenHomologacao || dadosFiscais.focusnfe_token_homologacao,
  });

  return { ok: true };
}

export type NotaFiscal = typeof notasFiscais.$inferSelect;

export async function getNotaFiscalPorPedido(pedidoId: number): Promise<NotaFiscal | null> {
  const [linha] = await db.select().from(notasFiscais).where(eq(notasFiscais.pedido_id, pedidoId)).limit(1);
  return linha ?? null;
}

type ResultadoEmissao = { ok: true; nota: NotaFiscal } | { ok: false; erro: string; produtosSemFiscal?: string[] };
type ValoresBaseNota = { loja_id: number; pedido_id: number; id_integracao: string };

async function registrarErroNota(notaExistente: NotaFiscal | null, valoresBase: ValoresBaseNota, erro: string): Promise<void> {
  if (notaExistente) {
    await db.update(notasFiscais).set({ status: "erro", mensagem_erro: erro, atualizado_em: new Date().toISOString() }).where(eq(notasFiscais.pedido_id, notaExistente.pedido_id));
  } else {
    await db.insert(notasFiscais).values({ ...valoresBase, status: "erro", mensagem_erro: erro });
  }
}

const STATUS_MAP_FOCUSNFE: Record<string, NotaFiscal["status"]> = {
  autorizado: "concluido",
  erro_autorizacao: "rejeitado",
  denegado: "denegado",
  processando_autorizacao: "processando",
  cancelado: "cancelado",
};

/** Emite a NFCe de um pedido (botao manual no detalhe do pedido). idIntegracao/ref = pedido_id garante idempotencia. */
export async function emitirNfceDoPedido(lojaId: number, pedidoId: number): Promise<ResultadoEmissao> {
  const notaExistente = await getNotaFiscalPorPedido(pedidoId);
  if (notaExistente && notaExistente.status !== "erro" && notaExistente.status !== "cancelado") {
    return { ok: true, nota: notaExistente };
  }

  const provedor = await getProvedorNfceAtivo();
  const dadosFiscais = await getDadosFiscaisLoja(lojaId);
  if (!dadosFiscais || dadosFiscais.status !== "ativo") {
    return { ok: false, erro: "Cadastro fiscal da loja ainda não está ativo." };
  }

  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  const itensRaw = await db
    .select({
      nome: pedidoItens.produto_nome,
      quantidade: pedidoItens.quantidade,
      preco: pedidoItens.preco,
      codigo: produtos.codigo,
      ncm: produtos.ncm,
      cfop: produtos.cfop,
      icms: produtos.icms_situacao_tributaria,
    })
    .from(pedidoItens)
    .leftJoin(produtos, eq(produtos.id, pedidoItens.produto_id))
    .where(eq(pedidoItens.pedido_id, pedidoId));

  const produtosSemFiscal = itensRaw.filter((i) => !i.ncm || !i.cfop || (provedor === "focusnfe" && !i.icms)).map((i) => i.nome ?? "item sem nome");
  if (produtosSemFiscal.length > 0) {
    return { ok: false, erro: "Produtos sem dados fiscais cadastrados.", produtosSemFiscal };
  }

  const pagamentosRaw = await db.select({ forma: pedidoPagamentos.forma, valor: pedidoPagamentos.valor }).from(pedidoPagamentos).where(eq(pedidoPagamentos.pedido_id, pedidoId));
  const pagamentos = pagamentosRaw.map((p) => ({ meio: CHAVE_POR_MEIO_PAGAMENTO[p.forma] ?? "99", valor: p.valor }));
  const cfg = await getConfigs(lojaId, ["loja_cnpj"]);
  const idIntegracao = String(pedidoId);
  const valoresBase: ValoresBaseNota = { loja_id: lojaId, pedido_id: pedidoId, id_integracao: idIntegracao };

  if (provedor === "focusnfe") {
    const token = dadosFiscais.ambiente_producao ? dadosFiscais.focusnfe_token_producao : dadosFiscais.focusnfe_token_homologacao;
    if (!token) return { ok: false, erro: "Empresa ainda não tem token do Focus NFe — refaça o cadastro em /nfce." };

    const resultado = await fnEmitirNfce(
      {
        ref: idIntegracao,
        cnpjEmitente: cfg.loja_cnpj.replace(/\D/g, ""),
        itens: itensRaw.map((i, idx) => ({
          numeroItem: idx + 1,
          codigo: i.codigo || "SEM-CODIGO",
          descricao: i.nome ?? "Item",
          ncm: i.ncm!,
          cfop: i.cfop!,
          quantidade: i.quantidade ?? 1,
          valorUnitario: i.preco ?? 0,
          unidade: "UN",
          icmsSituacaoTributaria: i.icms!,
        })),
        pagamentos,
      },
      token,
      dadosFiscais.ambiente_producao
    );

    if (!resultado.ok) {
      await registrarErroNota(notaExistente, valoresBase, resultado.erro);
      return { ok: false, erro: resultado.erro };
    }

    const r = resultado.dados;
    const patch = {
      status: STATUS_MAP_FOCUSNFE[r.status] ?? "erro",
      numero: r.numero ?? null,
      serie: r.serie ?? null,
      chave: r.chave ?? null,
      mensagem_erro: r.status !== "autorizado" ? (r.mensagemSefaz ?? null) : null,
      xml_url: r.xml ?? null,
      pdf_url: r.pdf ?? null,
      atualizado_em: new Date().toISOString(),
    };

    const [nota] = notaExistente
      ? await db.update(notasFiscais).set(patch).where(eq(notasFiscais.pedido_id, pedidoId)).returning()
      : await db.insert(notasFiscais).values({ ...valoresBase, ...patch }).returning();

    return { ok: true, nota };
  }

  const resultado = await pnEmitirNfce(
    {
      idIntegracao,
      cpfCnpjEmitente: cfg.loja_cnpj.replace(/\D/g, ""),
      itens: itensRaw.map((i) => ({
        codigo: i.codigo || "SEM-CODIGO",
        descricao: i.nome ?? "Item",
        ncm: i.ncm!,
        cfop: i.cfop!,
        quantidade: i.quantidade ?? 1,
        valorUnitario: i.preco ?? 0,
        unidade: "UN",
      })),
      pagamentos,
      valorTotal: pedido.total ?? 0,
    },
    dadosFiscais.ambiente_producao
  );

  if (!resultado.ok) {
    await registrarErroNota(notaExistente, valoresBase, resultado.erro);
    return { ok: false, erro: resultado.erro };
  }

  const [nota] = notaExistente
    ? await db
        .update(notasFiscais)
        .set({ status: "processando", protocolo: resultado.dados.protocol, mensagem_erro: null, atualizado_em: new Date().toISOString() })
        .where(eq(notasFiscais.pedido_id, pedidoId))
        .returning()
    : await db.insert(notasFiscais).values({ ...valoresBase, status: "processando", protocolo: resultado.dados.protocol }).returning();

  return { ok: true, nota };
}

/** Reconsulta o status real na API do provedor ativo (chamado pelo webhook ou pelo botao manual, nunca confia so no payload recebido) e grava o resultado. */
export async function atualizarStatusNotaFiscal(pedidoId: number): Promise<void> {
  const nota = await getNotaFiscalPorPedido(pedidoId);
  if (!nota) return;

  const provedor = await getProvedorNfceAtivo();
  const dadosFiscais = await getDadosFiscaisLoja(nota.loja_id);
  const producao = dadosFiscais?.ambiente_producao ?? false;

  if (provedor === "focusnfe") {
    const token = producao ? dadosFiscais?.focusnfe_token_producao : dadosFiscais?.focusnfe_token_homologacao;
    if (!token) return;
    const resultado = await fnConsultarNfce(nota.id_integracao, token, producao);
    if (!resultado.ok) return;
    const r = resultado.dados;
    await db
      .update(notasFiscais)
      .set({
        status: STATUS_MAP_FOCUSNFE[r.status] ?? "erro",
        numero: r.numero ?? nota.numero,
        serie: r.serie ?? nota.serie,
        chave: r.chave ?? null,
        mensagem_erro: r.mensagemSefaz ?? null,
        xml_url: r.xml ?? null,
        pdf_url: r.pdf ?? null,
        xml_cancelamento_url: r.xmlCancelamento ?? null,
        atualizado_em: new Date().toISOString(),
      })
      .where(eq(notasFiscais.pedido_id, pedidoId));
    return;
  }

  const resultado = await pnConsultarResumoNfce(nota.id_integracao, producao);
  if (!resultado.ok || resultado.dados.length === 0) return;

  const resumo = resultado.dados[0];
  const statusMap: Record<string, NotaFiscal["status"]> = {
    CONCLUIDO: "concluido",
    REJEITADO: "rejeitado",
    DENEGADO: "denegado",
    CANCELADO: "cancelado",
  };

  await db
    .update(notasFiscais)
    .set({
      status: statusMap[resumo.status] ?? "erro",
      plugnotas_id: resumo.id ?? nota.plugnotas_id,
      numero: resumo.numero ?? nota.numero,
      serie: resumo.serie ?? nota.serie,
      chave: resumo.chave ?? null,
      protocolo: resumo.protocolo ?? nota.protocolo,
      mensagem_erro: resumo.erro ?? resumo.mensagem ?? null,
      xml_url: resumo.xml ?? null,
      pdf_url: resumo.pdf ?? null,
      xml_cancelamento_url: resumo.xmlCancelamento ?? null,
      atualizado_em: new Date().toISOString(),
    })
    .where(eq(notasFiscais.pedido_id, pedidoId));
}

export async function cancelarNotaFiscal(lojaId: number, pedidoId: number, justificativa: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const nota = await getNotaFiscalPorPedido(pedidoId);
  if (!nota || nota.status !== "concluido") {
    return { ok: false, erro: "Só é possível cancelar uma nota concluída." };
  }

  const provedor = await getProvedorNfceAtivo();
  const dadosFiscais = await getDadosFiscaisLoja(lojaId);
  const producao = dadosFiscais?.ambiente_producao ?? false;

  if (provedor === "focusnfe") {
    const token = producao ? dadosFiscais?.focusnfe_token_producao : dadosFiscais?.focusnfe_token_homologacao;
    if (!token) return { ok: false, erro: "Token da empresa no Focus NFe não encontrado." };
    const resultado = await fnCancelarNfce(nota.id_integracao, justificativa, token, producao);
    if (!resultado.ok) return { ok: false, erro: resultado.erro };
    await db.update(notasFiscais).set({ status: "cancelado", atualizado_em: new Date().toISOString() }).where(eq(notasFiscais.pedido_id, pedidoId));
    return { ok: true };
  }

  if (!nota.plugnotas_id) return { ok: false, erro: "Nota sem identificador do PlugNotas." };
  const resultado = await pnCancelarNfce(nota.plugnotas_id, justificativa, producao);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  await db.update(notasFiscais).set({ status: "cancelado", atualizado_em: new Date().toISOString() }).where(eq(notasFiscais.pedido_id, pedidoId));
  return { ok: true };
}

function resolverPeriodoNfce(periodo: string, dataIni?: string, dataFim?: string): { inicio: string; fim: string } {
  const hoje = dataFortaleza();
  if (dataIni && dataFim) return { inicio: `${dataIni} 00:00:00`, fim: `${dataFim} 23:59:59` };
  if (periodo === "hoje") return { inicio: `${hoje} 00:00:00`, fim: `${hoje} 23:59:59` };

  const dias = periodo === "7dias" ? 7 : 30;
  const [y, m, d] = hoje.split("-").map(Number);
  const inicioDt = new Date(Date.UTC(y, m - 1, d) - (dias - 1) * 86_400_000);
  const inicio = `${inicioDt.getUTCFullYear()}-${String(inicioDt.getUTCMonth() + 1).padStart(2, "0")}-${String(inicioDt.getUTCDate()).padStart(2, "0")}`;
  return { inicio: `${inicio} 00:00:00`, fim: `${hoje} 23:59:59` };
}

export type NotaFiscalRelatorio = {
  pedidoId: number;
  pedidoCodigo: string | null;
  numero: string | null;
  serie: string | null;
  status: NotaFiscal["status"];
  valorTotal: number;
  protocolo: string | null;
  chave: string | null;
  pdfUrl: string | null;
  criadoEm: string;
  pagamentos: string[];
};

export async function listarNotasFiscais(lojaId: number, periodo: string, dataIni?: string, dataFim?: string): Promise<{ notas: NotaFiscalRelatorio[]; inicio: string; fim: string }> {
  const { inicio, fim } = resolverPeriodoNfce(periodo, dataIni, dataFim);

  const linhas = await db
    .select({
      pedidoId: notasFiscais.pedido_id,
      pedidoCodigo: pedidos.codigo,
      numero: notasFiscais.numero,
      serie: notasFiscais.serie,
      status: notasFiscais.status,
      valorTotal: pedidos.total,
      protocolo: notasFiscais.protocolo,
      chave: notasFiscais.chave,
      pdfUrl: notasFiscais.pdf_url,
      criadoEm: notasFiscais.criado_em,
    })
    .from(notasFiscais)
    .leftJoin(pedidos, eq(pedidos.id, notasFiscais.pedido_id))
    .where(and(eq(notasFiscais.loja_id, lojaId), gte(notasFiscais.criado_em, inicio), lte(notasFiscais.criado_em, fim)))
    .orderBy(desc(notasFiscais.criado_em));

  if (linhas.length === 0) return { notas: [], inicio, fim };

  const pedidoIds = linhas.map((l) => l.pedidoId);
  const pagamentosLinhas = await db
    .select({ pedidoId: pedidoPagamentos.pedido_id, forma: pedidoPagamentos.forma })
    .from(pedidoPagamentos)
    .where(inArray(pedidoPagamentos.pedido_id, pedidoIds));

  const pagamentosPorPedido = new Map<number, string[]>();
  for (const p of pagamentosLinhas) {
    const lista = pagamentosPorPedido.get(p.pedidoId) ?? [];
    lista.push(p.forma);
    pagamentosPorPedido.set(p.pedidoId, lista);
  }

  const notas = linhas.map((l) => ({
    ...l,
    valorTotal: l.valorTotal ?? 0,
    pagamentos: pagamentosPorPedido.get(l.pedidoId) ?? [],
  }));

  return { notas, inicio, fim };
}
