import "server-only";

/*
 * Integracao com a API do Focus NFe (https://doc.focusnfe.com.br) pra emissao de NFCe —
 * segundo provedor suportado, alternativo ao PlugNotas (ver plugnotas.ts). Modelo de
 * autenticacao bem diferente do PlugNotas:
 *  - Nao existe uma "api-key" unica pra conta inteira. Um token MESTRE (o da empresa
 *    matriz/conta, gerado no painel do Focus NFe) e usado pra CRIAR/ATUALIZAR empresas
 *    (CRUD de "Gestao > Empresas" — assumimos aqui que esse mesmo token mestre tambem
 *    administra as empresas filhas; nao confirmado em documentacao pra multiplas
 *    empresas sob a mesma conta, vale validar com o suporte do Focus NFe numa conta real).
 *  - Cada empresa cadastrada recebe seu PROPRIO par de tokens (token_producao /
 *    token_homologacao) na resposta da criacao — sao esses tokens (nao o mestre) que
 *    autenticam emissao/consulta/cancelamento de NFCe DAQUELA empresa especificamente.
 *    Por isso dados_fiscais_loja guarda um token por loja.
 *  - Autenticacao e HTTP Basic: usuario = token, senha em branco.
 *  - Emissao de NFCe e SINCRONA — a resposta do POST ja vem com o status final
 *    (autorizado/erro_autorizacao), sem precisar de webhook ou consulta posterior pro
 *    fluxo normal (diferente do PlugNotas).
 */

const FN_BASE_PRODUCAO = "https://api.focusnfe.com.br";
const FN_BASE_HOMOLOGACAO = "https://homologacao.focusnfe.com.br";

type ResultadoFn<T> = { ok: true; dados: T } | { ok: false; erro: string; status?: number };

function fnMasterToken(producao: boolean): string {
  return ((producao ? process.env.FOCUSNFE_TOKEN_PRODUCAO : process.env.FOCUSNFE_TOKEN_SANDBOX) ?? "").trim();
}

function fnBaseUrl(producao: boolean): string {
  return producao ? FN_BASE_PRODUCAO : FN_BASE_HOMOLOGACAO;
}

async function fnRequest<T>(path: string, token: string, producao: boolean, init: { method: string; body?: BodyInit }): Promise<ResultadoFn<T>> {
  if (!token) return { ok: false, erro: "Focus NFe não configurado (token ausente)." };

  const auth = Buffer.from(`${token}:`).toString("base64");
  let resp: Response;
  try {
    resp = await fetch(`${fnBaseUrl(producao)}${path}`, {
      method: init.method,
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: init.body,
    });
  } catch {
    return { ok: false, erro: "Falha de conexão com o Focus NFe." };
  }

  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resp.ok) {
    const erro = dados?.erros?.[0]?.mensagem ?? dados?.mensagem ?? `Erro ${resp.status} ao chamar o Focus NFe.`;
    return { ok: false, erro, status: resp.status };
  }
  return { ok: true, dados };
}

export type EnderecoFiscalFn = { logradouro: string; numero: string; complemento?: string; bairro: string; municipio: string; uf: string; cep: string };

export type DadosEmpresaFocusNfe = {
  cnpj: string;
  nome: string;
  nomeFantasia?: string;
  email?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  regimeTributario: number;
  endereco: EnderecoFiscalFn;
  serieNfce: number;
  numeroInicialNfce: number;
  cscIdProducao?: string;
  cscProducao?: string;
  cscIdHomologacao?: string;
  cscHomologacao?: string;
  certificadoBase64?: string;
  senhaCertificado?: string;
};

export type ResultadoCadastroEmpresaFn = { id: string; tokenProducao: string; tokenHomologacao: string; certificadoValidoAte?: string };

