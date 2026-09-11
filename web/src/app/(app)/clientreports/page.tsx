import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getRelatoriosClientes } from "@/lib/relatoriosClientes";
import { ClientReportsManager } from "@/components/clientreports/client-reports-manager";

export default async function ClientReportsPage() {
  let erro: string | null = null;

  try {
    const dados = await getRelatoriosClientes({ periodo: "30" });

    return <ClientReportsManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o relatório de clientes.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
