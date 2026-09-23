import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getBlListas } from "@/lib/broadcastlistServer";
import { BroadcastlistManager } from "@/components/broadcastlist/broadcastlist-manager";

export default async function BroadcastlistPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getBlListas>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getBlListas(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar as listas de transmissão.";
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

  return <BroadcastlistManager dadosIniciais={dados} />;
}
