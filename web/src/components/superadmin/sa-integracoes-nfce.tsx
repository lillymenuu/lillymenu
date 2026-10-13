"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

type ProvedorNfce = "plugnotas" | "focusnfe";

type StatusCredenciais = {
  plugnotas: { sandbox: boolean; producao: boolean };
  focusnfe: { sandbox: boolean; producao: boolean };
};

const PROVEDORES: { id: ProvedorNfce; nome: string; descricao: string; docs: string }[] = [
  { id: "plugnotas", nome: "PlugNotas", descricao: "Conta única da Lilly Menu; cada loja é cadastrada lá como \"empresa\". Emissão assíncrona (webhook/consulta).", docs: "docs.plugnotas.com.br" },
  { id: "focusnfe", nome: "Focus NFe", descricao: "Cada loja ganha seu próprio token ao ser cadastrada. Emissão síncrona — status final já vem na resposta.", docs: "doc.focusnfe.com.br" },
];

export function SaIntegracoesNfce({ provedorInicial, credenciais }: { provedorInicial: ProvedorNfce; credenciais: StatusCredenciais }) {
  const [provedorAtivo, setProvedorAtivo] = useState(provedorInicial);
  const [salvando, setSalvando] = useState<ProvedorNfce | null>(null);

  async function ativar(provedor: ProvedorNfce) {
    if (provedor === provedorAtivo) return;
    setSalvando(provedor);
    try {
      const resp = await fetch("/api/superadmin/integracoes-nfce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provedor }),
      });
      const data = await resp.json();
      if (!data.ok) {
        toast.error(data.msg || "Erro ao trocar o provedor.");
        return;
      }
      setProvedorAtivo(provedor);
      toast.success(`${PROVEDORES.find((p) => p.id === provedor)?.nome} agora é o provedor ativo de NFCe.`);
    } catch {
      toast.error("Falha de conexão ao trocar o provedor.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-lg font-semibold">Integração NFCe</h1>
        <p className="text-sm text-muted-foreground">
          Escolha qual provedor emite as NFC-e do sistema. A troca vale pra todas as lojas de uma vez — notas já emitidas no provedor anterior continuam acessíveis, mas ações
          novas (como cancelar) passam a depender do provedor ativo.
        </p>
      </div>

      <div className="space-y-3">
        {PROVEDORES.map((provedor) => {
          const ativo = provedorAtivo === provedor.id;
          const cred = credenciais[provedor.id];
          return (
            <div key={provedor.id} className={cn("rounded-xl border p-5 transition-colors", ativo && "border-primary bg-primary/5")}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium">{provedor.nome}</h2>
                    {ativo && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <CheckCircle2 size={12} /> Ativo
                      </span>
                    )}
                  </div>
                  <p className="max-w-md text-sm text-muted-foreground">{provedor.descricao}</p>
                  <div className="flex gap-4 pt-1 text-xs">
                    <span className={cred.sandbox ? "text-foreground" : "text-muted-foreground"}>
                      {cred.sandbox ? "✓" : "✗"} Token sandbox {cred.sandbox ? "configurado" : "ausente"}
                    </span>
                    <span className={cred.producao ? "text-foreground" : "text-muted-foreground"}>
                      {cred.producao ? "✓" : "✗"} Token produção {cred.producao ? "configurado" : "ausente"}
                    </span>
                  </div>
                </div>
                <Button
                  variant={ativo ? "outline" : "default"}
                  size="sm"
                  disabled={ativo || salvando !== null}
                  onClick={() => ativar(provedor.id)}
                >
                  {salvando === provedor.id ? "Ativando…" : ativo ? "Em uso" : "Ativar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Os tokens mestre de cada provedor ficam nas variáveis de ambiente (<code className="rounded bg-muted px-1 py-0.5">.env.local</code>), não são editáveis por aqui.
      </p>
    </div>
  );
}