function montarBodyEmpresaFn(dados: DadosEmpresaFocusNfe) {
  return {
    cnpj: dados.cnpj,
    nome: dados.nome,
    nome_fantasia: dados.nomeFantasia,
    email: dados.email,
    inscricao_estadual: dados.inscricaoEstadual,
    inscricao_municipal: dados.inscricaoMunicipal,
    regime_tributario: dados.regimeTributario,
    logradouro: dados.endereco.logradouro,
    numero: dados.endereco.numero,
    complemento: dados.endereco.complemento,
    bairro: dados.endereco.bairro,
    municipio: dados.endereco.municipio,
    uf: dados.endereco.uf,
    cep: dados.endereco.cep,
    habilita_nfce: true,
    // Simplificacao v1: mesma serie/numeracao/CSC pros dois ambientes (producao e
    // homologacao), em vez de expor 2 jogos de campos na UI. Ajustar se precisar
    // de valores diferentes por ambiente.
    serie_nfce_producao: dados.serieNfce,
    proximo_numero_nfce_producao: dados.numeroInicialNfce,
    serie_nfce_homologacao: dados.serieNfce,
    proximo_numero_nfce_homologacao: dados.numeroInicialNfce,
    csc_nfce_producao: dados.cscProducao,
    id_token_nfce_producao: dados.cscIdProducao ? Number(dados.cscIdProducao) : undefined,
    csc_nfce_homologacao: dados.cscHomologacao || dados.cscProducao,
    id_token_nfce_homologacao: dados.cscIdHomologacao ? Number(dados.cscIdHomologacao) : dados.cscIdProducao ? Number(dados.cscIdProducao) : undefined,
    arquivo_certificado_base64: dados.certificadoBase64,
    senha_certificado: dados.senhaCertificado,
  };
}

function mapearRespostaEmpresa(dados: Record<string, unknown>): ResultadoCadastroEmpresaFn {
  return {
    id: String(dados.id),
    tokenProducao: String(dados.token_producao ?? ""),
    tokenHomologacao: String(dados.token_homologacao ?? ""),
    certificadoValidoAte: dados.certificado_valido_ate ? String(dados.certificado_valido_ate) : undefined,
  };
}

/** Cria a empresa no Focus NFe (primeiro cadastro do CNPJ) — usa o token MESTRE da conta. */
export async function fnCriarEmpresa(dados: DadosEmpresaFocusNfe, producao: boolean): Promise<ResultadoFn<ResultadoCadastroEmpresaFn>> {
  const resultado = await fnRequest<Record<string, unknown>>("/v2/empresas", fnMasterToken(producao), producao, {
    method: "POST",
    body: JSON.stringify(montarBodyEmpresaFn(dados)),
  });
  if (!resultado.ok) return resultado;
  return { ok: true, dados: mapearRespostaEmpresa(resultado.dados) };
}

/** Atualiza a empresa ja cadastrada — usa o token MESTRE (gestao de empresas e operacao de conta, nao da empresa individual). */
export async function fnAtualizarEmpresa(empresaId: string, dados: DadosEmpresaFocusNfe, producao: boolean): Promise<ResultadoFn<ResultadoCadastroEmpresaFn>> {
  const resultado = await fnRequest<Record<string, unknown>>(`/v2/empresas/${encodeURIComponent(empresaId)}`, fnMasterToken(producao), producao, {
    method: "PUT",
    body: JSON.stringify(montarBodyEmpresaFn(dados)),
  });
  if (!resultado.ok) return resultado;
  return { ok: true, dados: mapearRespostaEmpresa(resultado.dados) };
}

export type ItemNfceFn = {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  unidade: string;
  icmsSituacaoTributaria: string;
};

export type PagamentoNfceFn = { meio: string; valor: number };

export type EmissaoNfceFnInput = { ref: string; cnpjEmitente: string; itens: ItemNfceFn[]; pagamentos: PagamentoNfceFn[] };

