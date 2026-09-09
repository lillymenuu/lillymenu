"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDataHoraCurta, type ClientePonto } from "./types";

const TIPO_INFO: Record<string, { label: string; positivo: boolean }> = {
  ganho: { label: "Pontos ganhos", positivo: true },
  uso: { label: "Pontos usados", positivo: false },
  pendente: { label: "Pontos pendentes", positivo: true },
  expirado: { label: "Pontos expirados", positivo: false },
};

export function ClientePontosTab({ clienteId }: { clienteId: number }) {
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [pontos, setPontos] = useState<ClientePonto[]>([]);
  const [paginas, setPaginas] = useState(1);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/cliente/pontos?id=${clienteId}&pagina=${pagina}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelado || !data.ok) return;
        setPontos(data.pontos ?? []);
        setPaginas(data.paginas ?? 1);
      })
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [clienteId, pagina]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-sm font-medium">Extrato de pontos</div>

      {carregando ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : pontos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma movimentação de pontos ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pontos.map((p) => {
            const info = TIPO_INFO[p.tipo] ?? { label: p.tipo, positivo: p.pontos >= 0 };
            const Icone = info.positivo ? ArrowUp : p.tipo === "pendente" ? Clock : ArrowDown;
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                <span
                  className={
                    info.positivo
                      ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600"
                      : "flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
                  }
                >
                  <Icone size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-normal">{info.label}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {formatDataHoraCurta(p.criado_em)}
                  </div>
                </div>
                <span
                  className={
                    info.positivo
                      ? "shrink-0 font-medium text-emerald-600"
                      : "shrink-0 font-medium text-destructive"
                  }
                >
                  {info.positivo ? "+" : ""}
                  {p.pontos} pts
                </span>
              </div>
            );
          })}
        </div>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-lg"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs text-muted-foreground">
            {pagina} / {paginas}
          </span>
          <Button
            size="icon-sm"
            variant="outline"
            className="rounded-lg"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
