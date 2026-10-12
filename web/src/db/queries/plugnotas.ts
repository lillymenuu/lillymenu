import "server-only";

/*
 * Integracao com a API do PlugNotas (https://docs.plugnotas.com.br) pra emissao de
 * NFCe. A Lilly Menu tem UMA conta no PlugNotas (uma api-key de sandbox e outra de
 * producao); cada loja e cadastrada la como uma "empresa" (CNPJ) dentro dessa conta.
 * A loja escolhe por si so o ambiente (sandbox/producao) em dados_fiscais_loja.ambiente_producao.
 */

const PN_BASE_SANDBOX = "https://api.sandbox.plugnotas.com.br";
const PN_BASE_PRODUCAO = "https://api.plugnotas.com.br";

type ResultadoPn<T> = { ok: true; dados: T } | { ok: false; erro: string; status?: number };

function pnConfig(producao: boolean): { apiKey: string; baseUrl: string } {
  const apiKey = ((producao ? process.env.PLUGNOTAS_API_KEY_PRODUCAO : process.env.PLUGNOTAS_API_KEY_SANDBOX) ?? "").trim();
  return { apiKey, baseUrl: producao ? PN_BASE_PRODUCAO : PN_BASE_SANDBOX };
}

async function pnRequest<T>(
  path: string,
  producao: boolean,
  init: { method: string; body?: BodyInit; headers?: Record<string, string> }
): Promise<ResultadoPn<T>> {
  const { apiKey, baseUrl } = pnConfig(producao);
  if (!apiKey) return { ok: false, erro: "PlugNotas não configurado (API key ausente)." };

  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      headers: { "x-api-key": apiKey, ...init.headers },
      body: init.body,
    });
  } catch {
    return { ok: false, erro: "Falha de conexão com o PlugNotas." };
  }

  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resp.ok) {
    const erro = dados?.error?.message ?? dados?.message ?? `Erro ${resp.status} ao chamar o PlugNotas.`;
    return { ok: false, erro, status: resp.status };
  }
  return { ok: true, dados };
}

/** Cadastra o certificado digital A1 (.pfx/.p12) da loja. A senha trafega so em transito, nunca e persistida por nos. */
export async function pnCadastrarCertificado(
  arquivo: Buffer,
  nomeArquivo: string,
  senha: string,
  producao: boolean,
  emailNotificacao?: string
): Promise<ResultadoPn<{ id: string }>> {
  const form = new FormData();
  form.append("arquivo", new Blob([new Uint8Array(arquivo)]), nomeArquivo);
  form.append("senha", senha);
  if (emailNotificacao) form.append("email", emailNotificacao);

  const resultado = await pnRequest<{ data?: { id?: string }; id?: string }>("/certificado", producao, { method: "POST", body: form });
  if (!resultado.ok) return resultado;

  const id = resultado.dados?.data?.id ?? resultado.dados?.id;
  if (!id) return { ok: false, erro: "PlugNotas não retornou o id do certificado." };
  return { ok: true, dados: { id } };
}

export type EnderecoFiscal = {
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string;
  estado: string;
  codigoCidade: string;
  descricaoCidade?: string;
  complemento?: string;
  tipoLogradouro?: string;
};

export type DadosEmpresaFiscal = {
  cpfCnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  email: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  simplesNacional: boolean;
  regimeTributario: number;
  regimeTributarioEspecial: number;
  endereco: EnderecoFiscal;
  certificadoId: string;
  producao: boolean;
  serieNfce: number;
  numeroInicialNfce: number;
  numeracaoAutomatica: boolean;
  idCodigoSegurancaContribuinte?: string;
  codigoSegurancaContribuinte?: string;
};

function montarBodyEmpresa(dados: DadosEmpresaFiscal) {
  return {
    cpfCnpj: dados.cpfCnpj,
    razaoSocial: dados.razaoSocial,
    nomeFantasia: dados.nomeFantasia,
    email: dados.email,
    inscricaoEstadual: dados.inscricaoEstadual,
    inscricaoMunicipal: dados.inscricaoMunicipal,
    simplesNacional: dados.simplesNacional,
    regimeTributario: dados.regimeTributario,
    regimeTributarioEspecial: dados.regimeTributarioEspecial,
    certificado: dados.certificadoId,
    endereco: dados.endereco,
    // Modulos que nao usamos ficam desativados; tipoContrato 0 = bilhetagem (cobranca por nota).
    nfse: { ativo: false, tipoContrato: 0 },
    nfe: { ativo: false, tipoContrato: 0 },
    mdfe: { ativo: false, tipoContrato: 0 },
    nfcom: { ativo: false, tipoContrato: 0 },
    nfce: {
      ativo: true,
      tipoContrato: 0,
      config: {
        producao: dados.producao,
        numeracaoAutomatica: dados.numeracaoAutomatica,
        numeracao: [{ numero: dados.numeroInicialNfce, serie: dados.serieNfce }],
        sefaz:
          dados.idCodigoSegurancaContribuinte && dados.codigoSegurancaContribuinte
            ? {
                idCodigoSegurancaContribuinte: dados.idCodigoSegurancaContribuinte,
                codigoSegurancaContribuinte: dados.codigoSegurancaContribuinte,
              }
            : undefined,
      },
    },
  };
}

