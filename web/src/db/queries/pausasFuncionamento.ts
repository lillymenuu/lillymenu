import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pausasProgramadas } from "@/db/schema";

/*
 * Equivalente de admin/api/v1/pausas_listar.php, pausa_salvar.php e
 * pausa_excluir.php: pausas programadas de funcionamento da loja (bloqueiam
 * pedidos num intervalo data+hora). Nao ha UPDATE no PHP original — editar
 * significa excluir e recriar.
 */

export type Pausa = {
  id: number;
  titulo: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
};

export async function listarPausas(lojaId: number): Promise<Pausa[]> {
  const linhas = await db
    .select({
      id: pausasProgramadas.id,
      titulo: pausasProgramadas.titulo,
      dataInicio: pausasProgramadas.data_inicio,
      horaInicio: pausasProgramadas.hora_inicio,
      dataFim: pausasProgramadas.data_fim,
      horaFim: pausasProgramadas.hora_fim,
    })
    .from(pausasProgramadas)
    .where(eq(pausasProgramadas.loja_id, lojaId))
    .orderBy(asc(pausasProgramadas.data_inicio), asc(pausasProgramadas.hora_inicio));
  return linhas;
}

export type SalvarPausaInput = {
  titulo: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
};

const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^\d{2}:\d{2}$/;

export async function salvarPausa(lojaId: number, input: SalvarPausaInput): Promise<{ ok: true; id: number } | { ok: false; msg: string }> {
  const titulo = input.titulo.trim();
  if (titulo === "" || titulo.length > 100) return { ok: false, msg: "Informe um titulo valido (ate 100 caracteres)." };

  if (!RE_DATA.test(input.dataInicio) || !RE_DATA.test(input.dataFim)) return { ok: false, msg: "Data invalida." };
  if (!RE_HORA.test(input.horaInicio) || !RE_HORA.test(input.horaFim)) return { ok: false, msg: "Hora invalida." };

  const inicio = `${input.dataInicio} ${input.horaInicio}`;
  const fim = `${input.dataFim} ${input.horaFim}`;
  if (fim <= inicio) return { ok: false, msg: "O fim da pausa deve ser posterior ao inicio." };

  const [linha] = await db
    .insert(pausasProgramadas)
    .values({
      loja_id: lojaId,
      titulo,
      data_inicio: input.dataInicio,
      hora_inicio: input.horaInicio,
      data_fim: input.dataFim,
      hora_fim: input.horaFim,
    })
    .returning({ id: pausasProgramadas.id });

  return { ok: true, id: linha.id };
}

export async function excluirPausa(lojaId: number, id: number): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (id <= 0) return { ok: false, msg: "ID invalido." };
  await db.delete(pausasProgramadas).where(and(eq(pausasProgramadas.id, id), eq(pausasProgramadas.loja_id, lojaId)));
  return { ok: true };
}
