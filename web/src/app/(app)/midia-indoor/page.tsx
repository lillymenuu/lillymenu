import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessaoAdmin } from "@/lib/session";
import { exigirRecurso } from "@/lib/acessoRecurso";
import { listarTvs } from "@/db/queries/midiaIndoor";
import { listarCategorias } from "@/db/queries/categoriasAdmin";
import { MidiaIndoorManager } from "@/components/midia-indoor/midia-indoor-manager";

export default async function MidiaIndoorPage() {
  await exigirRecurso("midiaIndoor");
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";

  const [tvs, categorias] = await Promise.all([listarTvs(sessao.lojaId), listarCategorias(sessao.lojaId)]);

  return (
    <MidiaIndoorManager
      tvsIniciais={tvs}
      categorias={categorias.filter((c) => c.ativo !== false).map((c) => ({ id: c.id, nome: c.nome ?? "Sem nome" }))}
      linkTv={`${proto}://${host}/tv`}
    />
  );
}
