import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getSessaoAdmin } from "@/lib/session";
import { getWlConversas } from "@/lib/whatslillyServer";
import { WhatslillyManager } from "@/components/whatslilly/whatslilly-manager";

export default async function WhatslillyPage() {
  const sessao = await getSessaoAdmin();
  if (!sessao) redirect("/login");

  let dados: Awaited<ReturnType<typeof getWlConversas>> | null = null;
  let erro: string | null = null;

  try {
    dados = await getWlConversas(sessao.lojaId);
  } catch {
    erro = "Erro ao carregar o WhatsLilly.";
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

  return <WhatslillyManager dadosIniciais={dados} />;
}
