"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataHoraCurta } from "@/components/cliente/types";
import type { CaixaDetalheResposta } from "@/lib/caixa";

const FORMA_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  voucher: "Voucher",
  manual: "Manual",
  outro: "Outros",
};

const POR_PAGINA = 4;

export function CaixaDetalheDialog({
  caixaId,
  onOpenChange,
}: {
  caixaId: number | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [dados, setDados] = useState<CaixaDetalheResposta | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (caixaId === null) return;
    setCarregando(true);
    setErro("");
    setDados(null);
    setPagina(1);
    fetch(`/api/cashcontrol/detalhe?caixa_id=${caixaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErro(data.msg ?? "Não foi possível carregar o caixa.");
          return;
        }
        setDados(data);
      })
      .catch(() => setErro("Não foi possível carregar o caixa."))
      .finally(() => setCarregando(false));
  }, [caixaId]);

  const linhas = dados?.linhas ?? [];
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const linhasPagina = linhas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <Dialog open={caixaId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Caixa {dados ? `#${dados.caixa.id}` : ""}</DialogTitle>
        </DialogHeader>
        {carregando && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
        {!carregando && erro && <p className="py-6 text-center text-sm text-destructive">{erro}</p>}
        {!carregando && dados && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant={dados.caixa.status === "aberto" ? "default" : "secondary"}>
                {dados.caixa.status === "aberto" ? "Aberto" : "Fechado"}
              </Badge>
              <span className="text-muted-foreground">
                Operador: {dados.caixa.operador} · Saldo inicial: {formatBRL(dados.caixa.saldo_inicial)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Aberto em: {formatDataHoraCurta(dados.caixa.aberto_em)}</span>
              <span>Fechado em: {dados.caixa.fechado_em ? formatDataHoraCurta(dados.caixa.fechado_em) : "-"}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Entrada</div>
                <div className="font-semibold text-emerald-600">{formatBRL(dados.resumo.entrada)}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Saída</div>
                <div className="font-semibold text-destructive">{formatBRL(dados.resumo.saida)}</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-xs text-muted-foreground">Saldo</div>
                <div className="font-semibold">{formatBRL(dados.resumo.saldo)}</div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Formas de pagamento</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(dados.formas).map(([forma, valor]) => (
                  <div key={forma} className="flex justify-between rounded-lg border px-3 py-1.5">
                    <span className="text-muted-foreground">{FORMA_LABELS[forma] ?? forma}</span>
                    <span>{formatBRL(valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold">Movimentações do caixa</div>
              <div className="flex flex-col gap-1.5">
                {linhasPagina.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
                )}
                {linhasPagina.map((l) => (
                  <div key={l.uid} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <div>{l.observacoes ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{formatDataHoraCurta(l.criado_em)}</div>
                    </div>
                    <span className={l.direcao === "saida" ? "text-destructive" : "text-emerald-600"}>
                      {l.direcao === "saida" ? "-" : "+"}
                      {formatBRL(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
              {totalPaginas > 1 && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <button
                    type="button"
                    disabled={pagina <= 1}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    className="disabled:opacity-40"
                  >
                    ‹ Anterior
                  </button>
                  <span>
                    Página {pagina} de {totalPaginas}
                  </span>
                  <button
                    type="button"
                    disabled={pagina >= totalPaginas}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    className="disabled:opacity-40"
                  >
                    Próxima ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
