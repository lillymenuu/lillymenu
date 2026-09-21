"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import { formatarData, saCall, urlArquivo, type SaLoja } from "@/lib/superadmin";

export function SaComprovanteDialog({
  loja,
  phpAdminUrl,
  onOpenChange,
  onAtualizado,
}: {
  loja: SaLoja | null;
  phpAdminUrl: string;
  onOpenChange: (v: boolean) => void;
  onAtualizado: () => void;
}) {
  return (
    <Dialog open={loja !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
        {loja && (
          <Conteudo key={loja.id} loja={loja} phpAdminUrl={phpAdminUrl} onFechar={() => onOpenChange(false)} onAtualizado={onAtualizado} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Conteudo({
  loja,
  phpAdminUrl,
  onFechar,
  onAtualizado,
}: {
  loja: SaLoja;
  phpAdminUrl: string;
  onFechar: () => void;
  onAtualizado: () => void;
}) {
  const cob = loja.cobranca;
  const [motivo, setMotivo] = useState("");
  const [rejeitando, setRejeitando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const url = cob.comprovante ? urlArquivo(cob.comprovante, phpAdminUrl) : null;
  const ehPdf = url ? /\.pdf($|\?)/i.test(url) : false;

  async function decidir(acao: "aprovar_comprovante" | "rejeitar_comprovante") {
    setEnviando(true);
    try {
      const r = await saCall("superadmin_loja_acao", { acao, cobranca_id: cob.id, motivo });
      if (!r.ok) {
        toast.error(r.msg ?? "Não foi possível concluir.");
        return;
      }
      toast.success(acao === "aprovar_comprovante" ? "Pagamento aprovado" : "Comprovante rejeitado");
      onAtualizado();
      onFechar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Comprovante — {loja.nome}</DialogTitle>
      </DialogHeader>

      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Valor</dt>
          <dd className="font-semibold">{cob.valor != null ? formatBRLMilhar(cob.valor) : "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Vencimento</dt>
          <dd className="font-semibold">{formatarData(cob.vencimento)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Enviado em</dt>
          <dd className="font-semibold">{formatarData(cob.comprovante_em)}</dd>
        </div>
      </dl>

      {url ? (
        <div className="flex flex-col items-start gap-2">
          {ehPdf ? (
            <p className="text-sm text-muted-foreground">O comprovante é um PDF.</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Comprovante" className="max-h-80 w-full rounded-lg border object-contain" />
          )}
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Abrir em nova aba <ExternalLink size={14} />
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum comprovante enviado.</p>
      )}

      {rejeitando && (
        <Input placeholder="Motivo da rejeição (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
      )}

      <DialogFooter>
        {rejeitando ? (
          <>
            <Button variant="outline" onClick={() => setRejeitando(false)} disabled={enviando}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={() => decidir("rejeitar_comprovante")} disabled={enviando}>
              Confirmar rejeição
            </Button>
          </>
        ) : (
          <>
            {cob.aguardando_revisao && (
              <Button variant="outline" onClick={() => setRejeitando(true)} disabled={enviando}>
                Rejeitar
              </Button>
            )}
            {cob.aguardando_revisao && (
              <Button onClick={() => decidir("aprovar_comprovante")} disabled={enviando}>
                {enviando ? "Aprovando..." : "Aprovar pagamento"}
              </Button>
            )}
          </>
        )}
      </DialogFooter>
    </>
  );
}
