"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";
import { MOTIVOS_SAIDA, labelMotivoSaida } from "@/lib/caixaMotivos";
import type { CaixaSupervisor } from "@/lib/caixa";

export function LancarSaidaDialog({
  open,
  onOpenChange,
  saldoDisponivel,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saldoDisponivel: number;
  onSucesso: () => void;
}) {
  const [etapa, setEtapa] = useState<"dados" | "senha">("dados");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [supervisores, setSupervisores] = useState<CaixaSupervisor[]>([]);
  const [autorizadoPorId, setAutorizadoPorId] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const valorNumero = parseFloat(valor || "0");
  const saldoInsuficiente = valorNumero > 0 && valorNumero > saldoDisponivel;
  const supervisorSelecionado = supervisores.find((s) => String(s.id) === autorizadoPorId);

  const motivoItems: Record<string, string> = {};
  for (const m of MOTIVOS_SAIDA) motivoItems[m.valor] = m.label;
  const supervisorItems: Record<string, string> = {};
  for (const s of supervisores) supervisorItems[String(s.id)] = s.nome;

  useEffect(() => {
    if (!open) return;
    setEtapa("dados");
    setValor("");
    setMotivo("");
    setDescricao("");
    setAutorizadoPorId("");
    setSenha("");

    fetch("/api/cashcontrol/supervisores", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { ok: boolean; itens?: CaixaSupervisor[] }) => {
        if (data.ok) setSupervisores(data.itens ?? []);
      })
      .catch(() => setSupervisores([]));
  }, [open]);

  function avancar() {
    if (!valorNumero || valorNumero <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    if (saldoInsuficiente) {
      toast.error(`Saldo insuficiente em caixa. Saldo disponível: ${formatBRL(saldoDisponivel)}`);
      return;
    }
    if (!motivo) {
      toast.error("Selecione o motivo da saída.");
      return;
    }
    if (motivo === "outro" && !descricao.trim()) {
      toast.error("Descreva o motivo da saída.");
      return;
    }
    if (!autorizadoPorId) {
      toast.error("Selecione o responsável pela autorização.");
      return;
    }
    setEtapa("senha");
  }

  async function confirmarComSenha() {
    if (!senha) {
      toast.error("Digite a senha do responsável para autorizar a saída.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/cashcontrol/movimentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "sangria",
          valor: valorNumero,
          motivo,
          observacoes: descricao,
          autorizado_por_id: Number(autorizadoPorId),
          autorizado_por_senha: senha,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível registrar a saída.");
        return;
      }
      toast.success("Saída registrada com sucesso.");
      onOpenChange(false);
      onSucesso();
    } catch {
      toast.error("Não foi possível registrar a saída.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{etapa === "dados" ? "Lançar saída" : "Autorização da saída"}</DialogTitle>
        </DialogHeader>

        {etapa === "dados" ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">Saldo disponível em dinheiro: {formatBRL(saldoDisponivel)}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saida-valor">Valor</Label>
              <MoneyInput id="saida-valor" value={valor} onChange={setValor} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" />
              {saldoInsuficiente && <p className="text-xs text-destructive">Valor maior que o saldo disponível em caixa.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Motivo da saída</Label>
              <Select items={motivoItems} value={motivo} onValueChange={(v) => setMotivo(v ?? "")}>
                <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_SAIDA.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saida-descricao">Descrição / observação</Label>
              <textarea
                id="saida-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Pago R$ 50,00 ao motoboy Carlos pelo conserto do pneu"
                rows={3}
                maxLength={255}
                className="w-full rounded-2xl border-0 bg-muted/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Responsável pela autorização</Label>
              <Select items={supervisorItems} value={autorizadoPorId} onValueChange={(v) => setAutorizadoPorId(v ?? "")}>
                <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm">
                  <SelectValue placeholder="Selecione o gerente/supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {supervisores.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-xl border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <strong className="text-destructive">{formatBRL(valorNumero)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Motivo</span>
                <span>{labelMotivoSaida(motivo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responsável</span>
                <span>{supervisorSelecionado?.nome ?? "-"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saida-senha">Senha de {supervisorSelecionado?.nome ?? "autorização"}</Label>
              <Input
                id="saida-senha"
                type="password"
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha para autorizar"
                className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t-0 bg-transparent">
          {etapa === "senha" && (
            <Button variant="outline" className="rounded-full font-normal" onClick={() => setEtapa("dados")} disabled={enviando}>
              Voltar
            </Button>
          )}
          <Button
            className="rounded-full font-normal"
            onClick={etapa === "dados" ? avancar : confirmarComSenha}
            disabled={enviando || (etapa === "dados" && saldoInsuficiente)}
          >
            {enviando ? "Registrando..." : "Confirmar saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
