import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getConfiguracoesDetalhe } from "@/lib/settingsServer";
import { SettingsManager } from "@/components/settings/settings-manager";

export default async function SettingsPage() {
  let erro: string | null = null;

  try {
    const dados = await getConfiguracoesDetalhe();
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
    return <SettingsManager dadosIniciais={dados} phpAdminUrl={phpAdminUrl} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar a tela de configurações.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