/** Cadastra a loja como "empresa" no PlugNotas (primeiro cadastro do CNPJ) com o modulo NFCe ativo. */
export async function pnCadastrarEmpresa(dados: DadosEmpresaFiscal): Promise<ResultadoPn<{ message: string }>> {
  return pnRequest<{ message: string }>("/empresa", dados.producao, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(montarBodyEmpresa(dados)),
  });
}

/** Atualiza os dados da empresa ja cadastrada (PlugNotas rejeita um 2o POST pro mesmo CNPJ com 409). */
export async function pnAtualizarEmpresa(dados: DadosEmpresaFiscal): Promise<ResultadoPn<{ message: string }>> {
  return pnRequest<{ message: string }>(`/empresa/${encodeURIComponent(dados.cpfCnpj)}`, dados.producao, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(montarBodyEmpresa(dados)),
  });
}

export type ItemNfce = {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  unidade: string;
};

export type PagamentoNfce = { meio: string; valor: number };

export type EmissaoNfceInput = {
  idIntegracao: string;
  cpfCnpjEmitente: string;
  itens: ItemNfce[];
  pagamentos: PagamentoNfce[];
  valorTotal: number;
};

/** Emite uma NFCe (idIntegracao = id do pedido, pra garantir idempotencia se o botao for clicado 2x). */
export async function pnEmitirNfce(dados: EmissaoNfceInput, producao: boolean): Promise<ResultadoPn<{ protocol?: string; message: string }>> {
  const payload = [
    {
      idIntegracao: dados.idIntegracao,
      presencial: true,
      emitente: { cpfCnpj: dados.cpfCnpjEmitente },
      itens: dados.itens.map((item) => ({
        codigo: item.codigo,
        descricao: item.descricao,
        ncm: item.ncm,
        cfop: item.cfop,
        quantidade: { valor: item.quantidade },
        valorUnitario: { valor: item.valorUnitario },
        unidade: { comercial: item.unidade, tributavel: item.unidade },
        valorTotal: Math.round(item.quantidade * item.valorUnitario * 100) / 100,
      })),
      pagamentos: dados.pagamentos.map((p) => ({ meio: p.meio, valor: p.valor })),
      total: { valorNfe: dados.valorTotal },
    },
  ];

  return pnRequest<{ protocol?: string; message: string }>("/nfce", producao, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type ResumoNfce = {
  id?: string;
  numero?: string;
  serie?: string;
  status: "REJEITADO" | "CONCLUIDO" | "DENEGADO" | "CANCELADO";
  chave?: string;
  protocolo?: string;
  mensagem?: string;
  erro?: string;
  pdf?: string;
  xml?: string;
  xmlCancelamento?: string;
};

/** Reconsulta o status real da nota direto na API — nunca confiar so no payload do webhook. */
export async function pnConsultarResumoNfce(idNotaOrChaveOrProtocolo: string, producao: boolean): Promise<ResultadoPn<ResumoNfce[]>> {
  return pnRequest<ResumoNfce[]>(`/nfce/${encodeURIComponent(idNotaOrChaveOrProtocolo)}/resumo`, producao, { method: "GET" });
}

export async function pnCancelarNfce(idNota: string, justificativa: string, producao: boolean): Promise<ResultadoPn<{ protocol?: string; message: string }>> {
  return pnRequest<{ protocol?: string; message: string }>(`/nfce/${encodeURIComponent(idNota)}/cancelamento`, producao, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ justificativa }),
  });
}

export type ConsultaCep = { cep: string; logradouro: string; bairro: string; municipio: string; uf: string; ibge: string; complemento?: string };

/** Auxiliar pro formulario de cadastro fiscal: preenche endereco + codigo IBGE do municipio a partir do CEP. */
export async function pnConsultarCep(cep: string, producao: boolean): Promise<ResultadoPn<ConsultaCep>> {
  return pnRequest<ConsultaCep>(`/cep/${encodeURIComponent(cep.replace(/\D/g, ""))}`, producao, { method: "GET" });
}
