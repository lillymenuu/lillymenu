"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRL } from "@/components/ordermanager/constants";
import type { PosCepLookupResposta, PosClienteBusca } from "@/lib/pos";
import type { PosEndereco } from "@/components/pos/pos-tipo-pedido";

const ENDERECO_VAZIO: PosEndereco = { rua: "", numero: "", bairro: "", cidade: "", cep: "", complemento: "" };

export function PosEntregaDialog({
  open,
  onOpenChange,
  cliente,
  endereco,
  taxaEntregaAtual,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: PosClienteBusca | null;
  endereco: PosEndereco;
  taxaEntregaAtual: number;
  onConfirmar: (dados: { cliente: PosClienteBusca; endereco: PosEndereco; taxaEntrega: number; taxaEditada: boolean }) => void;
}) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PosClienteBusca[] | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [rascunho, setRascunho] = useState<PosEndereco>(ENDERECO_VAZIO);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const cepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [taxaCalculada, setTaxaCalculada] = useState(0);
  const [editarTaxa, setEditarTaxa] = useState(false);
  const [taxaManual, setTaxaManual] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusca("");
    setResultados(null);
    setMostrarResultados(false);
    setClienteId(cliente?.id ?? null);
    setTelefone(cliente?.telefone ?? "");
    setNome(cliente?.nome ?? "");
    setRascunho(endereco.rua ? endereco : ENDERECO_VAZIO);
    setTaxaCalculada(taxaEntregaAtual);
    setEditarTaxa(false);
    setTaxaManual(taxaEntregaAtual ? String(taxaEntregaAtual) : "");
    setErro("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function buscarClientes(termo: string) {
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
    buscaTimer.current = setTimeout(() => buscarClientes(v), 300);
  }

  function selecionarCliente(c: PosClienteBusca) {
    setClienteId(c.id);
    setTelefone(c.telefone);
    setNome(c.nome);
    setBusca("");
    setMostrarResultados(false);
    setResultados(null);
  }

  function handleCepChange(v: string) {
    setRascunho((r) => ({ ...r, cep: v }));
    if (cepTimer.current) clearTimeout(cepTimer.current);
    const digitos = v.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    cepTimer.current = setTimeout(async () => {
      setBuscandoCep(true);
      try {
        const res = await fetch(`/api/pos/cep-lookup?cep=${digitos}`);
        const data: PosCepLookupResposta = await res.json();
        if (data.ok) {
          setRascunho((r) => ({
            ...r,
            rua: data.logradouro || r.rua,
            bairro: data.bairro || r.bairro,
            cidade: data.cidade || r.cidade,
          }));
          if (!editarTaxa) {
            setTaxaCalculada(data.taxa_entrega);
            setTaxaManual(String(data.taxa_entrega));
          }
        } else {
          toast.error(data.msg ?? "Não foi possível localizar o CEP.");
        }
      } catch {
        toast.error("Não foi possível localizar o CEP.");
      } finally {
        setBuscandoCep(false);
      }
    }, 400);
  }

  const taxaExibida = editarTaxa ? Number(taxaManual || 0) : taxaCalculada;

  async function confirmar() {
    setErro("");
    if (!telefone.trim() || !nome.trim()) {
      setErro("Informe o telefone e o nome do cliente.");
      return;
    }
    if (!rascunho.rua.trim()) {
      setErro("Informe a rua/avenida.");
      return;
    }
    setSalvando(true);
    try {
      let idFinal = clienteId;
      if (!idFinal) {
        const res = await fetch("/api/clients/criar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, telefone }),
        });
        const data = await res.json();
        if (data.ok && data.id) idFinal = data.id;
        else if (!data.ok && data.cliente_id) idFinal = data.cliente_id;
        else {
          setErro(data.msg ?? "Erro ao salvar cliente.");
          setSalvando(false);
          return;
        }
      }
      if (!idFinal) {
        setErro("Erro ao salvar cliente.");
        setSalvando(false);
        return;
      }
      onConfirmar({
        cliente: { id: idFinal, nome, telefone },
        endereco: rascunho,
        taxaEntrega: taxaExibida,
        taxaEditada: editarTaxa,
      });
      onOpenChange(false);
    } catch {
      setErro("Erro ao salvar dados de entrega.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Preencha os dados de entrega do pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative space-y-1">
            <Label className="text-xs">Busque pelo cliente</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoComplete="off"
                placeholder="Pesquise por número ou nome"
                className="pl-8"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
              />
            </div>
            {mostrarResultados && (
              <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                {resultados?.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado.</div>}
                {resultados?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    {c.nome} <span className="text-muted-foreground">{c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Número de contato</Label>
            <Input
              placeholder="Ex.: (11) 9 8888-9999"
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value);
                setClienteId(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome do cliente</Label>
            <Input
              placeholder="Ex.: João da Silva"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setClienteId(null);
              }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">CEP</Label>
            <Input placeholder="Ex.: 00000-000" value={rascunho.cep} onChange={(e) => handleCepChange(e.target.value)} />
            {buscandoCep ? <p className="text-[11px] text-muted-foreground">Buscando endereço...</p> : null}
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Rua/Avenida</Label>
              <Input placeholder="Ex.: Rua Oscar Freire" value={rascunho.rua} onChange={(e) => setRascunho({ ...rascunho, rua: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número</Label>
              <Input placeholder="Ex.: 44" value={rascunho.numero} onChange={(e) => setRascunho({ ...rascunho, numero: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Bairro</Label>
            <Input placeholder="Ex.: Bairro Jardim" value={rascunho.bairro} onChange={(e) => setRascunho({ ...rascunho, bairro: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cidade</Label>
            <Input placeholder="Ex.: Santo André" value={rascunho.cidade} onChange={(e) => setRascunho({ ...rascunho, cidade: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Complemento</Label>
            <Input
              placeholder="ex.: próximo ao posto de gasolina"
              value={rascunho.complemento}
              onChange={(e) => setRascunho({ ...rascunho, complemento: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <div className="text-xs text-muted-foreground">Taxa de entrega</div>
              {editarTaxa ? (
                <MoneyInput value={taxaManual} onChange={setTaxaManual} className="mt-1 h-8 w-28 text-sm" />
              ) : (
                <div className="text-lg font-semibold">{formatBRL(taxaCalculada)}</div>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Editar taxa de entrega
              <Switch checked={editarTaxa} onCheckedChange={setEditarTaxa} />
            </label>
          </div>

          {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
        </div>

        <DialogFooter>
          <Button className="h-11 w-full" onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
