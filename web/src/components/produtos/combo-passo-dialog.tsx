"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";

/** Passo do combo enquanto e montado no formulario (so e gravado ao salvar o combo). */
export type PassoRascunho = {
  chave: string;
  id?: number;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  min: string;
  max: string;
  permiteRepetir: boolean;
  /** preco = preco normal do produto; precoCombo = preco no combo "por opcao" ("" = usa o normal). */
  opcoes: {
    id: number;
    nome: string;
    preco: number;
    imagem?: string | null;
    precoCombo: string;
  }[];
};

export function novaChavePasso(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** "Obrigatorio · escolhe 1 · 2 opcoes" */
export function resumoRegraPasso(p: PassoRascunho): string {
  const min = Number(p.min) || 0;
  const max = Number(p.max) || 1;
  const qtd = `${p.opcoes.length} ${p.opcoes.length === 1 ? "opção" : "opções"}`;
  if (!p.obrigatorio) return `Opcional · até ${max} · ${qtd}`;
  const escolhe = min === max ? `escolhe ${min}` : `escolhe de ${min} a ${max}`;
  return `Obrigatório · ${escolhe} · ${qtd}`;
}

/** Valida as regras do passo; devolve a mensagem de erro ou null. */
export function validarPasso(p: PassoRascunho): string | null {
  if (!p.nome.trim()) return "Informe o nome do passo.";
  if (p.opcoes.length === 0) return "Escolha pelo menos uma opção.";
  const max = parseInt(p.max, 10);
  if (!Number.isFinite(max) || max < 1)
    return "O máximo precisa ser pelo menos 1.";
  if (p.obrigatorio) {
    const min = parseInt(p.min, 10);
    if (!Number.isFinite(min) || min < 1)
      return "Em um passo obrigatório, o mínimo precisa ser pelo menos 1.";
    if (min > max) return "O mínimo não pode ser maior que o máximo.";
  }
  if (!p.permiteRepetir && max > p.opcoes.length) {
    return `Com ${p.opcoes.length} ${p.opcoes.length === 1 ? "opção" : "opções"}, o máximo é ${p.opcoes.length}. Ative "repetir o mesmo item" para permitir mais.`;
  }
  return null;
}

/** "Como chamar este passo?": nome, regra (opcional/obrigatorio), minimo/maximo e as opcoes escolhidas. */
export function ComboPassoDialog({
  open,
  onOpenChange,
  passo,
  onChange,
  novo,
  onAlterarOpcoes,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  passo: PassoRascunho;
  onChange: (p: PassoRascunho) => void;
  novo: boolean;
  onAlterarOpcoes: () => void;
  onConfirmar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof PassoRascunho>(
    campo: K,
    valor: PassoRascunho[K],
  ) {
    setErro(null);
    onChange({ ...passo, [campo]: valor });
  }

  function confirmar() {
    const msg = validarPasso(passo);
    if (msg) {
      setErro(msg);
      return;
    }
    onConfirmar();
  }

  const campo = "h-10 rounded-full border-0 bg-muted/60 px-4";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setErro(null);
        onOpenChange(v);
      }}
    >
      <DialogContent
        overlayForceRender
        className="flex max-h-[90vh] w-[600px] flex-col gap-0 rounded-3xl p-0 sm:max-w-[600px]"
      >
        <DialogHeader className="gap-1 px-6 pt-6 pb-4">
          <DialogTitle className="text-base">
            Como chamar este passo?
          </DialogTitle>
          <DialogDescription>
            {novo
              ? "Sugerimos um nome pelas opções escolhidas. Você pode trocar."
              : "Ajuste o nome, a regra e as opções deste passo."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2">
          <div className="flex flex-col gap-1.5 p-0.5">
            <label htmlFor="passo-nome" className="text-sm font-medium">
              Nome do passo<span className="text-destructive">*</span>
            </label>
            <Input
              id="passo-nome"
              value={passo.nome}
              onChange={(e) => set("nome", e.target.value)}
              maxLength={120}
              className={campo}
            />
            <span className="text-xs text-muted-foreground">
              É o que o cliente lê no cardápio.
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Regra</span>
            <div className="flex w-fit items-center gap-1 rounded-full bg-muted p-1 text-sm">
              {[
                { valor: false, rotulo: "Opcional" },
                { valor: true, rotulo: "Obrigatório" },
              ].map((o) => (
                <button
                  key={o.rotulo}
                  type="button"
                  onClick={() => {
                    setErro(null);
                    onChange({
                      ...passo,
                      obrigatorio: o.valor,
                      min: o.valor
                        ? Number(passo.min) >= 1
                          ? passo.min
                          : "1"
                        : "0",
                    });
                  }}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-medium transition-colors",
                    passo.obrigatorio === o.valor
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {passo.obrigatorio
                ? "O cliente precisa escolher para concluir o combo."
                : "O cliente pode pular este passo."}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 p-0.5">
            {passo.obrigatorio && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="passo-min" className="text-sm font-medium">
                  No mínimo<span className="text-destructive">*</span>
                </label>
                <Input
                  id="passo-min"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={passo.min}
                  onChange={(e) => set("min", e.target.value)}
                  className={campo}
                />
              </div>
            )}
            <div
              className={cn(
                "flex flex-col gap-1.5",
                !passo.obrigatorio && "col-span-2 sm:col-span-1",
              )}
            >
              <label htmlFor="passo-max" className="text-sm font-medium">
                No máximo<span className="text-destructive">*</span>
              </label>
              <Input
                id="passo-max"
                type="number"
                inputMode="numeric"
                min={1}
                value={passo.max}
                onChange={(e) => set("max", e.target.value)}
                className={campo}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3">
            <span>
              <span className="block text-sm font-medium">
                Pode repetir o mesmo item
              </span>
              <span className="block text-xs text-muted-foreground">
                Ex.: escolher 2 unidades do mesmo sabor.
              </span>
            </span>
            <Switch
              checked={passo.permiteRepetir}
              onCheckedChange={(v) => set("permiteRepetir", v === true)}
            />
          </label>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {passo.opcoes.length}{" "}
                {passo.opcoes.length === 1 ? "opção" : "opções"}
              </span>
              <button
                type="button"
                onClick={onAlterarOpcoes}
                className="text-sm font-medium text-primary hover:underline"
              >
                Alterar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {passo.opcoes.map((o) => (
                <span
                  key={o.id}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  {o.nome}
                </span>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-3xl border-t-0 bg-transparent px-6 pt-3 pb-6">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button className="rounded-full px-5" onClick={confirmar}>
            {novo ? "Adicionar passo" : "Salvar passo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
