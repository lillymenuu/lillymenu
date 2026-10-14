"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import type { PosClienteBusca } from "@/lib/pos";

const campoClasse = "h-10 rounded-full border-0 bg-muted/60 px-4 text-sm placeholder:text-xs placeholder:text-muted-foreground/70";
const labelClasse = "text-xs font-normal text-muted-foreground";

export function PosClienteDialog({
  open,
  onOpenChange,
  onSelecionado,
  clienteAtual,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelecionado: (cliente: PosClienteBusca) => void;
  clienteAtual?: PosClienteBusca | null;
}) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PosClienteBusca[] | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setClienteId(clienteAtual?.id ?? null);
    setTelefone(clienteAtual?.telefone ?? "");
    setNome(clienteAtual?.nome ?? "");
    setErro("");
    setResultados(null);
    setMostrarResultados(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function buscar(termo: string) {
    try {
      const res = await fetch(`/api/pos/clientes-busca?q=${encodeURIComponent(termo)}`);
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

  function selecionarResultado(c: PosClienteBusca) {
    setClienteId(c.id);
    setTelefone(c.telefone);
    setNome(c.nome);
    setBusca("");
    setMostrarResultados(false);
    setResultados(null);
  }

  async function confirmar() {
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (clienteId) {
      onOpenChange(false);
      onSelecionado({ id: clienteId, nome, telefone });
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
        onSelecionado({ id: data.id, nome, telefone });
        return;
      }
      if (!data.ok && data.cliente_id) {
        onOpenChange(false);
        onSelecionado({ id: data.cliente_id, nome, telefone });
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
      <DialogContent className="max-w-sm rounded-3xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Dados do cliente</DialogTitle>
          <DialogDescription>Preencha os dados para buscar ou adicionar um cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative space-y-1">
            <Label htmlFor="pos-busca-cliente" className={labelClasse}>
              Busque pelo cliente
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pos-busca-cliente"
                autoComplete="off"
                placeholder="Busque por número ou nome"
                className={cn(campoClasse, "pl-9")}
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                autoFocus
              />
            </div>
            {mostrarResultados && (
              <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                {resultados?.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>}
                {resultados?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarResultado(c)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    {c.nome} <span className="text-muted-foreground">{c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pos-novo-telefone" className={labelClasse}>
              Número de contato
            </Label>
            <Input
              id="pos-novo-telefone"
              placeholder="Ex.: (11) 9 8888-9999"
              className={campoClasse}
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value);
                setClienteId(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pos-novo-nome" className={labelClasse}>
              Nome do cliente
            </Label>
            <Input
              id="pos-novo-nome"
              placeholder="Ex.: João da Silva"
              className={campoClasse}
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setClienteId(null);
              }}
            />
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button className="h-11 w-full rounded-full" onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
