import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getBlListas } from "@/lib/broadcastlistServer";
import { BroadcastlistManager } from "@/components/broadcastlist/broadcastlist-manager";

export default async function BroadcastlistPage() {
  let erro: string | null = null;

  try {
    const dados = await getBlListas();
    return <BroadcastlistManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar as listas de transmissão.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
