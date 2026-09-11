"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ChevronRight, History, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatDataCurta } from "@/components/cliente/types";
import { HistoricoDialog } from "@/components/plandetails/historico-dialog";
import { RenovacaoPagamento } from "@/components/plandetails/renovacao-pagamento";
import type { AssinaturaDetalheResposta } from "@/lib/assinatura";

function badgeInfo(status: string): { texto: string; className: string } {
  if (status === "ativa") {
    return { texto: "Assinatura ativa", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" };
  }
  if (status === "suspensa") {
    return { texto: "Assinatura suspensa", className: "bg-destructive/10 text-destructive" };
  }
  if (status === "cancelada") {
    return { texto: "Assinatura cancelada", className: "bg-destructive/10 text-destructive" };
  }
  return { texto: "Período de teste", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" };
}

export function PlanDetailsManager({ dados }: { dados: AssinaturaDetalheResposta }) {
  const { assinatura, plano, assinatura_desde, loja_nome, saas } = dados;
  const cobrancaPendente = dados.cobranca_pendente;
  const planosDisponiveis = dados.planos_disponiveis;

  const [trocarAberto, setTrocarAberto] = useState(false);
  const [planoEscolhido, setPlanoEscolhido] = useState<number | null>(null);
  const [trocarMsg, setTrocarMsg] = useState("");
  const [trocando, setTrocando] = useState(false);

  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [renovarAberto, setRenovarAberto] = useState(false);

  const [cpf, setCpf] = useState(dados.perfil_cobranca.cpf);
  const [telefone, setTelefone] = useState(dados.perfil_cobranca.telefone);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [perfilPreenchido, setPerfilPreenchido] = useState(
    dados.perfil_cobranca.cpf !== "" && dados.perfil_cobranca.telefone !== ""
  );

  const badge = badgeInfo(assinatura.status);
  const validoAteLabel = assinatura.status === "trial" ? "Trial válido até" : "Válido até";
  const validoAteData = assinatura.status === "trial" ? assinatura.trial_fim : assinatura.ciclo_fim;

  const msgReduzirPlano = `Olá, gostaria de reduzir o plano da minha loja ${loja_nome}.`;
  const whatsLinkReduzir = `https://wa.me/${saas.whatsapp_numero}?text=${encodeURIComponent(msgReduzirPlano)}`;
  const msgComprovante = `Ola, segue o comprovante do pagamento da mensalidade da loja ${loja_nome}.`;
  const whatsLink = `https://wa.me/${saas.whatsapp_numero}?text=${encodeURIComponent(msgComprovante)}`;

  async function confirmarTrocaPlano() {
    if (!planoEscolhido) {
      setTrocarMsg("Selecione um plano.");
      return;
    }
    setTrocando(true);
    setTrocarMsg("");
    try {
      const res = await fetch("/api/plan-details/trocar-plano", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano_id: planoEscolhido }),
      });
      const data = await res.json();
      if (!data.ok) {
        setTrocarMsg(data.msg ?? "Erro ao trocar de plano.");
        return;
      }
      toast.success(`Plano alterado para ${data.plano_nome}!`);
      setTrocarAberto(false);
      setPlanoEscolhido(null);
      window.location.reload();
    } catch {
      setTrocarMsg("Erro ao trocar de plano.");
    } finally {
      setTrocando(false);
    }
  }

  async function salvarPerfilCobranca(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    try {
      const res = await fetch("/api/plan-details/perfil-cobranca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, telefone }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar perfil.");
        return;
      }
      toast.success("Perfil salvo com sucesso.");
      setPerfilPreenchido(true);
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSalvandoPerfil(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Detalhes do seu plano</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua assinatura, histórico de pagamentos e troque de plano quando quiser.</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <Badge className={badge.className}>{badge.texto}</Badge>
              <div className="text-lg font-semibold">{plano.nome}</div>
              {validoAteData && (
                <div className="text-xs text-muted-foreground">
                  {validoAteLabel}: {formatDataCurta(validoAteData)}
                </div>
              )}
            </div>
            {assinatura.status !== "trial" && (
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg font-normal" onClick={() => setRenovarAberto(true)}>
                <RefreshCw className="size-3.5" /> Renovar
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Assinatura</span><span className="font-medium">{formatDataCurta(assinatura_desde)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor mensal</span><span className="font-medium">{formatBRL(plano.valor)}</span></div>
          </div>

          <button
            type="button"
            onClick={() => setHistoricoAberto(true)}
            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-2"><History className="size-4" /> Histórico de transações</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setTrocarAberto((v) => !v)}
            className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-2"><ArrowLeftRight className="size-4" /> Trocar de plano</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {trocarAberto && (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-3">
            <div className="text-base font-medium">Trocar de plano</div>
            {cobrancaPendente ? (
              <p className="text-sm text-destructive">Finalize o pagamento pendente antes de trocar de plano.</p>
            ) : planosDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Você já está no plano mais completo disponível.</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {planosDisponiveis.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="planoTroca"
                          value={p.id}
                          checked={planoEscolhido === p.id}
                          onChange={() => setPlanoEscolhido(p.id)}
                        />
                        {p.nome}
                      </span>
                      <span className="text-muted-foreground">{formatBRL(p.valor)}/mês</span>
                    </label>
                  ))}
                </div>
                {trocarMsg && <p className="text-sm text-destructive">{trocarMsg}</p>}
                <Button className="rounded-lg font-normal" onClick={confirmarTrocaPlano} disabled={trocando}>
                  {trocando ? "Confirmando..." : "Confirmar troca"}
                </Button>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Por aqui só é possível fazer upgrade. Para reduzir de plano,{" "}
              <a href={whatsLinkReduzir} target="_blank" rel="noopener" className="underline">
                fale com o suporte
              </a>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {!perfilPreenchido && (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-3">
            <div>
              <div className="text-base font-medium">Perfil de cobrança</div>
              <p className="text-sm text-muted-foreground">Usado nos detalhes das suas transações.</p>
            </div>
            <form onSubmit={salvarPerfilCobranca} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="perfil-cpf">CPF</Label>
                  <Input id="perfil-cpf" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="perfil-telefone">Telefone</Label>
                  <Input id="perfil-telefone" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="rounded-lg font-normal" disabled={salvandoPerfil}>
                {salvandoPerfil ? "Salvando..." : "Salvar perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <HistoricoDialog open={historicoAberto} onOpenChange={setHistoricoAberto} planoNome={plano.nome} />

      <Dialog open={renovarAberto} onOpenChange={setRenovarAberto}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renovar assinatura</DialogTitle>
          </DialogHeader>
          <RenovacaoPagamento
            cobrancaPendenteInicial={cobrancaPendente}
            saasPixChave={saas.pix_chave}
            saasPixNome={saas.pix_nome}
            whatsLink={whatsLink}
            lojaNome={loja_nome}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
