import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getClientesListar } from "@/lib/clientes";
import { ClientsManager } from "@/components/clients/clients-manager";

export default async function ClientsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let data: Awaited<ReturnType<typeof getClientesListar>> | null = null;
  let erro: string | null = null;

  try {
    data = await getClientesListar(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar os clientes.";
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

  return (
    <ClientsManager
      clientesIniciais={data.clientes}
      totalInicial={data.total}
      paginasInicial={data.paginas}
    />
  );
}
