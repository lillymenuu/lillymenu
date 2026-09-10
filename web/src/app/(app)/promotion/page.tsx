import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getPromoListar } from "@/lib/promo";
import { PromotionManager } from "@/components/promotion/promotion-manager";

export default async function PromotionPage() {
  let erro: string | null = null;

  try {
    const data = await getPromoListar();
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <PromotionManager
        produtosIniciais={data.produtos}
        limiteAtivas={data.limite_ativas}
        flyersIniciais={data.flyers}
        flyersAtivoInicial={data.flyers_ativo}
        phpAdminUrl={phpAdminUrl}
      />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar a tela de promoções.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
