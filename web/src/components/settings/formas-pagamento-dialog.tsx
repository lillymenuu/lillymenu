"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConfiguracoesDetalhe } from "@/lib/settings";
import { BANDEIRAS_PADRAO } from "@/lib/settings";

type Pagamento = ConfiguracoesDetalhe["pagamento"];
type Bandeira = { slug: string; label: string };

function slugificar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function GrupoBandeiras({
  titulo,
  selecionadas,
  onSelecionadasChange,
  custom,
  onCustomChange,
}: {
  titulo: string;
  selecionadas: string[];
  onSelecionadasChange: (v: string[]) => void;
  custom: Bandeira[];
  onCustomChange: (v: Bandeira[]) => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const todas: Record<string, string> = { ...BANDEIRAS_PADRAO };
  custom.forEach((c) => (todas[c.slug] = c.label));

  function alternar(slug: string) {
    onSelecionadasChange(selecionadas.includes(slug) ? selecionadas.filter((s) => s !== slug) : [...selecionadas, slug]);
  }

  function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    const base = slugificar(nome);
    if (!base) return;
    let slug = base;
    let i = 2;
    while (todas[slug]) {
      slug = `${base}-${i}`;
      i += 1;
    }
    onCustomChange([...custom, { slug, label: nome }]);
    onSelecionadasChange([...selecionadas, slug]);
    setNovoNome("");
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">{titulo}</Label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(todas).map(([slug, label]) => (
          <label key={slug} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
            <input type="checkbox" checked={selecionadas.includes(slug)} onChange={() => alternar(slug)} className="size-3.5" />
            {label}
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionar())}
          placeholder="Nome da bandeira"
          className="h-7 text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={adicionar}>
          <Plus className="size-3.5" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

