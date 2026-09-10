import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getPedidos, getMotoboysAtivos } from "@/lib/pedidos";
import { getSidebarData } from "@/lib/sidebar";
import { OrderManager } from "@/components/ordermanager/order-manager";

export default async function OrderManagerPage() {
  let erro: string | null = null;

  try {
    const [{ pedidos }, motoboysRes] = await Promise.all([getPedidos(), getMotoboysAtivos()]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    let adminNome = "";
    try {
      const sidebarData = await getSidebarData();
      adminNome = sidebarData.admin.nome;
    } catch {
      // sino/sidebar podem falhar sem bloquear o resto da tela; "Editado por" so fica vazio
    }

    return (
      <OrderManager
        pedidosIniciais={pedidos}
        motoboys={motoboysRes.motoboys}
        phpAdminUrl={phpAdminUrl}
        adminNome={adminNome}
      />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o gestor de pedidos.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
