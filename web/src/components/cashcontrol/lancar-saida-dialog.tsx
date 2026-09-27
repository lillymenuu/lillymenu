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
import { MOTIVOS_SAIDA, LIMITE_AUTORIZACAO_SENHA } from "@/lib/caixaMotivos";
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
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [supervisores, setSupervisores] = useState<CaixaSupervisor[]>([]);
  const [autorizadoPorId, setAutorizadoPorId] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  const valorNumero = parseFloat(valor || "0");
  const precisaSenha = valorNumero >= LIMITE_AUTORIZACAO_SENHA;
  const saldoInsuficiente = valorNumero > 0 && valorNumero > saldoDisponivel;

  useEffect(() => {
    if (!open) return;
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

  async function confirmar() {
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
    if (precisaSenha && !senha) {
      toast.error("Confirme a senha do responsável para autorizar essa saída.");
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
          autorizado_por_senha: precisaSenha ? senha : undefined,
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
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lançar saída</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">Saldo disponível em dinheiro: {formatBRL(saldoDisponivel)}</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="saida-valor">Valor</Label>
            <MoneyInput id="saida-valor" value={valor} onChange={setValor} />
            {saldoInsuficiente && <p className="text-xs text-destructive">Valor maior que o saldo disponível em caixa.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Motivo da saída</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v ?? "")}>
              <SelectTrigger className="w-full">
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
              className="w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Responsável pela autorização</Label>
            <Select value={autorizadoPorId} onValueChange={(v) => setAutorizadoPorId(v ?? "")}>
              <SelectTrigger className="w-full">
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

          {precisaSenha && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="saida-senha">Senha do responsável</Label>
              <Input id="saida-senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Obrigatória para valores acima de 200,00" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-lg font-normal" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button className="rounded-lg font-normal" onClick={confirmar} disabled={enviando || saldoInsuficiente}>
            {enviando ? "Registrando..." : "Confirmar saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
