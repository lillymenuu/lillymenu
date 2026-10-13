import { redirect } from "next/navigation";
import { getSessaoSuperadmin } from "@/lib/session";
import { getProvedorNfceAtivo } from "@/db/queries/nfce";
import { SaIntegracoesNfce } from "@/components/superadmin/sa-integracoes-nfce";

function statusCredenciais() {
  return {
    plugnotas: [
      { label: "Token sandbox", ok: Boolean((process.env.PLUGNOTAS_API_KEY_SANDBOX ?? "").trim()) },
      { label: "Token produção", ok: Boolean((process.env.PLUGNOTAS_API_KEY_PRODUCAO ?? "").trim()) },
    ],
    focusnfe: [{ label: "Token principal", ok: Boolean((process.env.FOCUSNFE_TOKEN_PRODUCAO ?? "").trim()) }],
  };
}

export default async function SuperadminIntegracoesNfcePage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  const provedorInicial = await getProvedorNfceAtivo();
  return <SaIntegracoesNfce provedorInicial={provedorInicial} credenciais={statusCredenciais()} />;
}
