import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, suporteMensagens } from "@/db/schema";

/* Equivalente de admin/api/v1/superadmin_me.php. */
export async function superadminMe(adminId: number, nome: string): Promise<{ admin: { nome: string; email: string }; unread: number }> {
  const [linha] = await db.select({ email: admins.email }).from(admins).where(eq(admins.id, adminId)).limit(1);

  const [{ n }] = await db
    .select({ n: sql<string>`count(*)` })
    .from(suporteMensagens)
    .where(and(eq(suporteMensagens.remetente, "loja"), eq(suporteMensagens.lida_suporte, false)));

  return { admin: { nome, email: linha?.email ?? "" }, unread: Number(n) };
}
