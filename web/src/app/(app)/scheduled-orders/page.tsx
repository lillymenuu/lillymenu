import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getPedidosAgendados, getMotoboysAtivos } from "@/lib/pedidos";
import type { Motoboy, Pedido } from "@/lib/pedidos";
import { getConfiguracoesDetalhe } from "@/lib/settingsServer";
import { temRecursoPlano } from "@/db/queries/assinatura";
import { ScheduledOrdersCalendar } from "@/components/scheduled-orders/scheduled-orders-calendar";

export default async function ScheduledOrdersPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  // Recurso exclusivo do plano Essencial — loja no plano Basico nem acessa a
  // rota direto (o card em Settings ja fica bloqueado antes de chegar aqui).
  const disponivel = await temRecursoPlano(sessao.lojaId, sessao.perfil, "menu.pedidos_agendados");
  if (!disponivel) redirect("/settings");

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;

  let pedidos: Pedido[] = [];
  let motoboys: Motoboy[] = [];
  let agendamento: Awaited<ReturnType<typeof getConfiguracoesDetalhe>>["agendamento"] | null = null;
  let erro: string | null = null;

  try {
    const [pedidosRes, motoboysRes, configRes] = await Promise.all([
      getPedidosAgendados(sessao.lojaId, ano, mes),
      getMotoboysAtivos(sessao.lojaId),
      getConfiguracoesDetalhe(sessao.lojaId, sessao.id, sessao.perfil),
    ]);
    pedidos = pedidosRes.pedidos;
    motoboys = motoboysRes.motoboys;
    agendamento = configRes.agendamento;
  } catch {
    erro = "Erro ao carregar os pedidos agendados.";
  }

  if (!agendamento) {
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
    <ScheduledOrdersCalendar
      anoInicial={ano}
      mesInicial={mes}
      pedidosIniciais={pedidos}
      motoboys={motoboys}
      agendamento={agendamento}
      phpAdminUrl={phpAdminUrl}
    />
  );
}
