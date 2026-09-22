import { sql } from "drizzle-orm";
import { clientes } from "@/db/schema";

/* Equivalente de helpers/telefone.php — sem "server-only": sao so funcoes puras/SQL. */

export function apenasDigitos(tel: string): string {
  return tel.replace(/\D+/g, "");
}

export function formatarTelefoneBR(tel: string): string {
  const d = apenasDigitos(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

/** Remove mascara de telefone via SQL, pra comparar com o que foi digitado (com ou sem mascara). */
export const telefoneSemMascara = sql<string>`replace(replace(replace(replace(replace(${clientes.telefone},'(',''),')',''),' ',''),'-',''),'+','')`;
