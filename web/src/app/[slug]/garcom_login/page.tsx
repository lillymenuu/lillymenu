import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolverLojaIdPorSlug } from "@/db/queries/lojaPerfil";
import { perfilGarcomLoja } from "@/db/queries/modoGarcom";
import { getSessaoGarcom } from "@/lib/session";
import { GarcomLoginForm } from "@/components/waitermode/garcom-login-form";

async function baseUrlAtual(): Promise<string> {
  const store = await headers();
  const host = store.get("x-forwarded-host") ?? store.get("host") ?? "localhost";
  const proto = store.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/`;
}

/* Equivalente de public/garcom_login.php. */
export default async function GarcomLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lojaId = await resolverLojaIdPorSlug(slug);
  if (!lojaId) notFound();

  const sessao = await getSessaoGarcom();
  if (sessao && sessao.lojaId === lojaId) redirect(`/${slug}/garcom`);

  const baseUrl = await baseUrlAtual();
  const perfil = await perfilGarcomLoja(lojaId, baseUrl);

  return <GarcomLoginForm lojaId={lojaId} slug={slug} nomeLoja={perfil.nomeLoja} logoUrl={perfil.logoUrl} />;
}
