import { Card, CardContent } from "@/components/ui/card";
import { PhpApiError } from "@/lib/phpApi";
import { getWlConversas } from "@/lib/whatslillyServer";
import { WhatslillyManager } from "@/components/whatslilly/whatslilly-manager";

export default async function WhatslillyPage() {
  let erro: string | null = null;

  try {
    const dados = await getWlConversas();
    return <WhatslillyManager dadosIniciais={dados} />;
  } catch (e) {
    erro = e instanceof PhpApiError ? e.message : "Erro ao carregar o WhatsLilly.";
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <Card className="border-destructive/40">
        <CardContent className="py-6 text-center text-sm text-destructive">{erro}</CardContent>
      </Card>
    </div>
  );
}
