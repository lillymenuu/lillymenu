"use client";

import { useMemo, useState } from "react";
import { CreditCard, Loader2, MapPin, QrCode, Store as StoreIcon, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckoutStepper } from "@/components/store/checkout-stepper";
import { useStoreTheme } from "@/components/store/store-theme";
import { buscarEnderecoPorCep, formatarCep } from "@/lib/cep";
import { formatarPreco } from "@/lib/store/format";
import type { StoreCartItem, StoreCupomResultado, StorePerfil } from "@/lib/store/types";

type Etapa = "dados" | "entrega" | "pagamento" | "resumo";
const ETAPAS: Etapa[] = ["dados", "entrega", "pagamento", "resumo"];

const FORMAS_PAGAMENTO: { valor: string; label: string; sub: string; icon: typeof QrCode; flag: keyof StorePerfil }[] = [
  { valor: "pix", label: "Pix", sub: "A chave sera exibida apos a confirmacao do pedido.", icon: QrCode, flag: "pixAtivo" },
  { valor: "dinheiro", label: "Dinheiro", sub: "Pagamento na entrega/retirada", icon: Wallet, flag: "dinAtivo" },
  { valor: "credito", label: "Cartao de credito", sub: "Bandeiras aceitas na entrega", icon: CreditCard, flag: "credAtivo" },
  { valor: "debito", label: "Cartao de debito", sub: "Bandeiras aceitas na entrega", icon: CreditCard, flag: "debAtivo" },
];

function fieldClass() {
  return "w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-3 text-[.86rem] text-neutral-900 outline-none transition-colors focus:bg-white";
}

