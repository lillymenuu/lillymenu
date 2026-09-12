"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { UsuarioFormDialog } from "@/components/settings/usuario-form-dialog";
import type { Usuario, UsuariosListarResposta } from "@/lib/settings";

export function UsuariosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [dados, setDados] = useState<UsuariosListarResposta | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [excluirUsuario, setExcluirUsuario] = useState<Usuario | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [gerandoCodigo, setGerandoCodigo] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/settings/usuarios");
      const data: UsuariosListarResposta = await res.json();
      if (data.ok) setDados(data);
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  function abrirNovo() {
    setEditando(null);
    setFormAberto(true);
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u);
    setFormAberto(true);
  }

  async function excluir() {
    if (!excluirUsuario) return;
    setExcluindo(true);
    try {
      const res = await fetch("/api/settings/usuarios/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: excluirUsuario.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir usuário.");
        return;
      }
      toast.success("Usuário removido.");
      setExcluirUsuario(null);
      carregar();
    } catch {
      toast.error("Erro ao excluir usuário.");
    } finally {
      setExcluindo(false);
    }
  }

  async function gerarCodigo(u: Usuario) {
    setGerandoCodigo(u.id);
    try {
      const res = await fetch("/api/settings/usuarios/gerar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao gerar código.");
        return;
      }
      toast.success(`Novo código de acesso: ${data.codigo_acesso}`);
      carregar();
    } catch {
      toast.error("Erro ao gerar código.");
    } finally {
      setGerandoCodigo(null);
    }
  }

  const niveisDisponiveis = dados ? [...dados.niveis, ...dados.niveis_personalizados.filter((n) => !dados.niveis.some((x) => x.id === n.id))] : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usuários</DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {carregando ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : !dados || dados.usuarios.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</div>
            ) : (
              dados.usuarios.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{u.nome}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {u.rotulo_nivel}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    {u.codigo_acesso ? (
                      <div className="text-xs text-muted-foreground">
                        Código: <span className="font-mono">{u.codigo_acesso}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {dados.sou_admin_principal ? (
                      <Button variant="ghost" size="icon" onClick={() => gerarCodigo(u)} disabled={gerandoCodigo === u.id} title="Gerar novo código de acesso">
                        <KeyRound className="size-4" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(u)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setExcluirUsuario(u)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button className="gap-1.5" onClick={abrirNovo}>
              <Plus className="size-4" /> Novo usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UsuarioFormDialog open={formAberto} onOpenChange={setFormAberto} usuario={editando} niveis={niveisDisponiveis} onSalvo={carregar} />

      <ConfirmDialog
        open={excluirUsuario !== null}
        onOpenChange={(v) => !v && setExcluirUsuario(null)}
        titulo="Excluir usuário"
        descricao={`Tem certeza que deseja excluir "${excluirUsuario?.nome}"?`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}