export type ResultadoNfceFn = {
  status: "autorizado" | "erro_autorizacao" | "denegado" | "processando_autorizacao" | "cancelado";
  statusSefaz?: string;
  mensagemSefaz?: string;
  chave?: string;
  numero?: string;
  serie?: string;
  xml?: string;
  pdf?: string;
  xmlCancelamento?: string;
};

function mapearRespostaNfce(dados: Record<string, unknown>): ResultadoNfceFn {
  return {
    status: dados.status as ResultadoNfceFn["status"],
    statusSefaz: dados.status_sefaz ? String(dados.status_sefaz) : undefined,
    mensagemSefaz: dados.mensagem_sefaz ? String(dados.mensagem_sefaz) : undefined,
    chave: dados.chave_nfe ? String(dados.chave_nfe) : undefined,
    numero: dados.numero ? String(dados.numero) : undefined,
    serie: dados.serie ? String(dados.serie) : undefined,
    xml: dados.caminho_xml_nota_fiscal ? String(dados.caminho_xml_nota_fiscal) : undefined,
    pdf: dados.caminho_danfe ? String(dados.caminho_danfe) : undefined,
    xmlCancelamento: dados.caminho_xml_cancelamento ? String(dados.caminho_xml_cancelamento) : undefined,
  };
}

/** Emite a NFCe — SINCRONA: o status final (autorizado/rejeitado) ja vem nesta resposta. Usa o token da EMPRESA (nao o mestre). */
export async function fnEmitirNfce(input: EmissaoNfceFnInput, tokenEmpresa: string, producao: boolean): Promise<ResultadoFn<ResultadoNfceFn>> {
  const body = {
    cnpj_emitente: input.cnpjEmitente,
    data_emissao: new Date().toISOString(),
    presenca_comprador: "1",
    modalidade_frete: "9",
    local_destino: "1",
    natureza_operacao: "VENDA AO CONSUMIDOR",
    items: input.itens.map((item) => ({
      numero_item: String(item.numeroItem),
      codigo_ncm: item.ncm,
      codigo_produto: item.codigo,
      descricao: item.descricao,
      quantidade_comercial: item.quantidade,
      quantidade_tributavel: item.quantidade,
      cfop: item.cfop,
      valor_unitario_comercial: item.valorUnitario,
      valor_unitario_tributavel: item.valorUnitario,
      valor_bruto: Math.round(item.quantidade * item.valorUnitario * 100) / 100,
      unidade_comercial: item.unidade,
      unidade_tributavel: item.unidade,
      icms_origem: "0",
      icms_situacao_tributaria: item.icmsSituacaoTributaria,
    })),
    formas_pagamento: input.pagamentos.map((p) => ({ forma_pagamento: p.meio, valor_pagamento: p.valor })),
  };

  const resultado = await fnRequest<Record<string, unknown>>(`/v2/nfce?ref=${encodeURIComponent(input.ref)}`, tokenEmpresa, producao, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!resultado.ok) return resultado;
  return { ok: true, dados: mapearRespostaNfce(resultado.dados) };
}

export async function fnConsultarNfce(ref: string, tokenEmpresa: string, producao: boolean): Promise<ResultadoFn<ResultadoNfceFn>> {
  const resultado = await fnRequest<Record<string, unknown>>(`/v2/nfce/${encodeURIComponent(ref)}`, tokenEmpresa, producao, { method: "GET" });
  if (!resultado.ok) return resultado;
  return { ok: true, dados: mapearRespostaNfce(resultado.dados) };
}

export async function fnCancelarNfce(ref: string, justificativa: string, tokenEmpresa: string, producao: boolean): Promise<ResultadoFn<ResultadoNfceFn>> {
  const resultado = await fnRequest<Record<string, unknown>>(`/v2/nfce/${encodeURIComponent(ref)}`, tokenEmpresa, producao, {
    method: "DELETE",
    body: JSON.stringify({ justificativa }),
  });
  if (!resultado.ok) return resultado;
  return { ok: true, dados: mapearRespostaNfce(resultado.dados) };
}
