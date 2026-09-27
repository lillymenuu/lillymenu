"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { CaixaMovimentacaoItem, CaixaSuprimentosResposta } from "@/lib/caixa";

export function SuprimentosCard({ refreshKey }: { refreshKey: number }) {
  const [itens, setItens] = useState<CaixaMovimentacaoItem[]>([]);

  useEffect(() => {
    fetch("/api/cashcontrol/suprimentos", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: CaixaSuprimentosResposta) => {
        if (!data.ok) {
          toast.error(data.msg ?? "Erro ao carregar os suprimentos.");
          return;
        }
        setItens(data.itens);
      })
      .catch(() => toast.error("Erro ao carregar os suprimentos."));
  }, [refreshKey]);

  const total = itens.reduce((acc, i) => acc + i.valor, 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Suprimentos do caixa</div>
          <span className="text-sm font-semibold text-emerald-600">+{formatBRL(total)}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {itens.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum suprimento registrado neste turno.</p>
          )}
          {itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-col">
                <span className="font-medium">{item.observacoes ?? "Suprimento"}</span>
                <span className="text-xs text-muted-foreground">
                  {item.operador ?? "-"} · autorizado por {item.autorizado_por ?? "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-emerald-600">+{formatBRL(item.valor)}</span>
                  <span className="text-xs text-muted-foreground">{formatDataHoraCurta(item.criado_em)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/api/cashcontrol/movimentacao/${item.id}/comprovante`, "_blank")}
                  className="flex size-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  title="Imprimir comprovante"
                >
                  <Printer className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
