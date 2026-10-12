import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { getDadosFiscaisLoja } from "@/db/queries/nfce";
import { NfceSettingsManager } from "@/components/nfce/nfce-settings-manager";

export default async function NfcePage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  // Modulo NFCe e exclusivo do plano Essencial — mesmo mecanismo de
  // recursos_json usado por Pedidos agendados (menu.pedidos_agendados).
  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.nfce");
  if (!disponivel) redirect("/settings");

  let dadosIniciais: Awaited<ReturnType<typeof getDadosFiscaisLoja>> = null;
  let erro: string | null = null;
  try {
    dadosIniciais = await getDadosFiscaisLoja(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar os dados fiscais da loja.";
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return <NfceSettingsManager dadosIniciais={dadosIniciais} />;
}
