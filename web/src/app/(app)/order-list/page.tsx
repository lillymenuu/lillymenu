import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getPedidosListar, getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy } from "@/lib/pedidos";
import { OrderListTable } from "@/components/order-list/order-list-table";

export default async function OrderListPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let listagem: Awaited<ReturnType<typeof getPedidosListar>> | null = null;
  let motoboys: Motoboy[] = [];
  let erro: string | null = null;

  try {
    const [listagemRes, motoboysRes] = await Promise.all([getPedidosListar(sessao.lojaId), getMotoboysAtivos(sessao.lojaId)]);
    listagem = listagemRes;
    motoboys = motoboysRes.motoboys;
  } catch {
    erro = "Erro ao carregar a lista de pedidos.";
  }

  if (!listagem) {
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
    <OrderListTable
      pedidosIniciais={listagem.pedidos}
      totalInicial={listagem.total}
      paginasInicial={listagem.paginas}
      motoboys={motoboys}
      phpAdminUrl={phpAdminUrl}
    />
  );
}
