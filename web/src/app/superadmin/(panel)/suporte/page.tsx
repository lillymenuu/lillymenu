import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { superApiFetch } from "@/lib/superApi";
import { SaSuporte, type SaConversa } from "@/components/superadmin/sa-suporte";

export default async function SuperadminSuportePage() {
  let conversas: SaConversa[] = [];
  let erro: string | null = null;

  try {
    const r = await superApiFetch<{ ok: true; conversas: SaConversa[] }>("/admin/api/v1/superadmin_suporte.php?acao=conversas");
    conversas = r.conversas;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o suporte.";
  }

  if (erro) {
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    );
  }

  return <SaSuporte conversasIniciais={conversas} phpAdminUrl={process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? ""} />;
}
