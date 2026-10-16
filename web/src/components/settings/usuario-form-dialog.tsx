"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NivelPermissao, Usuario } from "@/lib/settings";

export function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
  niveis,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  usuario: Usuario | null;
  niveis: NivelPermissao[];
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [permissaoId, setPermissaoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const niveisItems: Record<string, string> = {};
  for (const n of niveis) niveisItems[String(n.id)] = n.nome;

  useEffect(() => {
    if (!open) return;
    setNome(usuario?.nome ?? "");
    setEmail(usuario?.email ?? "");
    setPermissaoId(usuario?.permissao_id ? String(usuario.permissao_id) : "");
  }, [open, usuario]);

  async function salvar() {
    if (!nome.trim() || !email.trim() || !permissaoId) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/usuarios/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: usuario?.id ?? 0, nome, email, permissao_id: Number(permissaoId) }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar usuário.");
        return;
      }
      toast.success(data.codigo_acesso ? `Usuário criado. Código de acesso: ${data.codigo_acesso}` : "Usuário salvo.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar usuário.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nível de permissão</Label>
            <Select items={niveisItems} value={permissaoId} onValueChange={(v) => v && setPermissaoId(v as string)}>
              <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {niveis.map((n) => (
                  <SelectItem key={n.id} value={String(n.id)}>
                    {n.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-full" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
