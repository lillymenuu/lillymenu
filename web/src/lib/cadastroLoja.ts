/* Cadastro inicial da loja: no primeiro acesso ao painel, o dono so libera a area Admin depois de
   preencher "Informacoes da loja" ate 100%. Usado no modal (barra de progresso) e no servidor
   (ao salvar, apaga a flag `cadastro_inicial_pendente` quando tudo estiver preenchido).
   Ficam de fora os campos opcionais: Instagram, TikTok, complemento e codigo IBGE. */

/** Chave em `configuracoes` gravada na criacao da loja (signup). Lojas antigas nao tem a chave. */
export const CHAVE_CADASTRO_PENDENTE = "cadastro_inicial_pendente";

export type CamposCadastroLoja = {
  capa: string;
  perfil: string;
  nome: string;
  contato: string;
  cpf: string;
  cnpj: string;
  linkSlug: string;
  cep: string;
  numero: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
};

const digitos = (v: string) => v.replace(/\D/g, "");

const ITENS: { rotulo: string; ok: (c: CamposCadastroLoja) => boolean }[] = [
  { rotulo: "Capa", ok: (c) => !!c.capa.trim() },
  { rotulo: "Foto de perfil", ok: (c) => !!c.perfil.trim() },
  { rotulo: "Nome da loja", ok: (c) => !!c.nome.trim() },
  { rotulo: "Número de contato", ok: (c) => digitos(c.contato).length >= 10 },
  { rotulo: "CPF ou CNPJ", ok: (c) => digitos(c.cpf).length === 11 || digitos(c.cnpj).length === 14 },
  { rotulo: "Link customizado", ok: (c) => !!c.linkSlug.trim() },
  { rotulo: "CEP", ok: (c) => digitos(c.cep).length === 8 },
  { rotulo: "Número", ok: (c) => !!c.numero.trim() },
  { rotulo: "Rua", ok: (c) => !!c.rua.trim() },
  { rotulo: "Bairro", ok: (c) => !!c.bairro.trim() },
  { rotulo: "Cidade", ok: (c) => !!c.cidade.trim() },
  { rotulo: "Estado", ok: (c) => !!c.estado.trim() },
];

export function progressoCadastroLoja(c: CamposCadastroLoja): { percentual: number; faltando: string[] } {
  const faltando = ITENS.filter((i) => !i.ok(c)).map((i) => i.rotulo);
  const percentual = Math.round(((ITENS.length - faltando.length) / ITENS.length) * 100);
  return { percentual, faltando };
}
