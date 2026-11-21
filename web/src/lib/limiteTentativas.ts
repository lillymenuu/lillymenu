import "server-only";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/*
 * Limite de tentativas por janela de tempo, guardado na tabela limites_tentativas (Neon).
 * Protege login, reset de senha, cadastro e as rotas publicas do cardapio contra forca bruta,
 * enumeracao de telefones e spam. Cada chamada soma 1 na chave numa unica instrucao atomica
 * (INSERT ... ON CONFLICT), entao funciona mesmo com varias funcoes da Vercel ao mesmo tempo.
 *
 * Se o banco falhar, deixa passar: o limite nunca pode derrubar o login ou o pedido de ninguem.
 */

/** IP do cliente. Na Vercel, x-forwarded-for e preenchido pela propria plataforma (o primeiro e o real). */
export function ipDaRequisicao(request: Request): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  const ip = xff.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "";
  return ip || "desconhecido";
}

type Regra = { chave: string; max: number; janelaSegundos: number };

/** Soma uma tentativa em cada regra; devolve os segundos de espera se alguma estourou, senao null. */
async function consumir(regras: Regra[]): Promise<number | null> {
  let espera: number | null = null;
  try {
    for (const r of regras) {
      const chave = r.chave.slice(0, 255);
      const res = await db.execute<{ tentativas: number; restante: number }>(sql`
        insert into limites_tentativas (chave, tentativas, janela_inicio)
        values (${chave}, 1, now())
        on conflict (chave) do update set
          tentativas = case when limites_tentativas.janela_inicio < now() - make_interval(secs => ${r.janelaSegundos})
                            then 1 else limites_tentativas.tentativas + 1 end,
          janela_inicio = case when limites_tentativas.janela_inicio < now() - make_interval(secs => ${r.janelaSegundos})
                               then now() else limites_tentativas.janela_inicio end
        returning tentativas,
          greatest(1, ceil(extract(epoch from (janela_inicio + make_interval(secs => ${r.janelaSegundos}) - now()))))::int as restante
      `);
      const linha = res.rows[0];
      if (linha && Number(linha.tentativas) > r.max) espera = Math.max(espera ?? 0, Number(linha.restante));
    }
    /* Faxina ocasional (~1% das chamadas): apaga contadores de mais de 1 dia. */
    if (Math.random() < 0.01) {
      await db.execute(sql`delete from limites_tentativas where janela_inicio < now() - interval '1 day'`);
    }
  } catch (e) {
    console.error("[limiteTentativas] falha ao consultar limite, liberando:", e);
    return null;
  }
  return espera;
}

function textoEspera(segundos: number): string {
  if (segundos < 90) return `${segundos} segundos`;
  return `${Math.ceil(segundos / 60)} minutos`;
}

/**
 * Aplica o limite. `regras`: [nome, max, janelaSegundos, extra?] — o IP sempre entra na chave;
 * `extra` (e-mail, telefone...) cria um limite separado por aquele valor, de qualquer IP.
 * Devolve a resposta 429 pronta quando estourou; null quando pode seguir.
 */
export async function limitar(
  request: Request,
  nome: string,
  porIp: { max: number; janelaSegundos: number },
  porValor?: { valor: string; max: number; janelaSegundos: number }
): Promise<NextResponse | null> {
  const regras: Regra[] = [{ chave: `${nome}:ip:${ipDaRequisicao(request)}`, ...porIp }];
  const valor = porValor?.valor.trim().toLowerCase();
  if (porValor && valor) regras.push({ chave: `${nome}:v:${valor}`, max: porValor.max, janelaSegundos: porValor.janelaSegundos });

  const espera = await consumir(regras);
  if (espera === null) return null;
  const msg = `Muitas tentativas. Aguarde ${textoEspera(espera)} e tente de novo.`;
  /* Rotas antigas respondem { erro }, as do cardapio { msg }: manda os dois. */
  return NextResponse.json({ ok: false, msg, erro: msg }, { status: 429, headers: { "Retry-After": String(espera) } });
}
