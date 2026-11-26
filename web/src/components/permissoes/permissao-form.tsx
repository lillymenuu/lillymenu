"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GRUPOS_PERMISSOES, type NivelAcesso } from "@/lib/permissoes";

/** Criar/editar nivel de acesso. Niveis padrao do sistema abrem so para leitura. */
export function PermissaoForm({ nivel }: { nivel: NivelAcesso | null }) {
  const router = useRouter();
  const somenteLeitura = Boolean(nivel?.padrao);
  const [nome, setNome] = useState(nivel?.nome ?? "");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set(nivel?.permissoes ?? []));
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  function alternar(chaves: string[], marcar: boolean) {
    setMarcadas((atual) => {
      const novo = new Set(atual);
      for (const c of chaves) {
        if (marcar) novo.add(c);
        else novo.delete(c);
      }
      return novo;
    });
  }

  async function enviar(url: string, body: object): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível concluir.");
        return false;
      }
      return true;
    } catch {
      toast.error("Não foi possível concluir.");
      return false;
    }
  }

  async function salvar() {
    if (nome.trim().length < 2) return void toast.error("Informe o nome do nível de acesso.");
    if (marcadas.size === 0) return void toast.error("Selecione pelo menos uma permissão.");
    setSalvando(true);
    const ok = await enviar("/api/settings/permissoes/salvar", { id: nivel?.id ?? 0, nome, permissoes: [...marcadas] });
    setSalvando(false);
    if (!ok) return;
    toast.success(nivel ? "Nível de acesso atualizado" : "Nível de acesso criado");
    router.push("/settings/permissions");
    router.refresh();
  }

  async function excluir() {
    if (!nivel) return;
    setExcluindo(true);
    const ok = await enviar("/api/settings/permissoes/excluir", { id: nivel.id });
    setExcluindo(false);
    setConfirmarExclusao(false);
    if (!ok) return;
    toast.success("Nível de acesso excluído");
    router.push("/settings/permissions");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 sm:p-6 min-[1800px]:max-w-none">
      <div>
        <Link href="/settings/permissions" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={13} /> Permissões
        </Link>
        <h1 className="text-xl font-semibold">Nível de acesso</h1>
      </div>

      {somenteLeitura && (
        <div className="flex max-w-lg gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <div className="font-medium">Atenção</div>
            <p className="mt-0.5 text-muted-foreground">
              Permissões padrão do sistema não podem ser editadas. Caso precise de algo diferente, você pode criar uma permissão personalizada.
            </p>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          Nome do nível de acesso <span className="text-red-500">*</span>
        </span>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Caixa, Atendente, Gerente"
          maxLength={60}
          disabled={somenteLeitura}
          className="h-11 rounded-full px-4"
        />
      </label>

      {GRUPOS_PERMISSOES.map((grupo) => {
        const chaves = grupo.opcoes.map((o) => o.chave);
        const todas = chaves.every((c) => marcadas.has(c));
        return (
          <section key={grupo.titulo} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{grupo.titulo}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{grupo.descricao}</p>
              </div>
              {!somenteLeitura && (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={todas} onCheckedChange={(v) => alternar(chaves, v === true)} />
                  Selecionar todos
                </label>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {grupo.opcoes.map((op) => (
                <label key={op.chave} className={`flex items-center gap-2 text-sm ${somenteLeitura ? "" : "cursor-pointer"}`}>
                  <Checkbox checked={marcadas.has(op.chave)} disabled={somenteLeitura} onCheckedChange={(v) => alternar([op.chave], v === true)} />
                  {op.rotulo}
                </label>
              ))}
            </div>
          </section>
        );
      })}

      {/* Acoes: grudam no rodape da tela enquanto rola */}
      {!somenteLeitura && (
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <span className="text-xs text-muted-foreground">
            {marcadas.size} {marcadas.size === 1 ? "permissão selecionada" : "permissões selecionadas"}
          </span>
          <div className="flex items-center gap-2">
            {nivel && (
              <Button variant="outline" className="rounded-full text-red-600 hover:text-red-700" onClick={() => setConfirmarExclusao(true)}>
                <Trash2 size={15} /> Excluir
              </Button>
            )}
            <Button variant="outline" className="rounded-full" onClick={() => router.push("/settings/permissions")}>
              Cancelar
            </Button>
            <Button className="rounded-full px-6" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmarExclusao} onOpenChange={(v) => !excluindo && setConfirmarExclusao(v)}>
        <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir nível de acesso?</DialogTitle>
            <DialogDescription>
              O nível <strong className="font-medium text-foreground">{nivel?.nome}</strong> será excluído. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t-0 bg-transparent">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmarExclusao(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={excluir} disabled={excluindo}>
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
