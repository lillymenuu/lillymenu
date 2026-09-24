import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoSuperadmin } from "@/lib/session";
import { getConversasSuporteSuperadmin } from "@/lib/superadminServer";
import { SaSuporte, type SaConversa } from "@/components/superadmin/sa-suporte";

export default async function SuperadminSuportePage() {
  const sessao = await getSessaoSuperadmin();
  if (!sessao) redirect("/superadmin/login");

  let conversas: SaConversa[] = [];
  let erro: string | null = null;

  try {
    conversas = await getConversasSuporteSuperadmin(true);
  } catch {
    erro = "Erro ao carregar o suporte.";
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
