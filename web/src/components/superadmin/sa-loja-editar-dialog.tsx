"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saCall, type SaLoja, type SaPlano } from "@/lib/superadmin";

export function SaLojaEditarDialog({
  loja,
  planos,
  onOpenChange,
  onSalvo,
}: {
  loja: SaLoja | null;
  planos: SaPlano[];
  onOpenChange: (v: boolean) => void;
  onSalvo: () => void;
}) {
  return (
    <Dialog open={loja !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-w-xl">
        {loja && <Formulario key={loja.id} loja={loja} planos={planos} onFechar={() => onOpenChange(false)} onSalvo={onSalvo} />}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  loja,
  planos,
  onFechar,
  onSalvo,
}: {
  loja: SaLoja;
  planos: SaPlano[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(loja.nome);
  const [email, setEmail] = useState(loja.admin.email);
  const [usuario, setUsuario] = useState(loja.admin.usuario);
  const [contato, setContato] = useState(loja.contato);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [trialInicio, setTrialInicio] = useState(loja.trial_inicio?.slice(0, 10) ?? "");
  const [trialFim, setTrialFim] = useState(loja.trial_fim?.slice(0, 10) ?? "");
  const [planoId, setPlanoId] = useState(loja.plano_id > 0 ? String(loja.plano_id) : "");
  const [salvando, setSalvando] = useState(false);

  const planosItens: Record<string, string> = Object.fromEntries(planos.map((p) => [String(p.id), p.nome]));

  async function salvar() {
    setSalvando(true);
    try {
      const r = await saCall("superadmin_loja_salvar", {
        loja_id: loja.id,
        admin_id: loja.admin.id,
        nome,
        email,
        usuario,
        contato,
        senha,
        senha2,
        trial_inicio: trialInicio,
        trial_fim: trialFim,
      });
      if (!r.ok) {
        toast.error(r.msg ?? "Erro ao atualizar loja.");
        return;
      }
      if (planoId && Number(planoId) !== loja.plano_id) {
        const p = await saCall("superadmin_loja_acao", { acao: "plano", loja_id: loja.id, plano_id: Number(planoId) });
        if (!p.ok) {
          toast.error(p.msg ?? "Loja salva, mas o plano não foi alterado.");
          onSalvo();
          return;
        }
      }
      toast.success("Loja atualizada");
      onSalvo();
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar loja</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sa-nome">Nome da loja</Label>
          <Input id="sa-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-email">Email do administrador</Label>
          <Input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-usuario">Usuário</Label>
          <Input id="sa-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-contato">WhatsApp / contato</Label>
          <Input id="sa-contato" value={contato} onChange={(e) => setContato(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Plano</Label>
          <Select items={planosItens} value={planoId} onValueChange={(v) => v && setPlanoId(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o plano" />
            </SelectTrigger>
            <SelectContent>
              {planos.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-ti">Início do teste</Label>
          <Input id="sa-ti" type="date" value={trialInicio} onChange={(e) => setTrialInicio(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-tf">Fim do teste</Label>
          <Input id="sa-tf" type="date" value={trialFim} onChange={(e) => setTrialFim(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-s1">Nova senha</Label>
          <Input id="sa-s1" type="password" autoComplete="new-password" placeholder="Deixe em branco para manter" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sa-s2">Confirmar senha</Label>
          <Input id="sa-s2" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
