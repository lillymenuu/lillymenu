import { Card, CardContent } from "@/components/ui/card";
import { phpApiFetch, PhpApiError } from "@/lib/phpApi";
import { SuporteChat, type SuporteMensagem } from "@/components/suporte/suporte-chat";

export default async function SuportePage() {
  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  let mensagens: SuporteMensagem[] = [];
  let erro: string | null = null;

  try {
    const dados = await phpApiFetch<{ ok: true; mensagens: SuporteMensagem[] }>("/admin/api/v1/suporte_mensagens.php");
    mensagens = dados.mensagens;
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
      <SuporteChat mensagensIniciais={mensagens} phpAdminUrl={phpAdminUrl} />
    </div>
  );
}
