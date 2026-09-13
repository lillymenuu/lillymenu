import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getCupons } from "@/lib/cuponsServer";
import { CouponsManager } from "@/components/coupons/coupons-manager";

export default async function CouponsPage() {
  let erro: string | null = null;

  try {
    const dados = await getCupons();
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
    return <CouponsManager dadosIniciais={dados} phpAdminUrl={phpAdminUrl} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar os cupons.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
