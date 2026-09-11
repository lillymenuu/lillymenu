"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FiadoCliente } from "@/lib/fiado";

type ClienteBusca = Pick<FiadoCliente, "id" | "nome" | "telefone">;

export function SelecionarClienteDialog({
  open,
  onOpenChange,
  onSelecionado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelecionado: (clienteId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ClienteBusca[] | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setTelefone("");
    setNome("");
    setErro("");
    setResultados(null);
    setMostrarResultados(false);
  }, [open]);

  async function buscar(termo: string) {
    try {
      const res = await fetch(`/api/storecredittracking/busca?busca=${encodeURIComponent(termo)}`);
      const data = await res.json();
      setResultados(data.ok ? data.clientes : []);
      setMostrarResultados(true);
    } catch {
      setResultados([]);
      setMostrarResultados(true);
    }
  }

  function handleBuscaChange(v: string) {
    setBusca(v);
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (v.trim() === "") {
      setMostrarResultados(false);
      setResultados(null);
      return;
    }
    buscaTimer.current = setTimeout(() => buscar(v), 300);
  }

  async function adicionarCliente() {
    setErro("");
    if (!telefone.trim() || !nome.trim()) {
      setErro("Informe o número de contato e o nome do cliente.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/clients/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone }),
      });
      const data = await res.json();
      if (data.ok && data.id) {
        onOpenChange(false);
        onSelecionado(data.id);
        return;
      }
      if (!data.ok && data.cliente_id) {
        onOpenChange(false);
        onSelecionado(data.cliente_id);
        return;
      }
      setErro(data.msg ?? "Erro ao adicionar cliente.");
    } catch {
      setErro("Erro ao adicionar cliente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Selecionar cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Preencha os dados para buscar ou adicionar um cliente</p>

        <div className="relative">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fiado-busca-cliente">Busque pelo cliente</Label>
            <div className="relative">
              <Input
                id="fiado-busca-cliente"
                autoComplete="off"
                placeholder="Busque por número ou nome"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
              />
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          {mostrarResultados && (
            <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border bg-popover">
              {resultados?.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>
              )}
              {resultados?.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setMostrarResultados(false);
                    onOpenChange(false);
                    onSelecionado(c.id);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  {c.nome} <span className="text-muted-foreground">{c.telefone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="mb-2 text-sm font-semibold">Você pode também adicionar um novo cliente</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fiado-novo-telefone">
                Número de contato <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fiado-novo-telefone"
                placeholder="Ex.: (11) 9 3232-5454"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fiado-novo-nome">
                Nome do cliente <span className="text-destructive">*</span>
              </Label>
              <Input id="fiado-novo-nome" placeholder="Ex.: Felipe" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button className="rounded-lg font-normal" onClick={adicionarCliente} disabled={salvando}>
            {salvando ? "Adicionando..." : "Adicionar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
