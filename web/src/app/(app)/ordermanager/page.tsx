import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getPedidosKanban, getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy, Pedido } from "@/lib/pedidos";
import { OrderManager } from "@/components/ordermanager/order-manager";

async function carregarDados(lojaId: number) {
  const [kanban, motoboysRes] = await Promise.all([getPedidosKanban(lojaId), getMotoboysAtivos(lojaId)]);
  return { pedidos: kanban.pedidos, motoboys: motoboysRes.motoboys };
}

export default async function OrderManagerPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: { pedidos: Pedido[]; motoboys: Motoboy[] } | null = null;
  let erro: string | null = null;

  try {
    dados = await carregarDados(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o gestor de pedidos.";
  }

  if (!dados) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
        </Card>
      </div>
    );
  }

  const phpAdminUrl = process.env.NEXT_PUBLIC_PHP_ADMIN_URL ?? "";
  return <OrderManager pedidosIniciais={dados.pedidos} motoboys={dados.motoboys} phpAdminUrl={phpAdminUrl} />;
}