export function StoreCheckoutDialog({
  open,
  onOpenChange,
  perfil,
  itens,
  subtotal,
  onSucesso,
  onVoltarCarrinho,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
  itens: StoreCartItem[];
  subtotal: number;
  onSucesso: (codigo: number | string) => void;
  onVoltarCarrinho?: () => void;
}) {
  const { brown } = useStoreTheme();
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"entrega" | "retirada">(perfil.entAtiva ? "entrega" : "retirada");

  const [enderecoModalAberto, setEnderecoModalAberto] = useState(false);
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [enderecoConfirmado, setEnderecoConfirmado] = useState(false);
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
      const chave = Object.keys(perfil.taxasBairro).find((k) => k.toLowerCase() === bairro.trim().toLowerCase());
      if (chave) return perfil.taxasBairro[chave];
    }
    return perfil.taxaEntrega;
  }, [tipo, bairro, perfil]);

  const { desconto, taxaFinal } = useMemo(() => {
    if (!cupomAplicado) return { desconto: 0, taxaFinal: taxaEntrega };
    if (cupomAplicado.tipo === "frete") return { desconto: 0, taxaFinal: Math.max(0, taxaEntrega - cupomAplicado.valor) };
    return { desconto: cupomAplicado.valor, taxaFinal: taxaEntrega };
  }, [cupomAplicado, taxaEntrega]);

  const total = Math.max(0, subtotal - desconto) + taxaFinal;
  const cashbackEstimado = perfil.cashbackAtivo && perfil.cashbackPct > 0 ? (total * perfil.cashbackPct) / 100 : 0;

  const pedidoMinAtivo =
    tipo === "entrega" ? (perfil.pedidoMinEntregaAtivo ? perfil.pedidoMinEntrega : 0) : perfil.pedidoMinRetiradaAtivo ? perfil.pedidoMinRetirada : 0;
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

  function confirmarEndereco() {
    if (!rua.trim() || !numero.trim()) return;
    setEnderecoConfirmado(true);
    setEnderecoModalAberto(false);
  }

  async function validarCupom() {
    if (!cupomCodigo.trim()) return;
    setValidandoCupom(true);
    setCupomErro("");
    try {
      const res = await fetch("/api/store/cupom-validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loja_id: perfil.loja_id, codigo: cupomCodigo.trim(), subtotal, tipo, taxa: taxaEntrega, telefone }),
      });
      const data = await res.json();
      if (data.ok) setCupomAplicado(data as StoreCupomResultado);
      else {
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
    const partes = [rua + (numero ? `, ${numero}` : ""), complemento || null, bairro, cidade + (estado ? `/${estado}` : ""), cep ? `CEP ${cep}` : ""].filter(Boolean);
    return partes.join(", ");
  }

  const podeAvancarDados = nome.trim().length >= 2 && telefone.replace(/\D/g, "").length >= 10;
  const podeAvancarEntrega = tipo === "retirada" || enderecoConfirmado;

  async function finalizarPedido() {
    if (formaPagamento === "" || abaixoDoMinimo) return;
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
          itens: itens.map((i) => ({ id: i.id, nome: i.nome, preco: i.precoUnit, qtd: i.qtd, obs: i.obs, combosels: i.combosels })),
          troco_solicitado: formaPagamento === "dinheiro" && trocoPara.trim() !== "",
          troco_valor: formaPagamento === "dinheiro" ? Number(trocoPara.replace(",", ".")) || 0 : 0,
          cupom_codigo: cupomAplicado?.codigo ?? "",
          cupom_desconto: desconto,
        }),
      });
      const data = await res.json();
      if (data.ok) onSucesso(data.codigo);
      else setErroEnvio(data.msg ?? "Erro ao enviar pedido.");
    } catch {
      setErroEnvio("Erro de conexao. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const idxEtapa = ETAPAS.indexOf(etapa);
  function voltar() {
    if (idxEtapa > 0) setEtapa(ETAPAS[idxEtapa - 1]);
    else onVoltarCarrinho?.();
  }
  function avancar() {
    if (idxEtapa < ETAPAS.length - 1) setEtapa(ETAPAS[idxEtapa + 1]);
  }

  const avancarDesabilitado =
    (etapa === "dados" && !podeAvancarDados) ||
    (etapa === "entrega" && (!podeAvancarEntrega || abaixoDoMinimo)) ||
    (etapa === "pagamento" && formaPagamento === "");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-1/2 h-dvh w-full max-w-[901px] translate-y-0 -translate-x-1/2 gap-0 rounded-none bg-white p-0 sm:max-w-[901px]"
        >
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center border-b border-neutral-100">
              <button type="button" onClick={voltar} className="flex w-10 items-center justify-center self-stretch text-[color:var(--store-link)]" style={{ color: brown }}>
                ‹
              </button>
              <div className="flex-1">
                <CheckoutStepper etapas={ETAPAS} atual={etapa} />
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mr-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
              >
                ×
              </button>
            </div>

            <DialogTitle className="sr-only">Finalizar pedido</DialogTitle>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              {etapa === "dados" && (
                <div className="mx-auto max-w-xs space-y-3 pt-6">
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome *" className={`${fieldClass()} text-center`} />
                  <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone *" inputMode="tel" className={`${fieldClass()} text-center`} />
                </div>
              )}

              {etapa === "entrega" && (
                <div>
                  <p className="mb-3 text-[.84rem] text-neutral-500">Escolha o tipo de entrega</p>
                  <div className="space-y-2.5">
                    {perfil.entAtiva && (
                      <TipoCard
                        ativo={tipo === "entrega"}
                        brown={brown}
                        titulo="Entrega"
                        sub={`Tempo para entrega de ${perfil.tEntMin} a ${perfil.tEntMax} minutos`}
                        min={perfil.pedidoMinEntregaAtivo ? perfil.pedidoMinEntrega : 0}
                        onClick={() => setTipo("entrega")}
                      />
                    )}
                    {perfil.retAtiva && (
                      <TipoCard
                        ativo={tipo === "retirada"}
                        brown={brown}
                        titulo="Retirada"
                        sub={`Tempo para retirada de ${perfil.tRetMin} a ${perfil.tRetMax} minutos`}
                        min={perfil.pedidoMinRetiradaAtivo ? perfil.pedidoMinRetirada : 0}
                        onClick={() => setTipo("retirada")}
                      />
                    )}
                  </div>

                  {tipo === "entrega" && (
                    <div className="mt-4">
                      {enderecoConfirmado ? (
                        <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3.5 py-3">
                          <MapPin size={16} className="shrink-0 text-neutral-500" />
                          <span className="flex-1 text-[.82rem] text-neutral-700">{enderecoTexto()}</span>
                          <button type="button" onClick={() => setEnderecoModalAberto(true)} className="text-[.8rem] font-semibold" style={{ color: brown }}>
                            Editar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEnderecoModalAberto(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-neutral-300 py-3.5 text-[.86rem] font-semibold text-neutral-600"
                        >
                          <MapPin size={15} />
                          Informar endereco de entrega
                        </button>
                      )}
                    </div>
                  )}

                  {abaixoDoMinimo && (
                    <p className="mt-3 text-[.82rem] text-red-600">
                      Pedido minimo de {formatarPreco(pedidoMinAtivo)} para {tipo === "entrega" ? "entrega" : "retirada"}.
                    </p>
                  )}
                </div>
              )}

              {etapa === "pagamento" && (
                <div>
                  <p className="mb-3 text-[.84rem] text-neutral-500">Forma de pagamento na entrega</p>
                  <div className="space-y-2.5">
                    {FORMAS_PAGAMENTO.filter((f) => perfil[f.flag]).map((f) => {
                      const Icon = f.icon;
                      const ativo = formaPagamento === f.valor;
                      return (
                        <label
                          key={f.valor}
                          className="flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] p-3.5 transition-colors"
                          style={ativo ? { borderColor: brown, background: `${brown}0d` } : { borderColor: "#e5e7eb" }}
                        >
                          <Icon size={20} className="shrink-0 text-neutral-700" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[.9rem] font-bold text-neutral-900">{f.label}</p>
                            <p className="mt-0.5 text-[.76rem] text-neutral-400">{f.sub}</p>
                            {(f.valor === "credito" || f.valor === "debito") && (perfil.bandeirasCredito.length || perfil.bandeirasDebito.length) > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {(f.valor === "credito" ? perfil.bandeirasCredito : perfil.bandeirasDebito).map((b) => (
                                  <span key={b} className="rounded bg-neutral-100 px-2 py-0.5 text-[.68rem] font-medium text-neutral-600">
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span
                            className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2"
                            style={ativo ? { borderColor: brown, background: brown } : { borderColor: "#ddd" }}
                          >
                            {ativo && <span className="size-2 rounded-full bg-white" />}
                          </span>
                          <input type="radio" name="pagamento" checked={ativo} onChange={() => setFormaPagamento(f.valor)} className="sr-only" />
                        </label>
                      );
                    })}
                  </div>

                  {formaPagamento === "dinheiro" && (
                    <div className="mt-3.5">
                      <label className="mb-1.5 block text-[.72rem] font-semibold tracking-wide text-neutral-500 uppercase">Troco para quanto? (opcional)</label>
                      <input value={trocoPara} onChange={(e) => setTrocoPara(e.target.value)} placeholder="R$ 0,00" className={fieldClass()} />
                    </div>
                  )}

                  {perfil.cuponsAtivo && (
                    <div className="mt-3.5">
                      <label className="mb-1.5 block text-[.72rem] font-semibold tracking-wide text-neutral-500 uppercase">Cupom de desconto</label>
                      <div className="flex gap-2">
                        <input
                          value={cupomCodigo}
                          onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                          placeholder="CODIGO"
                          disabled={!!cupomAplicado}
                          className={fieldClass()}
                        />
                        {cupomAplicado ? (
                          <button type="button" onClick={() => setCupomAplicado(null)} className="shrink-0 rounded-xl border-[1.5px] border-neutral-200 px-4 text-[.82rem] font-semibold text-neutral-600">
                            Remover
                          </button>
                        ) : (
                          <button type="button" onClick={validarCupom} disabled={validandoCupom} className="shrink-0 rounded-xl border-[1.5px] border-neutral-200 px-4 text-[.82rem] font-semibold text-neutral-600">
                            {validandoCupom ? <Loader2 size={14} className="animate-spin" /> : "Aplicar"}
                          </button>
                        )}
                      </div>
                      {cupomErro && <p className="mt-1 text-[.76rem] text-red-600">{cupomErro}</p>}
                      {cupomAplicado && <p className="mt-1 text-[.76rem] text-emerald-600">Cupom aplicado: -{formatarPreco(cupomAplicado.valor)}</p>}
                    </div>
                  )}
                </div>
              )}

              {etapa === "resumo" && (
                <div>
                  <div className="mb-3 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                      {perfil.perfilLoja ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={perfil.perfilLoja} alt="" className="size-full object-cover" />
                      ) : (
                        perfil.nomeLoja.charAt(0)
                      )}
                    </div>
                    <p className="text-[.86rem] font-bold text-neutral-900">{perfil.nomeLoja}</p>
                  </div>

                  <ResumoSecao titulo="Seus dados" onEditar={() => setEtapa("dados")}>
                    <p className="text-[.86rem] font-bold text-neutral-900">{nome}</p>
                    <p className="text-[.82rem] text-neutral-500">{telefone}</p>
                  </ResumoSecao>

                  {tipo === "entrega" && (
                    <ResumoSecao titulo="Endereco para entrega do pedido" onEditar={() => setEtapa("entrega")}>
                      <p className="text-[.86rem] font-bold text-neutral-900">{rua}, {numero}</p>
                      <p className="text-[.82rem] text-neutral-500">{bairro}, {cidade}/{estado}, CEP {cep}</p>
                    </ResumoSecao>
                  )}

                  <ResumoSecao titulo="Forma(s) de pagamento" onEditar={() => setEtapa("pagamento")}>
                    <p className="text-[.86rem] font-bold text-neutral-900 capitalize">{formaPagamento}</p>
                    <p className="text-[.82rem] text-neutral-500">Valor: {formatarPreco(total)}</p>
                  </ResumoSecao>

                  <div className="py-3">
                    <p className="mb-1.5 text-[.72rem] font-semibold tracking-wide text-neutral-400 uppercase">Itens do pedido ({itens.length})</p>
                    <div className="space-y-1.5">
                      {itens.map((item, i) => (
                        <div key={item.key} className="flex items-baseline gap-2 text-[.84rem]">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[.68rem] font-bold" style={{ color: brown, border: `1.5px solid ${brown}` }}>
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1 text-neutral-700">{item.nome}</span>
                          <span className="shrink-0 font-semibold text-neutral-900">{formatarPreco(item.precoUnit * item.qtd)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {erroEnvio && <p className="mt-2 text-[.84rem] text-red-600">{erroEnvio}</p>}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-neutral-100 px-5 py-3.5">
              <div className="mb-2.5 space-y-1 text-[.78rem]">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span>{formatarPreco(subtotal)}</span>
                </div>
                {taxaFinal > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Taxa de entrega</span>
                    <span>{formatarPreco(taxaFinal)}</span>
                  </div>
                )}
                {desconto > 0 && (
                  <div className="flex justify-between" style={{ color: "#7c3aed" }}>
                    <span>Desconto</span>
                    <span>-{formatarPreco(desconto)}</span>
                  </div>
                )}
                {cashbackEstimado > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Cashback a receber (apos 12 horas da compra)</span>
                    <span>{formatarPreco(cashbackEstimado)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-[.86rem] font-bold text-neutral-900">
                  <span>Total da compra</span>
                  <span>{formatarPreco(total)}</span>
                </div>
              </div>

              {etapa !== "resumo" ? (
                <button
                  type="button"
                  disabled={avancarDesabilitado}
                  onClick={avancar}
                  className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
                  style={{ background: avancarDesabilitado ? "#c0a88a" : brown }}
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={formaPagamento === "" || enviando}
                  onClick={finalizarPedido}
                  className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
                  style={{ background: formaPagamento === "" || enviando ? "#c0a88a" : brown }}
                >
                  {enviando ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Enviar pedido"}
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enderecoModalAberto} onOpenChange={setEnderecoModalAberto}>
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <DialogTitle className="text-[1rem] font-bold text-neutral-900">Endereco de Entrega</DialogTitle>
            <button type="button" onClick={() => setEnderecoModalAberto(false)} className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
              ×
            </button>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            <div className="flex items-center gap-2">
              <input value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} onBlur={buscarCep} placeholder="CEP" inputMode="numeric" className={fieldClass()} />
              {buscandoCep && <Loader2 size={16} className="shrink-0 animate-spin text-neutral-400" />}
            </div>
            <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Rua/Avenida" className={fieldClass()} />
            <div className="grid grid-cols-2 gap-2.5">
              <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className={fieldClass()} />
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className={fieldClass()} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Numero" inputMode="numeric" className={fieldClass()} />
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className={fieldClass()}>
                <option value="">UF</option>
                {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento" className={fieldClass()} />
          </div>
          <div className="border-t border-neutral-100 p-4">
            <button
              type="button"
              disabled={!rua.trim() || !numero.trim()}
              onClick={confirmarEndereco}
              className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
              style={{ background: !rua.trim() || !numero.trim() ? "#c0a88a" : brown }}
            >
              Proximo
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TipoCard({
  ativo,
  brown,
  titulo,
  sub,
  min,
  onClick,
}: {
  ativo: boolean;
  brown: string;
  titulo: string;
  sub: string;
  min: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors"
      style={ativo ? { borderColor: brown, background: `${brown}0d` } : { borderColor: "#eee" }}
    >
      <div>
        <div className="flex items-center gap-2">
          {titulo === "Entrega" ? <MapPin size={15} style={{ color: ativo ? brown : "#aaa" }} /> : <StoreIcon size={15} style={{ color: ativo ? brown : "#aaa" }} />}
          <span className="text-[.86rem] font-bold text-neutral-900">{titulo}</span>
        </div>
        <p className="mt-1 text-[.72rem] text-neutral-400">{sub}</p>
        {min > 0 && <p className="mt-0.5 text-[.76rem] font-semibold text-neutral-700">Pedido minimo: {formatarPreco(min)}</p>}
      </div>
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2" style={ativo ? { borderColor: brown, background: brown } : { borderColor: "#ddd" }}>
        {ativo && <span className="size-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}

function ResumoSecao({ titulo, onEditar, children }: { titulo: string; onEditar: () => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-neutral-100 py-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[.72rem] font-semibold tracking-wide text-neutral-400 uppercase">{titulo}</p>
        <button type="button" onClick={onEditar} className="text-[.78rem] font-semibold text-neutral-500 hover:text-neutral-700">
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}
