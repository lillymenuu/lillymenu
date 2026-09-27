import { redirect } from "next/navigation";
import { getSessaoSuperadmin } from "@/lib/session";
import { getLandingConfig } from "@/db/queries/landingConfig";
import { SaLandingEditor } from "@/components/superadmin/sa-landing-editor";

export default async function SuperadminLandingPage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  const config = await getLandingConfig();
  return <SaLandingEditor configInicial={config} />;
}
