"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Loader2, MapPin, Store as StoreIcon, Ticket } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buscarEnderecoPorCep, formatarCep } from "@/lib/cep";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCupomResultado, StorePerfil } from "@/lib/store/types";

type Etapa = "dados" | "entrega" | "pagamento" | "resumo";

const FORMAS_PAGAMENTO: { valor: string; label: string; flag: keyof StorePerfil }[] = [
  { valor: "pix", label: "Pix", flag: "pixAtivo" },
  { valor: "dinheiro", label: "Dinheiro", flag: "dinAtivo" },
  { valor: "credito", label: "Cartao de credito", flag: "credAtivo" },
  { valor: "debito", label: "Cartao de debito", flag: "debAtivo" },
];

export function StoreCheckoutDialog({
  open,
  onOpenChange,
  perfil,
  itens,
  subtotal,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
  itens: StoreCartItem[];
  subtotal: number;
  onSucesso: (codigo: number | string) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"entrega" | "retirada">(perfil.entAtiva ? "entrega" : "retirada");

  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [formaPagamento, setFormaPagamento] = useState("");
  const [trocoPara, setTrocoPara] = useState("");

  const [cupomCodigo, setCupomCodigo] = useState(perfil.cupomPreenchido ?? "");
  const [cupomAplicado, setCupomAplicado] = useState<StoreCupomResultado | null>(null);
  const [cupomErro, setCupomErro] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");

  const taxaEntrega = useMemo(() => {
    if (tipo === "retirada") return 0;
    if (perfil.taxaEntregaGratis) return 0;
    if (perfil.taxaEntregaTipo === "bairro" && bairro.trim()) {
      const chave = Object.keys(perfil.taxasBairro).find(
        (k) => k.toLowerCase() === bairro.trim().toLowerCase()
      );
      if (chave) return perfil.taxasBairro[chave];
    }
    return perfil.taxaEntrega;
  }, [tipo, bairro, perfil]);

  const { desconto, taxaFinal } = useMemo(() => {
    if (!cupomAplicado) return { desconto: 0, taxaFinal: taxaEntrega };
    if (cupomAplicado.tipo === "frete") {
      return { desconto: 0, taxaFinal: Math.max(0, taxaEntrega - cupomAplicado.valor) };
    }
    return { desconto: cupomAplicado.valor, taxaFinal: taxaEntrega };
  }, [cupomAplicado, taxaEntrega]);

  const total = Math.max(0, subtotal - desconto) + taxaFinal;

  const pedidoMinAtivo =
    tipo === "entrega"
      ? perfil.pedidoMinEntregaAtivo
        ? perfil.pedidoMinEntrega
        : 0
      : perfil.pedidoMinRetiradaAtivo
        ? perfil.pedidoMinRetirada
        : 0;
  const abaixoDoMinimo = pedidoMinAtivo > 0 && subtotal < pedidoMinAtivo;

  async function buscarCep() {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    setBuscandoCep(true);
    try {
      const end = await buscarEnderecoPorCep(digitos);
      if (end) {
        setRua(end.rua);
        setBairro(end.bairro);
        setCidade(end.cidade);
        setEstado(end.estado);
      }
    } finally {
      setBuscandoCep(false);
    }
  }

  async function validarCupom() {
    if (!cupomCodigo.trim()) return;
    setValidandoCupom(true);
    setCupomErro("");
    try {
      const res = await fetch("/api/store/cupom-validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loja_id: perfil.loja_id,
          codigo: cupomCodigo.trim(),
          subtotal,
          tipo,
          taxa: taxaEntrega,
          telefone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCupomAplicado(data as StoreCupomResultado);
      } else {
        setCupomAplicado(null);
        setCupomErro(data.msg ?? "Cupom invalido.");
      }
    } catch {
      setCupomErro("Erro ao validar cupom.");
    } finally {
      setValidandoCupom(false);
    }
  }

  function enderecoTexto(): string {
    const partes = [
      rua + (numero ? `, ${numero}` : ""),
      complemento || null,
      bairro,
      cidade + (estado ? `/${estado}` : ""),
      cep ? `CEP ${cep}` : "",
    ].filter(Boolean);
    return partes.join(", ");
  }

  const podeAvancarDados = nome.trim().length >= 2 && telefone.replace(/\D/g, "").length >= 10;
  const podeAvancarEntrega =
    tipo === "retirada" || (rua.trim() && numero.trim() && bairro.trim() && cidade.trim());
  const podeFinalizar = formaPagamento !== "" && !abaixoDoMinimo;

  async function finalizarPedido() {
    if (!podeFinalizar) return;
    setEnviando(true);
    setErroEnvio("");
    try {
      const res = await fetch("/api/store/pedido-criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loja_id: perfil.loja_id,
          cliente_nome: nome.trim(),
          cliente_telefone: telefone.replace(/\D/g, ""),
          tipo,
          forma_pagamento: formaPagamento,
          endereco: tipo === "entrega" ? enderecoTexto() : "",
          subtotal,
          taxa_entrega: taxaFinal,
          total,
          itens: itens.map((i) => ({
            id: i.id,
            nome: i.nome,
            preco: i.precoUnit,
            qtd: i.qtd,
            obs: i.obs,
            combosels: i.combosels,
          })),
          troco_solicitado: formaPagamento === "dinheiro" && trocoPara.trim() !== "",
          troco_valor: formaPagamento === "dinheiro" ? Number(trocoPara.replace(",", ".")) || 0 : 0,
          cupom_codigo: cupomAplicado?.codigo ?? "",
          cupom_desconto: desconto,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        onSucesso(data.codigo);
      } else {
        setErroEnvio(data.msg ?? "Erro ao enviar pedido.");
      }
    } catch {
      setErroEnvio("Erro de conexao. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const etapas: Etapa[] = ["dados", "entrega", "pagamento", "resumo"];
  const idxEtapa = etapas.indexOf(etapa);

  function voltar() {
    if (idxEtapa > 0) setEtapa(etapas[idxEtapa - 1]);
  }

  function avancar() {
    if (idxEtapa < etapas.length - 1) setEtapa(etapas[idxEtapa + 1]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="flex items-center gap-2 border-b p-4">
          {idxEtapa > 0 && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={voltar}>
              <ChevronLeft size={16} />
            </Button>
          )}
          <DialogTitle className="text-base">
            {etapa === "dados" && "Seus dados"}
            {etapa === "entrega" && "Entrega"}
            {etapa === "pagamento" && "Pagamento"}
            {etapa === "resumo" && "Confirmar pedido"}
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {etapa === "dados" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nome</label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">WhatsApp</label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </div>
            </div>
          )}

          {etapa === "entrega" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {perfil.entAtiva && (
                  <button
                    type="button"
                    onClick={() => setTipo("entrega")}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm ${
                      tipo === "entrega" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <MapPin size={18} />
                    Entrega
                  </button>
                )}
                {perfil.retAtiva && (
                  <button
                    type="button"
                    onClick={() => setTipo("retirada")}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm ${
                      tipo === "retirada" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <StoreIcon size={18} />
                    Retirada
                  </button>
                )}
              </div>

              {tipo === "entrega" && (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-sm font-medium text-foreground">CEP</label>
                      <Input
                        value={cep}
                        onChange={(e) => setCep(formatarCep(e.target.value))}
                        onBlur={buscarCep}
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                    </div>
                    {buscandoCep && <Loader2 size={16} className="mb-2 animate-spin text-muted-foreground" />}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Rua / Avenida</label>
                    <Input value={rua} onChange={(e) => setRua(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Numero</label>
                      <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Complemento</label>
                      <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">Bairro</label>
                    <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">Cidade</label>
                      <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">UF</label>
                      <Input value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} />
                    </div>
                  </div>
                  {taxaEntrega > 0 ? (
                    <p className="text-sm text-muted-foreground">Taxa de entrega: {formatarPreco(taxaEntrega)}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Entrega gratis</p>
                  )}
                </div>
              )}

              {abaixoDoMinimo && (
                <p className="text-sm text-destructive">
                  Pedido minimo de {formatarPreco(pedidoMinAtivo)} para {tipo === "entrega" ? "entrega" : "retirada"}.
                </p>
              )}
            </div>
          )}

          {etapa === "pagamento" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                {FORMAS_PAGAMENTO.filter((f) => perfil[f.flag]).map((f) => (
                  <label
                    key={f.valor}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-sm ${
                      formaPagamento === f.valor ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <span>{f.label}</span>
                    <input
                      type="radio"
                      name="pagamento"
                      checked={formaPagamento === f.valor}
                      onChange={() => setFormaPagamento(f.valor)}
                    />
                  </label>
                ))}
              </div>

              {formaPagamento === "dinheiro" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Troco para quanto? (opcional)
                  </label>
                  <Input value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} placeholder="R$ 0,00" />
                </div>
              )}

              {perfil.cuponsAtivo && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Cupom de desconto</label>
                  <div className="flex gap-2">
                    <Input
                      value={cupomCodigo}
                      onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                      placeholder="CODIGO"
                      disabled={!!cupomAplicado}
                    />
                    {cupomAplicado ? (
                      <Button type="button" variant="outline" onClick={() => setCupomAplicado(null)}>
                        Remover
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" onClick={validarCupom} disabled={validandoCupom}>
                        {validandoCupom ? <Loader2 size={14} className="animate-spin" /> : <Ticket size={14} />}
                      </Button>
                    )}
                  </div>
                  {cupomErro && <p className="mt-1 text-xs text-destructive">{cupomErro}</p>}
                  {cupomAplicado && (
                    <p className="mt-1 text-xs text-emerald-600">
                      Cupom aplicado: -{formatarPreco(cupomAplicado.valor)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {etapa === "resumo" && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-sm">
                {itens.map((item) => (
                  <div key={item.key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      {item.qtd}x {item.nome}
                    </span>
                    <span>{formatarPreco(item.precoUnit * item.qtd)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatarPreco(subtotal)}</span>
                </div>
                {taxaFinal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxa de entrega</span>
                    <span>{formatarPreco(taxaFinal)}</span>
                  </div>
                )}
                {desconto > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Desconto</span>
                    <span>-{formatarPreco(desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-foreground">
                  <span>Total</span>
                  <span>{formatarPreco(total)}</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p>{nome}</p>
                <p>{telefone}</p>
                <p className="mt-1">{tipo === "entrega" ? enderecoTexto() : "Retirada no local"}</p>
                <p className="mt-1 capitalize">{formaPagamento}</p>
              </div>
              {erroEnvio && <p className="text-sm text-destructive">{erroEnvio}</p>}
            </div>
          )}
        </div>

        <div className="border-t p-4">
          {etapa !== "resumo" ? (
            <Button
              type="button"
              className="w-full"
              disabled={
                (etapa === "dados" && !podeAvancarDados) ||
                (etapa === "entrega" && (!podeAvancarEntrega || abaixoDoMinimo)) ||
                (etapa === "pagamento" && formaPagamento === "")
              }
              onClick={avancar}
            >
              Continuar
            </Button>
          ) : (
            <Button type="button" className="w-full" disabled={!podeFinalizar || enviando} onClick={finalizarPedido}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : `Confirmar pedido ${formatarPreco(total)}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
