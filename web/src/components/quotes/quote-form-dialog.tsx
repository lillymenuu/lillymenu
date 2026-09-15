"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Minus, X, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import type { OrcamentoDescontoTipo, OrcamentoDetalheResposta, OrcamentoProduto, OrcamentoProdutosResposta } from "@/lib/orcamentos";
import type { PosCepLookupResposta } from "@/lib/pos";

type LinhaItem = {
  uid: string;
  produtoId: number | null;
  nome: string;
  preco: number;
  qtd: number;
  observacoes: string | null;
};

function formatarMoeda(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuoteFormDialog({
  open,
  onOpenChange,
  orcamentoId,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orcamentoId: number | null;
  onSalvo: () => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [produtos, setProdutos] = useState<OrcamentoProduto[]>([]);
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<LinhaItem[]>([]);

  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoPreco, setAvulsoPreco] = useState("");
  const [avulsoObs, setAvulsoObs] = useState("");

  const [clienteNome, setClienteNome] = useState("");
  const [clienteTipoDocumento, setClienteTipoDocumento] = useState<"fisica" | "juridica">("fisica");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [clienteWhatsapp, setClienteWhatsapp] = useState("");
  const [clienteEndereco, setClienteEndereco] = useState("");
  const [cep, setCep] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [descontoTipo, setDescontoTipo] = useState<OrcamentoDescontoTipo>("valor");
  const [descontoValor, setDescontoValor] = useState("0");

  useEffect(() => {
    if (!open) return;

    setCarregando(true);
    fetch("/api/quotes/produtos")
      .then((r) => r.json())
      .then((data: OrcamentoProdutosResposta | { ok: false; msg?: string }) => {
        if (data.ok) setProdutos(data.produtos);
      })
      .catch(() => toast.error("Erro ao carregar produtos."));

    if (orcamentoId) {
      fetch(`/api/quotes/${orcamentoId}`)
        .then((r) => r.json())
        .then((data: OrcamentoDetalheResposta | { ok: false; msg?: string }) => {
          if (!data.ok) {
            toast.error(data.msg ?? "Erro ao carregar orçamento.");
            return;
          }
          setClienteNome(data.orcamento.cliente_nome);
          setClienteTipoDocumento(data.orcamento.cliente_tipo_documento);
          setClienteDocumento(data.orcamento.cliente_documento ?? "");
          setClienteWhatsapp(data.orcamento.cliente_whatsapp ?? "");
          setClienteEndereco(data.orcamento.cliente_endereco ?? "");
          setDescontoTipo(data.orcamento.desconto_tipo);
          setDescontoValor(String(data.orcamento.desconto_valor));
          setItens(
            data.itens.map((i) => ({
              uid: `item-${i.id}`,
              produtoId: i.produto_id,
              nome: i.nome,
              preco: i.preco,
              qtd: i.qtd,
              observacoes: i.observacoes,
            }))
          );
        })
        .catch(() => toast.error("Erro ao carregar orçamento."))
        .finally(() => setCarregando(false));
    } else {
      setClienteNome("");
      setClienteTipoDocumento("fisica");
      setClienteDocumento("");
      setClienteWhatsapp("");
      setClienteEndereco("");
      setCep("");
      setDescontoTipo("valor");
      setDescontoValor("0");
      setItens([]);
      setBusca("");
      setCarregando(false);
    }
  }, [open, orcamentoId]);

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = termo ? produtos.filter((p) => p.nome.toLowerCase().includes(termo)) : produtos;

  function qtdDoProduto(produtoId: number): number {
    return itens.find((i) => i.produtoId === produtoId)?.qtd ?? 0;
  }

  function alterarQtdProduto(p: OrcamentoProduto, delta: number) {
    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === p.id);
      if (!existente) {
        return delta > 0 ? [...prev, { uid: `produto-${p.id}`, produtoId: p.id, nome: p.nome, preco: p.preco, qtd: 1, observacoes: null }] : prev;
      }
      const novaQtd = existente.qtd + delta;
      if (novaQtd <= 0) return prev.filter((i) => i.uid !== existente.uid);
      return prev.map((i) => (i.uid === existente.uid ? { ...i, qtd: novaQtd } : i));
    });
  }

  function adicionarAvulso() {
    const nome = avulsoNome.trim();
    const preco = Number(avulsoPreco || 0);
    if (!nome || preco <= 0) {
      toast.error("Informe nome e preço do item avulso.");
      return;
    }
    setItens((prev) => [
      ...prev,
      { uid: `avulso-${Date.now()}`, produtoId: null, nome, preco, qtd: 1, observacoes: avulsoObs.trim() || null },
    ]);
    setAvulsoNome("");
    setAvulsoPreco("");
    setAvulsoObs("");
    setAvulsoAberto(false);
  }

  function removerLinha(uid: string) {
    setItens((prev) => prev.filter((i) => i.uid !== uid));
  }

  async function buscarCep() {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      toast.error("CEP inválido.");
      return;
    }
    setBuscandoCep(true);
    try {
      const res = await fetch(`/api/pos/cep-lookup?cep=${cepLimpo}`);
      const data: PosCepLookupResposta = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "CEP não encontrado.");
        return;
      }
      setClienteEndereco(`${data.logradouro}, Bairro ${data.bairro}, ${data.cidade}/${data.estado}`);
    } catch {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setBuscandoCep(false);
    }
  }

  const subtotal = itens.reduce((s, i) => s + i.preco * i.qtd, 0);
  const descontoAplicado = descontoTipo === "percent" ? (subtotal * Number(descontoValor || 0)) / 100 : Number(descontoValor || 0);
  const total = Math.max(0, subtotal - descontoAplicado);

  async function salvar() {
    if (!clienteNome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/quotes/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orcamentoId ?? 0,
          cliente_nome: clienteNome.trim(),
          cliente_tipo_documento: clienteTipoDocumento,
          cliente_documento: clienteDocumento.trim(),
          cliente_whatsapp: clienteWhatsapp.trim(),
          cliente_endereco: clienteEndereco.trim(),
          desconto_tipo: descontoTipo,
          desconto_valor: Number(descontoValor || 0),
          itens: itens.map((i) => ({
            produto_id: i.produtoId,
            nome: i.nome,
            preco: i.preco,
            qtd: i.qtd,
            observacoes: i.observacoes,
          })),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar orçamento.");
        return;
      }
      toast.success(orcamentoId ? "Orçamento atualizado." : "Orçamento salvo.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[960px] max-w-[calc(100%-2rem)] flex-col sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{orcamentoId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto" className="pl-9" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAvulsoAberto(true)}>
                <Plus className="size-3.5" /> Item avulso
              </Button>
            </div>

            {avulsoAberto ? (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={avulsoNome} onChange={(e) => setAvulsoNome(e.target.value)} placeholder="Nome do item" />
                  <MoneyInput value={avulsoPreco} onChange={setAvulsoPreco} />
                </div>
                <Input value={avulsoObs} onChange={(e) => setAvulsoObs(e.target.value)} placeholder="Observações (opcional)" />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAvulsoAberto(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" onClick={adicionarAvulso}>
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {carregando ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
              ) : (
                produtosFiltrados.map((p) => {
                  const qtd = qtdDoProduto(p.id);
                  return (
                    <div key={p.id} className="space-y-1.5 rounded-lg border p-2.5">
                      <div className="line-clamp-2 text-xs font-medium">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">{formatarMoeda(p.preco)}</div>
                      {qtd === 0 ? (
                        <Button type="button" variant="outline" size="sm" className="h-7 w-full text-xs" onClick={() => alterarQtdProduto(p, 1)}>
                          Adicionar
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between rounded-md border">
                          <button type="button" className="flex h-7 w-7 items-center justify-center" onClick={() => alterarQtdProduto(p, -1)}>
                            <Minus className="size-3" />
                          </button>
                          <span className="text-xs font-medium">{qtd}</span>
                          <button type="button" className="flex h-7 w-7 items-center justify-center" onClick={() => alterarQtdProduto(p, 1)}>
                            <Plus className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs">Nome do cliente</Label>
              <Input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Nome completo" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de cadastro</Label>
                <Select value={clienteTipoDocumento} onValueChange={(v) => v && setClienteTipoDocumento(v as "fisica" | "juridica")}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue>{() => (clienteTipoDocumento === "fisica" ? "Pessoa física" : "Pessoa jurídica")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Pessoa física</SelectItem>
                    <SelectItem value="juridica">Pessoa jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{clienteTipoDocumento === "fisica" ? "CPF" : "CNPJ"}</Label>
                <Input value={clienteDocumento} onChange={(e) => setClienteDocumento(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">WhatsApp</Label>
              <Input value={clienteWhatsapp} onChange={(e) => setClienteWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Endereço</Label>
              <div className="flex gap-1.5">
                <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" className="w-28" />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={buscarCep} disabled={buscandoCep} title="Buscar CEP">
                  <MapPin className="size-3.5" />
                </Button>
              </div>
              <Input value={clienteEndereco} onChange={(e) => setClienteEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </div>

            <div className="mt-auto space-y-2 rounded-lg border p-3">
              <div className="text-xs font-semibold text-muted-foreground">Itens</div>
              {itens.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>
              ) : (
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {itens.map((i) => (
                    <div key={i.uid} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate">{i.qtd}x {i.nome}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span>{formatarMoeda(i.preco * i.qtd)}</span>
                        <button type="button" onClick={() => removerLinha(i.uid)} className="text-muted-foreground hover:text-destructive">
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 border-t pt-2">
                <Select value={descontoTipo} onValueChange={(v) => v && setDescontoTipo(v as OrcamentoDescontoTipo)}>
                  <SelectTrigger className="w-28 text-xs">
                    <SelectValue>{() => (descontoTipo === "percent" ? "% Desc." : "R$ Desc.")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valor">Valor (R$)</SelectItem>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="flex-1" />
              </div>

              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{formatarMoeda(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
