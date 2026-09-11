import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getClientesListar } from "@/lib/clientes";
import { ClientsManager } from "@/components/clients/clients-manager";

export default async function ClientsPage() {
  let erro: string | null = null;

  try {
    const data = await getClientesListar();

    return (
      <ClientsManager
        clientesIniciais={data.clientes}
        totalInicial={data.total}
        paginasInicial={data.paginas}
      />
    );
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar os clientes.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
