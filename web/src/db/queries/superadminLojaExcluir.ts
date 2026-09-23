import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { withTransaction } from "@/db";
import type { NeonTx } from "@/db";
import { admins, lojas, configuracoes, leadsLojas, assinaturas, cobrancas, permissoesUsuarios } from "@/db/schema";

/*
 * Equivalente de admin/helpers/loja_excluir.php (superadminExcluirLoja):
 * exclusao COMPLETA e irreversivel de uma loja e tudo que pertence a ela.
 *
 * Correcao deliberada em relacao ao PHP original (autorizada explicitamente):
 * o bloco que busca chaves de configuracoes pra casar com leads_lojas tinha
 * uma query corrompida (um "return [...]" colado no meio da string SQL, sem
 * FROM/WHERE), o que fazia essa consulta lancar excecao sempre que a tabela
 * `configuracoes` existisse — ou seja, a acao "excluir loja" sempre falhava
 * no PHP em producao. Aqui a query foi escrita corretamente.
 *
 * Em vez da lista estatica de tabelas do PHP (mantida manualmente, arriscando
 * ficar desatualizada), descobre dinamicamente TODAS as tabelas do schema
 * Postgres que tem uma coluna `loja_id` (equivalente ao SELECT em
 * INFORMATION_SCHEMA.COLUMNS do legado) e apaga de cada uma, na ordem de
 * prioridade abaixo (fatos/movimentacoes antes de cadastros, pra respeitar
 * FKs sem CASCADE).
 */

const CHAVES_LEAD_CONFIG = ["loja_email", "loja_cnpj", "loja_contato", "whatsapp_numero", "lead_empresa", "lead_responsavel", "nome_loja"];

const ORDEM_EXCLUSAO: Record<string, number> = {
  pedido_itens: 10,
  pedido_pagamentos: 11,
  pedido_status_log: 12,
  pedidos: 20,
  estoque_movimentacoes: 30,
  caixa_movimentacoes: 31,
  entrada_saida_lancamentos: 32,
  entrada_saida_subcategorias: 33,
  entrada_saida_formas: 34,
  entrada_saida_categorias: 35,
  entrada_saida_bancos: 36,
  cashback_movimentacoes: 37,
  pontos_movimentacoes: 38,
  materia_prima_cadastros: 39,
  produto_extras: 40,
  produto_variacoes: 41,
  produto_complementos_itens: 42,
  complementos_itens: 42,
  complementos_grupos_produtos: 43,
  complementos_grupos_categorias: 44,
  complementos_grupos: 45,
  produtos: 50,
  clientes: 60,
  categorias: 70,
  estoque: 80,
  taxas_bairro: 90,
  taxas_dinamicas: 91,
  cupons: 92,
  caixa_turnos: 93,
  operacao_logs: 94,
  configuracoes: 95,
  admins: 96,
};

const TABELAS_PULADAS = new Set(["lojas", "assinaturas", "cobrancas"]);
const RE_NOME_TABELA_VALIDO = /^[a-zA-Z0-9_]+$/;

async function tabelasComLojaId(tx: NeonTx): Promise<string[]> {
  const resultado = await tx.execute(
    sql`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'loja_id'`
  );
  return (resultado.rows as { table_name: string }[]).map((r) => r.table_name);
}

export async function superadminExcluirLoja(lojaId: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (lojaId <= 0) return { ok: false, msg: "Loja invalida." };

  try {
    return await withTransaction(async (tx): Promise<{ ok: true } | { ok: false; msg: string }> => {
      const [{ n: temSuperadmin }] = await tx
        .select({ n: sql<string>`count(*)` })
        .from(admins)
        .where(and(eq(admins.loja_id, lojaId), eq(admins.perfil, "superadmin")));
      if (Number(temSuperadmin) > 0) return { ok: false, msg: "Nao e possivel excluir a loja do superadmin." };

      const adminIds = (await tx.select({ id: admins.id }).from(admins).where(eq(admins.loja_id, lojaId))).map((a) => a.id);
      const adminEmails = (await tx.select({ email: admins.email }).from(admins).where(and(eq(admins.loja_id, lojaId), ne(admins.email, ""))))
        .map((a) => a.email)
        .filter((e): e is string => e !== null && e !== "");

      const [lojaRow] = await tx.select({ nome: lojas.nome }).from(lojas).where(eq(lojas.id, lojaId)).limit(1);
      const lojaNome = lojaRow?.nome ?? "";

      const cfgRows = await tx.select({ valor: configuracoes.valor }).from(configuracoes).where(and(eq(configuracoes.loja_id, lojaId), inArray(configuracoes.chave, CHAVES_LEAD_CONFIG)));
      const leadMatchesSet = new Set<string>();
      for (const row of cfgRows) {
        const valor = (row.valor ?? "").trim();
        if (valor !== "") leadMatchesSet.add(valor);
      }
      if (lojaNome !== "") leadMatchesSet.add(lojaNome);
      const leadMatches = [...leadMatchesSet];

      if (adminIds.length > 0) {
        await tx.delete(permissoesUsuarios).where(inArray(permissoesUsuarios.admin_id, adminIds));
      }

      if (adminEmails.length > 0 || leadMatches.length > 0) {
        const condicoes = [];
        if (adminEmails.length > 0) condicoes.push(inArray(leadsLojas.email, adminEmails));
        if (leadMatches.length > 0) {
          condicoes.push(inArray(leadsLojas.cnpj, leadMatches));
          condicoes.push(inArray(leadsLojas.whatsapp, leadMatches));
          condicoes.push(inArray(leadsLojas.empresa, leadMatches));
          condicoes.push(inArray(leadsLojas.nome, leadMatches));
        }
        await tx.delete(leadsLojas).where(sql.join(condicoes, sql` or `));
      }

      await tx.delete(cobrancas).where(inArray(cobrancas.assinatura_id, tx.select({ id: assinaturas.id }).from(assinaturas).where(eq(assinaturas.loja_id, lojaId))));
      await tx.delete(assinaturas).where(eq(assinaturas.loja_id, lojaId));

      const tabelas = await tabelasComLojaId(tx);
      const tabelasOrdenadas = [...tabelas]
        .filter((t) => !TABELAS_PULADAS.has(t) && RE_NOME_TABELA_VALIDO.test(t))
        .sort((a, b) => {
          const pa = ORDEM_EXCLUSAO[a] ?? 1000;
          const pb = ORDEM_EXCLUSAO[b] ?? 1000;
          return pa !== pb ? pa - pb : a.localeCompare(b);
        });

      for (const tabela of tabelasOrdenadas) {
        await tx.execute(sql`delete from ${sql.identifier(tabela)} where loja_id = ${lojaId}`);
      }

      await tx.delete(lojas).where(eq(lojas.id, lojaId));

      return { ok: true };
    });
  } catch (e) {
    return { ok: false, msg: `Erro ao excluir loja. ${e instanceof Error ? e.message : String(e)}` };
  }
}
