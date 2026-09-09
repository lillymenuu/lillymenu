"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDataHoraCurta, type ClienteAvaliacao } from "./types";

export function ClienteAvaliacoesTab({ clienteId }: { clienteId: number }) {
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [avaliacoes, setAvaliacoes] = useState<ClienteAvaliacao[]>([]);
  const [paginas, setPaginas] = useState(1);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    fetch(`/api/cliente/avaliacoes?id=${clienteId}&pagina=${pagina}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelado || !data.ok) return;
        setAvaliacoes(data.avaliacoes ?? []);
        setPaginas(data.paginas ?? 1);
      })
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [clienteId, pagina]);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold">Avaliações feitas pelo cliente</div>

      {carregando ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : avaliacoes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-6 text-center">
          <MessageCircle size={18} className="text-muted-foreground" />
          <span className="text-sm font-normal text-muted-foreground">
            Este cliente ainda não deixou nenhuma avaliação.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {avaliacoes.map((a) => (
            <div key={a.id} className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill={i < a.nota ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatDataHoraCurta(a.criado_em)}
                </span>
              </div>
              {a.descricao && <p className="font-normal">{a.descricao}</p>}
            </div>
          ))}
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
