/*
 * Copia os DADOS de um dump MariaDB (phpMyAdmin, com INSERTs) para o Neon (PostgreSQL).
 *
 *   npx tsx scripts/db/migrar-dados.ts <dump.sql> --dry-run     # so le e mostra contagens
 *   npx tsx scripts/db/migrar-dados.ts <dump.sql> --reset       # limpa as tabelas e carrega
 *
 * Le o dump direto do disco (nao precisa de MySQL local). O arquivo do dump tem dados
 * reais — mantenha-o FORA do repositorio. Requer DATABASE_URL em web/.env.local.
 */
import fs from "node:fs";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable, type AnyPgColumn } from "drizzle-orm/pg-core";
import * as schema from "../../src/db/schema";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const dumpPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const reset = args.includes("--reset");

if (!dumpPath) {
  console.error("Uso: tsx scripts/db/migrar-dados.ts <dump.sql> [--dry-run] [--reset]");
  process.exit(1);
}

type Linha = Record<string, unknown>;

/* ---------- 1. leitura do dump ---------- */
const texto = fs.readFileSync(dumpPath, "utf8");

function lerValor(s: string, i: number): [unknown, number] {
  while (s[i] === " ") i++;
  const c = s[i];
  if (c === "'") {
    let out = "";
    i++;
    for (;;) {
      const ch = s[i];
      if (ch === "\\") {
        const n = s[i + 1];
        const mapa: Record<string, string> = { n: "\n", r: "\r", t: "\t", "0": "\0", b: "\b", Z: "\x1a" };
        out += mapa[n] ?? n;
        i += 2;
      } else if (ch === "'") {
        if (s[i + 1] === "'") {
          out += "'";
          i += 2;
        } else {
          return [out, i + 1];
        }
      } else {
        out += ch;
        i++;
      }
    }
  }
  let j = i;
  while (j < s.length && s[j] !== "," && s[j] !== ")") j++;
  const bruto = s.slice(i, j).trim();
  if (/^NULL$/i.test(bruto)) return [null, j];
  return [bruto, j]; // numeros ficam como texto ate a conversao por tipo de coluna
}

function lerInserts(sql: string): Map<string, Linha[]> {
  const porTabela = new Map<string, Linha[]>();
  const re = /INSERT INTO `([^`]+)` \(([^)]+)\) VALUES\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const tabela = m[1];
    const colunas = m[2].split(",").map((c) => c.trim().replace(/`/g, ""));
    let i = re.lastIndex;
    const linhas = porTabela.get(tabela) ?? [];
    for (;;) {
      while (/\s/.test(sql[i])) i++;
      if (sql[i] !== "(") break;
      i++;
      const linha: Linha = {};
      for (const col of colunas) {
        const [v, prox] = lerValor(sql, i);
        linha[col] = v;
        i = prox;
        if (sql[i] === ",") i++;
      }
      if (sql[i] !== ")") throw new Error(`Tupla mal formada em ${tabela} perto de: ${sql.slice(i - 40, i + 40)}`);
      i++;
      linhas.push(linha);
      while (/\s/.test(sql[i])) i++;
      if (sql[i] === ",") {
        i++;
        continue;
      }
      break; // ';'
    }
    porTabela.set(tabela, linhas);
    re.lastIndex = i;
  }
  return porTabela;
}

/* ---------- 2. conversao por tipo de coluna ---------- */
function converter(col: AnyPgColumn, v: unknown): unknown {
  if (v === null || v === undefined) return null;
  switch (col.dataType) {
    case "boolean":
      return String(v) === "1" || String(v).toLowerCase() === "true";
    case "number":
      return Number(v);
    default:
      return v; // string (inclui timestamp/date em modo string, numeric)
  }
}

/* ---------- 3. ordem de carga (FKs) ---------- */
const tabelas = Object.values(schema).filter((t) => is(t, PgTable)) as unknown as PgTable[];
const info = tabelas.map((t) => getTableConfig(t));
const porNome = new Map(info.map((c) => [c.name, c]));

function ordenar(): string[] {
  const visitado = new Set<string>();
  const ordem: string[] = [];
  const visitar = (nome: string) => {
    if (visitado.has(nome)) return;
    visitado.add(nome);
    for (const fk of porNome.get(nome)!.foreignKeys) {
      const ref = getTableConfig(fk.reference().foreignTable).name;
      if (ref !== nome) visitar(ref);
    }
    ordem.push(nome);
  };
  for (const n of porNome.keys()) visitar(n);
  return ordem;
}

/* ---------- 4. execucao ---------- */
async function main() {
  const dados = lerInserts(texto);
  const ordem = ordenar();

  console.log(`Dump: ${[...dados.values()].reduce((s, l) => s + l.length, 0)} linhas em ${dados.size} tabelas com dados.`);
  const desconhecidas = [...dados.keys()].filter((n) => !porNome.has(n));
  if (desconhecidas.length) {
    console.error("Tabelas no dump sem correspondente no esquema:", desconhecidas.join(", "));
    process.exit(1);
  }

  if (dryRun) {
    for (const nome of ordem) {
      const n = dados.get(nome)?.length ?? 0;
      if (n) console.log(`  ${nome.padEnd(36)} ${n}`);
    }
    console.log("Dry-run concluido (nada foi gravado).");
    return;
  }

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL nao configurada em web/.env.local");
  const sql = neon(url);

  if (reset) {
    console.log("Limpando tabelas...");
    await sql.query(`TRUNCATE ${ordem.map((n) => `"${n}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }

  for (const nome of ordem) {
    const linhas = dados.get(nome);
    if (!linhas?.length) continue;
    const cfg = porNome.get(nome)!;
    const colunas = cfg.columns;
    const lote = Math.max(1, Math.floor(20000 / colunas.length));
    for (let i = 0; i < linhas.length; i += lote) {
      const parte = linhas.slice(i, i + lote);
      const params: unknown[] = [];
      const tuplas = parte.map((l) => {
        const marcadores = colunas.map((c) => {
          params.push(converter(c as AnyPgColumn, l[c.name]));
          return `$${params.length}`;
        });
        return `(${marcadores.join(",")})`;
      });
      await sql.query(
        `INSERT INTO "${nome}" (${colunas.map((c) => `"${c.name}"`).join(",")}) OVERRIDING SYSTEM VALUE VALUES ${tuplas.join(",")}`,
        params
      );
    }
    console.log(`  ${nome.padEnd(36)} ${linhas.length} linhas`);
  }

  console.log("Ajustando sequencias (ids)...");
  const identidades = (await sql.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND is_identity = 'YES'"
  )) as { table_name: string; column_name: string }[];
  for (const { table_name, column_name } of identidades) {
    await sql.query(
      `SELECT setval(pg_get_serial_sequence('"${table_name}"', '${column_name}'), COALESCE((SELECT MAX("${column_name}") FROM "${table_name}"), 0) + 1, false)`
    );
  }

  console.log("Conferindo contagens...");
  let divergencias = 0;
  for (const nome of ordem) {
    const esperado = dados.get(nome)?.length ?? 0;
    const r = (await sql.query(`SELECT COUNT(*)::int AS n FROM "${nome}"`)) as { n: number }[];
    if (r[0].n !== esperado) {
      divergencias++;
      console.error(`  DIVERGENCIA em ${nome}: dump=${esperado} neon=${r[0].n}`);
    }
  }
  console.log(divergencias ? `${divergencias} tabela(s) divergente(s).` : "Todas as contagens conferem.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
