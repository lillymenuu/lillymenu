import { Card, CardContent } from "@/components/ui/card";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import { getSidebarData } from "@/lib/sidebar";
import { SuporteChat, type SuporteMensagem } from "@/components/suporte/suporte-chat";

export default async function SuportePage() {
  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  let mensagens: SuporteMensagem[] = [];
  let erro: string | null = null;
  let lojaNome = "Minha loja";
  let lojaLogo: string | null = null;

  try {
    const dados = await phpApiFetch<{ ok: true; mensagens: SuporteMensagem[] }>("/admin/api/v1/suporte_mensagens.php");
    mensagens = dados.mensagens;
    const { loja } = await getSidebarData();
    lojaNome = loja.nome;
    if (loja.logo) lojaLogo = loja.logo.startsWith("http") ? loja.logo : `${phpAdminUrl}/${loja.logo}`;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o suporte.";
  }

  if (erro) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-5">
      <SuporteChat mensagensIniciais={mensagens} phpAdminUrl={phpAdminUrl} lojaNome={lojaNome} lojaLogo={lojaLogo} />
    </div>
  );
}
