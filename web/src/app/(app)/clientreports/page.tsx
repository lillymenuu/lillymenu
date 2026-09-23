import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getRelatoriosClientes } from "@/lib/relatoriosClientes";
import { ClientReportsManager } from "@/components/clientreports/client-reports-manager";

export default async function ClientReportsPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getRelatoriosClientes>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getRelatoriosClientes(sessao.lojaId, { periodo: "30" });
  } catch {
    erro = "Erro ao carregar o relatório de clientes.";
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

  return <ClientReportsManager dadosIniciais={dados} />;
}
