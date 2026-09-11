"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataCurta, formatDataHoraCurta } from "@/components/cliente/types";
import type { Transacao } from "@/lib/assinatura";

function statusBadge(status: string) {
  if (status === "pago") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{status}</Badge>;
  if (status === "atrasado") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

type TransacaoDetalhe = {
  transacao: Transacao;
  pagador: { nome: string; email: string; cpf: string; telefone: string };
};

function TransacaoDetalheDialog({
  cobrancaId,
  planoNome,
  onOpenChange,
}: {
  cobrancaId: number | null;
  planoNome: string;
  onOpenChange: (v: boolean) => void;
}) {
  const [detalhe, setDetalhe] = useState<TransacaoDetalhe | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (cobrancaId === null) return;
    setCarregando(true);
    setErro("");
    setDetalhe(null);
    fetch(`/api/plan-details/transacao-detalhe?cobranca_id=${cobrancaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErro(data.msg ?? "Erro ao carregar transação.");
          return;
        }
        setDetalhe({ transacao: data.transacao, pagador: data.pagador });
      })
      .catch(() => setErro("Erro ao carregar transação."))
      .finally(() => setCarregando(false));
  }, [cobrancaId]);

  const t = detalhe?.transacao;
  const p = detalhe?.pagador;

  return (
    <Dialog open={cobrancaId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da transação</DialogTitle>
        </DialogHeader>
        {carregando && <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>}
        {!carregando && erro && <p className="py-4 text-center text-sm text-destructive">{erro}</p>}
        {!carregando && t && p && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 py-2">
              <div className="text-2xl font-semibold">{formatBRL(t.valor)}</div>
              <div className="text-sm text-muted-foreground">
                {t.pago_em ? `Pago em ${formatDataHoraCurta(t.pago_em)}` : `Vencimento ${formatDataCurta(t.vencimento)}`}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
              <div className="font-medium">Informações do pagamento</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{t.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span>{t.origem === "mercadopago" ? "Pix" : "Comprovante manual"}</span></div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
              <div className="font-medium">Itens</div>
              <div className="flex justify-between"><span className="text-muted-foreground">{planoNome}</span><span>{formatBRL(t.valor)}</span></div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
              <div className="font-medium">Perfil de pagamento</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span>{p.nome || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span>{p.email || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span>{p.cpf || "-"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{p.telefone || "-"}</span></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function HistoricoDialog({
  open,
  onOpenChange,
  planoNome,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planoNome: string;
}) {
  const [transacoes, setTransacoes] = useState<Transacao[] | null>(null);
  const [erro, setErro] = useState("");
  const [detalheId, setDetalheId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setTransacoes(null);
    setErro("");
    fetch("/api/plan-details/historico")
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErro(data.msg ?? "Erro ao carregar histórico.");
          return;
        }
        setTransacoes(data.transacoes);
      })
      .catch(() => setErro("Erro ao carregar histórico."));
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico de transações</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Você está vendo suas transações dos últimos 12 meses</p>
          <div className="flex flex-col gap-2">
            {transacoes === null && !erro && <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>}
            {erro && <p className="py-4 text-center text-sm text-destructive">{erro}</p>}
            {transacoes !== null && transacoes.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma transação encontrada.</p>
            )}
            {transacoes?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDetalheId(t.id)}
                className="flex items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/40"
              >
                <div>
                  <div className="text-sm font-medium">{formatBRL(t.valor)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.origem === "mercadopago" ? "Pix automático" : "Comprovante manual"}
                    {" · "}
                    {t.pago_em ? `pago em ${formatDataCurta(t.pago_em)}` : `vencimento ${formatDataCurta(t.vencimento)}`}
                  </div>
                </div>
                {statusBadge(t.status)}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <TransacaoDetalheDialog
        cobrancaId={detalheId}
        planoNome={planoNome}
        onOpenChange={(v) => !v && setDetalheId(null)}
      />
    </>
  );
}
