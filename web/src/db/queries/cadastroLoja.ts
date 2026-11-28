import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { configuracoes } from "@/db/schema";
import { getConfig, getConfigs } from "@/db/queries/config";
import { CHAVE_CADASTRO_PENDENTE, progressoCadastroLoja } from "@/lib/cadastroLoja";

/* link_loja guarda a URL inteira (base + slug); sem slug sobra so a base. */
function slugDoLink(link: string): string {
  try {
    return new URL(link).pathname.replace(/\//g, "");
  } catch {
    return link.trim();
  }
}

/** true enquanto a loja (criada pelo signup) nao concluiu o cadastro inicial de Informacoes da loja. */
export async function cadastroInicialPendente(lojaId: number): Promise<boolean> {
  return (await getConfig(lojaId, CHAVE_CADASTRO_PENDENTE)) === "1";
}

/** Depois de salvar: se a loja estava pendente e agora tem tudo preenchido, libera o painel.
    Retorna se ainda continua pendente. */
export async function atualizarCadastroInicial(lojaId: number): Promise<boolean> {
  if (!(await cadastroInicialPendente(lojaId))) return false;

  const cfg = await getConfigs(lojaId, [
    "loja_capa", "loja_perfil", "nome_loja", "loja_contato", "cobranca_cpf", "loja_cnpj", "link_loja",
    "loja_cep", "loja_numero", "loja_rua", "loja_bairro", "loja_cidade", "loja_estado",
  ]);
  const { percentual } = progressoCadastroLoja({
    capa: cfg.loja_capa, perfil: cfg.loja_perfil, nome: cfg.nome_loja, contato: cfg.loja_contato,
    cpf: cfg.cobranca_cpf, cnpj: cfg.loja_cnpj, linkSlug: slugDoLink(cfg.link_loja),
    cep: cfg.loja_cep, numero: cfg.loja_numero, rua: cfg.loja_rua, bairro: cfg.loja_bairro,
    cidade: cfg.loja_cidade, estado: cfg.loja_estado,
  });
  if (percentual < 100) return true;

  await db
    .update(configuracoes)
    .set({ valor: "0" })
    .where(and(eq(configuracoes.loja_id, lojaId), eq(configuracoes.chave, CHAVE_CADASTRO_PENDENTE)));
  return false;
}
