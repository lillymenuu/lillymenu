"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Categoria } from "@/lib/produtos";

export function CategoriasDialog({
  open,
  onOpenChange,
  categorias,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
}) {
  const router = useRouter();
  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    if (!novoNome.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome.trim(), ativo: true }),
      });
      setNovoNome("");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(id: number) {
    if (!editandoNome.trim()) return;
    setSalvando(true);
    try {
      await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, nome: editandoNome.trim(), ativo: true }),
      });
      setEditandoId(null);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir esta categoria? Os produtos dela ficam sem categoria.")) return;
    await fetch("/api/categorias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            placeholder="Nova categoria..."
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
          />
          <Button size="icon" onClick={criar} disabled={salvando} aria-label="Adicionar">
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {categorias.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma categoria ainda.</p>
          )}
          {categorias.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
              {editandoId === cat.id ? (
                <Input
                  autoFocus
                  value={editandoNome}
                  onChange={(e) => setEditandoNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarEdicao(cat.id)}
                  onBlur={() => salvarEdicao(cat.id)}
                  className="h-7"
                />
              ) : (
                <span className="flex-1 text-sm">{cat.nome}</span>
              )}
              <button
                onClick={() => {
                  setEditandoId(cat.id);
                  setEditandoNome(cat.nome);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Editar"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => excluir(cat.id)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
