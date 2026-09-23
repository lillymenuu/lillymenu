import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getSessaoAdmin } from "@/lib/session";
import { getPromoListar } from "@/lib/promo";
import { PromotionManager } from "@/components/promotion/promotion-manager";

export default async function PromotionPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let data: Awaited<ReturnType<typeof getPromoListar>> | null = null;
  let erro: string | null = null;

  try {
    data = await getPromoListar(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar a tela de promoções.";
  }

  if (!data) {
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
      <PromotionManager
        produtosIniciais={data.produtos}
        limiteAtivas={data.limite_ativas}
        flyersIniciais={data.flyers}
        flyersAtivoInicial={data.flyers_ativo}
        phpAdminUrl={phpAdminUrl}
      />
      <ScrollToTop />
    </>
  );
}
