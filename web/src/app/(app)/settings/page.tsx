import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getSessaoAdmin } from "@/lib/session";
import { getConfiguracoesDetalhe } from "@/lib/settingsServer";
import { SettingsManager } from "@/components/settings/settings-manager";

export default async function SettingsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getConfiguracoesDetalhe>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getConfiguracoesDetalhe(sessao.lojaId, sessao.id, sessao.perfil);
  } catch {
    erro = "Erro ao carregar a tela de configurações.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  return (
    <>
      <SettingsManager dadosIniciais={dados} phpAdminUrl={phpAdminUrl} />
      <ScrollToTop />
    </>
  );
}
