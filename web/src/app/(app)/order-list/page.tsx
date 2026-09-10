import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getPedidosListar, getMotoboysAtivos } from "@/lib/pedidos";
import { OrderListTable } from "@/components/order-list/order-list-table";

export default async function OrderListPage() {
  let erro: string | null = null;

  try {
    const [listagem, motoboysRes] = await Promise.all([getPedidosListar(), getMotoboysAtivos()]);
    const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";

    return (
      <OrderListTable
        pedidosIniciais={listagem.pedidos}
        totalInicial={listagem.total}
        paginasInicial={listagem.paginas}
        motoboys={motoboysRes.motoboys}
        phpAdminUrl={phpAdminUrl}
      />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar a lista de pedidos.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