export function FormasPagamentoDialog({
  open,
  onOpenChange,
  pagamento,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pagamento: Pagamento;
  onSalvo: () => void;
}) {
  const [dinheiro, setDinheiro] = useState(pagamento.dinheiro_ativo);
  const [pixAtivo, setPixAtivo] = useState(pagamento.pix.ativo);
  const [pixChave, setPixChave] = useState(pagamento.pix.chave);
  const [pixNome, setPixNome] = useState(pagamento.pix.nome);
  const [creditoAtivo, setCreditoAtivo] = useState(pagamento.credito.ativo);
  const [creditoTaxaAtiva, setCreditoTaxaAtiva] = useState(pagamento.credito.taxa_ativa);
  const [creditoTaxa, setCreditoTaxa] = useState(String(pagamento.credito.taxa || ""));
  const [creditoBandeiras, setCreditoBandeiras] = useState(pagamento.credito.bandeiras);
  const [creditoCustom, setCreditoCustom] = useState(pagamento.credito.bandeiras_custom);
  const [debitoAtivo, setDebitoAtivo] = useState(pagamento.debito.ativo);
  const [debitoTaxaAtiva, setDebitoTaxaAtiva] = useState(pagamento.debito.taxa_ativa);
  const [debitoTaxa, setDebitoTaxa] = useState(String(pagamento.debito.taxa || ""));
  const [debitoBandeiras, setDebitoBandeiras] = useState(pagamento.debito.bandeiras);
  const [debitoCustom, setDebitoCustom] = useState(pagamento.debito.bandeiras_custom);
  const [voucher, setVoucher] = useState(pagamento.voucher_ativo);
  const [fiado, setFiado] = useState(pagamento.fiado_ativo);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDinheiro(pagamento.dinheiro_ativo);
    setPixAtivo(pagamento.pix.ativo);
    setPixChave(pagamento.pix.chave);
    setPixNome(pagamento.pix.nome);
    setCreditoAtivo(pagamento.credito.ativo);
    setCreditoTaxaAtiva(pagamento.credito.taxa_ativa);
    setCreditoTaxa(String(pagamento.credito.taxa || ""));
    setCreditoBandeiras(pagamento.credito.bandeiras);
    setCreditoCustom(pagamento.credito.bandeiras_custom);
    setDebitoAtivo(pagamento.debito.ativo);
    setDebitoTaxaAtiva(pagamento.debito.taxa_ativa);
    setDebitoTaxa(String(pagamento.debito.taxa || ""));
    setDebitoBandeiras(pagamento.debito.bandeiras);
    setDebitoCustom(pagamento.debito.bandeiras_custom);
    setVoucher(pagamento.voucher_ativo);
    setFiado(pagamento.fiado_ativo);
  }, [open, pagamento]);

  async function salvar() {
    if (pixAtivo && (!pixChave.trim() || !pixNome.trim())) {
      toast.error("Preencha os dados do Pix.");
      return;
    }
    if (creditoAtivo && creditoBandeiras.length === 0) {
      toast.error("Selecione ao menos uma bandeira de crédito.");
      return;
    }
    if (debitoAtivo && debitoBandeiras.length === 0) {
      toast.error("Selecione ao menos uma bandeira de débito.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagamento_dinheiro_ativo: dinheiro ? "1" : "0",
          pagamento_pix_ativo: pixAtivo ? "1" : "0",
          pagamento_pix_chave: pixChave,
          pagamento_pix_nome: pixNome,
          pagamento_credito_ativo: creditoAtivo ? "1" : "0",
          pagamento_credito_taxa_ativa: creditoTaxaAtiva ? "1" : "0",
          pagamento_credito_taxa: creditoTaxa || "0",
          pagamento_credito_bandeiras: creditoBandeiras.join(","),
          pagamento_credito_bandeiras_custom: JSON.stringify(creditoCustom),
          pagamento_debito_ativo: debitoAtivo ? "1" : "0",
          pagamento_debito_taxa_ativa: debitoTaxaAtiva ? "1" : "0",
          pagamento_debito_taxa: debitoTaxa || "0",
          pagamento_debito_bandeiras: debitoBandeiras.join(","),
          pagamento_debito_bandeiras_custom: JSON.stringify(debitoCustom),
          pagamento_voucher_ativo: voucher ? "1" : "0",
          pagamento_fiado_ativo: fiado ? "1" : "0",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Formas de pagamento salvas.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Formas de pagamento</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Dinheiro</div>
            <Switch checked={dinheiro} onCheckedChange={setDinheiro} />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Pix</div>
              <Switch checked={pixAtivo} onCheckedChange={setPixAtivo} />
            </div>
            {pixAtivo ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Chave Pix</Label>
                  <Input value={pixChave} onChange={(e) => setPixChave(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome do titular</Label>
                  <Input value={pixNome} onChange={(e) => setPixNome(e.target.value)} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Cartão de crédito</div>
              <Switch checked={creditoAtivo} onCheckedChange={setCreditoAtivo} />
            </div>
            {creditoAtivo ? (
              <>
                <GrupoBandeiras
                  titulo="Bandeiras aceitas"
                  selecionadas={creditoBandeiras}
                  onSelecionadasChange={setCreditoBandeiras}
                  custom={creditoCustom}
                  onCustomChange={setCreditoCustom}
                />
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs">Cobrar taxa do cliente</Label>
                  <Switch checked={creditoTaxaAtiva} onCheckedChange={setCreditoTaxaAtiva} />
                </div>
                {creditoTaxaAtiva ? (
                  <Input type="number" step="0.01" min="0" max="100" value={creditoTaxa} onChange={(e) => setCreditoTaxa(e.target.value)} placeholder="Taxa (%)" />
                ) : null}
              </>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Cartão de débito</div>
              <Switch checked={debitoAtivo} onCheckedChange={setDebitoAtivo} />
            </div>
            {debitoAtivo ? (
              <>
                <GrupoBandeiras
                  titulo="Bandeiras aceitas"
                  selecionadas={debitoBandeiras}
                  onSelecionadasChange={setDebitoBandeiras}
                  custom={debitoCustom}
                  onCustomChange={setDebitoCustom}
                />
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs">Cobrar taxa do cliente</Label>
                  <Switch checked={debitoTaxaAtiva} onCheckedChange={setDebitoTaxaAtiva} />
                </div>
                {debitoTaxaAtiva ? (
                  <Input type="number" step="0.01" min="0" max="100" value={debitoTaxa} onChange={(e) => setDebitoTaxa(e.target.value)} placeholder="Taxa (%)" />
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Voucher / vale-refeição</div>
            <Switch checked={voucher} onCheckedChange={setVoucher} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm font-medium">Fiado</div>
            <Switch checked={fiado} onCheckedChange={setFiado} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
