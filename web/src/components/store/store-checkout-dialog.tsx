"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bike, Calendar, ChevronDown, CreditCard, Info, Loader2, Map, MapPin, QrCode, User, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckoutStepper } from "@/components/store/checkout-stepper";
import { PontosBadge } from "@/components/store/pontos-badge";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { StoreAgendamentoOverlay } from "@/components/store/store-agendamento-dialog";
import { useStoreTheme } from "@/components/store/store-theme";
import { buscarEnderecoPorCep, formatarCep } from "@/lib/cep";
import { trackStoreEvento } from "@/lib/store/tracking";
import { formatarPreco, formatarTelefone, maskValorDigitado, parseValorMascarado } from "@/lib/store/format";
import type { StoreCartItem, StoreCupomResultado, StorePedidoSnapshot, StorePerfil } from "@/lib/store/types";

type Etapa = "dados" | "entrega" | "pagamento" | "resumo";
const ETAPAS: Etapa[] = ["dados", "entrega", "pagamento", "resumo"];

const FORMAS_PAGAMENTO: { valor: string; label: string; sub: string; icon: typeof QrCode; flag: keyof StorePerfil }[] = [
  { valor: "pix", label: "Pix", sub: "A chave sera exibida apos a confirmacao do pedido.", icon: QrCode, flag: "pixAtivo" },
  { valor: "dinheiro", label: "Dinheiro", sub: "Pagamento na entrega/retirada", icon: Wallet, flag: "dinAtivo" },
  { valor: "credito", label: "Cartao de credito", sub: "Bandeiras aceitas na entrega", icon: CreditCard, flag: "credAtivo" },
  { valor: "debito", label: "Cartao de debito", sub: "Bandeiras aceitas na entrega", icon: CreditCard, flag: "debAtivo" },
];

function fieldClass() {
  /* text-base (16px) e nao um valor menor — abaixo de 16px o iOS/Android
     tratam o campo como "dificil de ler" e da zoom automatico na tela ao
     focar, obrigando o usuario a dar zoom out manualmente depois. */
  return "w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 outline-none transition-colors focus:bg-white";
}

export function StoreCheckoutDialog({
  open,
  onOpenChange,
  perfil,
  itens,
  subtotal,
  cupomAplicado,
  onCupomAplicadoChange,
  onSucesso,
  onVoltarCarrinho,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  perfil: StorePerfil;
  itens: StoreCartItem[];
  subtotal: number;
  cupomAplicado: StoreCupomResultado | null;
  onCupomAplicadoChange: (c: StoreCupomResultado | null) => void;
  onSucesso: (codigo: number | string, snapshot: StorePedidoSnapshot) => void;
  onVoltarCarrinho?: () => void;
}) {
  const { brown } = useStoreTheme();
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  /* "" = nenhum tipo escolhido ainda (mesmo estado inicial do loja.js legado,
     mostra o aviso "Escolha o tipo de entrega!" ate o cliente clicar um card). */
  const [tipo, setTipo] = useState<"" | "entrega" | "entrega_agendada" | "retirada" | "retirada_agendada">("");
  const isEntregaTipo = tipo === "entrega" || tipo === "entrega_agendada";
  const isRetiradaTipo = tipo === "retirada" || tipo === "retirada_agendada";
  const isAgendadaTipo = tipo === "entrega_agendada" || tipo === "retirada_agendada";

  const [agendamento, setAgendamento] = useState<{ data: Date; slot: string } | null>(null);
  const [agendamentoModalAberto, setAgendamentoModalAberto] = useState(false);

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
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);
  const [geoDispensado, setGeoDispensado] = useState(false);
  const [geoErro, setGeoErro] = useState("");

  const [formaPagamento, setFormaPagamento] = useState("");
  const [trocoPara, setTrocoPara] = useState("");
  const [trocoModalAberto, setTrocoModalAberto] = useState(false);
  const [precisaTroco, setPrecisaTroco] = useState(false);

  const [cupomCodigo, setCupomCodigo] = useState(cupomAplicado?.codigo ?? perfil.cupomPreenchido ?? "");
  const [cupomErro, setCupomErro] = useState("");
  const [validandoCupom, setValidandoCupom] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [resumoAberto, setResumoAberto] = useState(true);
  const [itensResumoAberto, setItensResumoAberto] = useState(true);

  /* Cashback ja disponivel do cliente (saldo pra gastar), diferente do
     cashbackEstimado abaixo (o que ele VAI ganhar com essa compra). */
  const [cashbackDisponivel, setCashbackDisponivel] = useState(0);
  const [cashbackModalAberto, setCashbackModalAberto] = useState(false);
  const [cashbackModalJaMostrado, setCashbackModalJaMostrado] = useState(false);
  const [cashbackAplicado, setCashbackAplicado] = useState(false);
  const [cashbackValorInput, setCashbackValorInput] = useState("");
  const [cashbackValorUsado, setCashbackValorUsado] = useState(0);

  const wppNum = perfil.lojaContato.replace(/\D/g, "");

  /* Busca case-insensitive do bairro digitado contra os bairros cadastrados em
     Configuracoes > Taxa de entrega. undefined = bairro nao cadastrado (loja nao
     atende esse bairro), diferente de "" (bairro ainda nao digitado). */
  const bairroChaveEncontrada = useMemo(() => {
    if (perfil.taxaEntregaTipo !== "bairro" || !bairro.trim()) return undefined;
    return Object.keys(perfil.taxasBairro).find((k) => k.toLowerCase() === bairro.trim().toLowerCase());
  }, [perfil.taxaEntregaTipo, perfil.taxasBairro, bairro]);

  const bairroNaoAtendido = perfil.taxaEntregaTipo === "bairro" && bairro.trim() !== "" && bairroChaveEncontrada === undefined;

  const taxaEntrega = useMemo(() => {
    if (!isEntregaTipo) return 0;
    if (perfil.taxaEntregaGratis) return 0;
    if (perfil.taxaEntregaTipo === "bairro") {
      return bairroChaveEncontrada !== undefined ? perfil.taxasBairro[bairroChaveEncontrada] : 0;
    }
    return perfil.taxaEntrega;
  }, [isEntregaTipo, perfil, bairroChaveEncontrada]);

  /* Texto exibido pro cliente (resumo do endereco confirmado + dentro do modal
     enquanto digita), espelhando calcularTaxaEntrega() do loja.js legado. */
  const taxaInfo = useMemo(() => {
    if (perfil.taxaEntregaGratis) return { texto: "Entrega gratis! 🎉", gratis: true };
    if (perfil.taxaEntregaTipo === "bairro") {
      if (!bairro.trim()) return { texto: "Informe seu bairro para calcular a taxa.", gratis: false };
      if (bairroChaveEncontrada === undefined) return null;
      return taxaEntrega === 0
        ? { texto: `Entrega gratis para ${bairro.trim()} 🎉`, gratis: true }
        : { texto: `Taxa de entrega para ${bairro.trim()}: ${formatarPreco(taxaEntrega)}`, gratis: false };
    }
    return taxaEntrega === 0 ? { texto: "Entrega gratis!", gratis: true } : { texto: `Taxa de entrega: ${formatarPreco(taxaEntrega)}`, gratis: false };
  }, [perfil, bairro, bairroChaveEncontrada, taxaEntrega]);

  const { desconto, taxaFinal } = useMemo(() => {
    if (!cupomAplicado) return { desconto: 0, taxaFinal: taxaEntrega };
    if (cupomAplicado.tipo === "frete") return { desconto: 0, taxaFinal: Math.max(0, taxaEntrega - cupomAplicado.valor) };
    return { desconto: cupomAplicado.valor, taxaFinal: taxaEntrega };
  }, [cupomAplicado, taxaEntrega]);

  const cashbackUsadoEfetivo = cashbackAplicado ? Math.min(cashbackValorUsado, cashbackDisponivel) : 0;
  const total = Math.max(0, subtotal - desconto - cashbackUsadoEfetivo) + taxaFinal;
  const cashbackEstimado = perfil.cashbackAtivo && perfil.cashbackPct > 0 ? (total * perfil.cashbackPct) / 100 : 0;

  const trocoValorNumerico = parseValorMascarado(trocoPara);
  const trocoValorValido = trocoPara.trim() !== "" && !isNaN(trocoValorNumerico) && trocoValorNumerico > total;

  const pedidoMinAtivo =
    tipo === ""
      ? 0
      : isEntregaTipo
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

  function usarLocalizacaoAtual() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErro("Seu navegador nao suporta localizacao.");
      return;
    }
    setBuscandoLocalizacao(true);
    setGeoErro("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch(`/api/store/geo-reverso?lat=${latitude}&lng=${longitude}`)
          .then((r) => r.json())
          .then((data) => {
            if (!data.ok) {
              setGeoErro(data.msg ?? "Nao foi possivel identificar seu endereco.");
              return;
            }
            setCep(formatarCep(data.cep ?? ""));
            setRua(data.rua ?? "");
            setBairro(data.bairro ?? "");
            setCidade(data.cidade ?? "");
            setEstado(data.estado ?? "");
            if (data.numero) setNumero(data.numero);
            setGeoDispensado(true);
          })
          .catch(() => setGeoErro("Erro ao buscar seu endereco."))
          .finally(() => setBuscandoLocalizacao(false));
      },
      (err) => {
        setBuscandoLocalizacao(false);
        setGeoErro(err?.code === 1 ? "Permissao de localizacao negada." : "Nao foi possivel obter sua localizacao.");
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  function confirmarEndereco() {
    if (!rua.trim() || !numero.trim()) return;
    if (perfil.taxaEntregaTipo === "bairro" && (!bairro.trim() || bairroNaoAtendido)) return;
    setEnderecoConfirmado(true);
    setEnderecoModalAberto(false);
    /* Entrega agendada so pede o horario depois que o endereco ja foi
       confirmado, mesma ordem do abrirEnderecoSheet()/confirmarEndereco()
       do loja.js legado. */
    if (tipo === "entrega_agendada" && !agendamento) {
      setTimeout(() => setAgendamentoModalAberto(true), 300);
    }
  }

  function confirmarTroco() {
    if (precisaTroco && !trocoValorValido) return;
    if (!precisaTroco) setTrocoPara("");
    setTrocoModalAberto(false);
  }

  async function verificarCashback() {
    if (!perfil.cashbackAtivo || cashbackModalJaMostrado) return;
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10) return;
    try {
      const res = await fetch(`/api/store/cashback-check?tel=${digits}&loja_id=${perfil.loja_id}`);
      const data = await res.json();
      const saldo = data.ok ? Number(data.saldo) || 0 : 0;
      if (saldo > 0) {
        setCashbackDisponivel(saldo);
        setCashbackValorInput(saldo.toFixed(2).replace(".", ","));
        setCashbackModalAberto(true);
        setCashbackModalJaMostrado(true);
      }
    } catch {
      // silencioso — cashback e um bonus, nao pode travar o checkout
    }
  }

  const cashbackValorInputNumerico = parseValorMascarado(cashbackValorInput);
  const cashbackValorInputValido =
    cashbackValorInput.trim() !== "" && !isNaN(cashbackValorInputNumerico) && cashbackValorInputNumerico > 0 && cashbackValorInputNumerico <= cashbackDisponivel;

  function confirmarCashback() {
    if (!cashbackValorInputValido) return;
    setCashbackValorUsado(cashbackValorInputNumerico);
    setCashbackAplicado(true);
    setCashbackModalAberto(false);
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
      if (data.ok) onCupomAplicadoChange(data as StoreCupomResultado);
      else {
        onCupomAplicadoChange(null);
        setCupomErro(data.msg ?? "Cupom invalido.");
      }
    } catch {
      setCupomErro("Erro ao validar cupom.");
    } finally {
      setValidandoCupom(false);
    }
  }

  /* Cupom tipo "frete" aplicado ainda no carrinho (onde a taxa de entrega
     e desconhecida, sempre 0) fica com valor:0 ate aqui — assim que a taxa
     real e calculada (endereco confirmado), revalida silenciosamente pra
     corrigir o desconto. Cupons "valor"/"percent" nao precisam disso, o
     valor deles independe da taxa. */
  useEffect(() => {
    if (cupomAplicado?.tipo === "frete" && taxaEntrega > 0 && cupomAplicado.valor === 0) {
      validarCupom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxaEntrega]);

  function enderecoTexto(): string {
    const partes = [rua + (numero ? `, ${numero}` : ""), complemento || null, bairro, cidade + (estado ? `/${estado}` : ""), cep ? `CEP ${cep}` : ""].filter(Boolean);
    return partes.join(", ");
  }

  const podeAvancarDados = nome.trim().length >= 2 && telefone.replace(/\D/g, "").length >= 10;
  const podeAvancarEntrega = tipo !== "" && (isRetiradaTipo || enderecoConfirmado) && (!isAgendadaTipo || agendamento !== null);

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
          /* pedido_criar.php so reconhece "entrega"/"retirada"/"mesa" no campo tipo;
             a variante "_agendada" (usada so pra UI/cupom) e normalizada aqui. */
          tipo: isEntregaTipo ? "entrega" : "retirada",
          forma_pagamento: formaPagamento,
          endereco: isEntregaTipo ? enderecoTexto() : "",
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
            crossSell: i.crossSell === true,
            pontosPendente: i.pontosCusto != null,
          })),
          troco_solicitado: formaPagamento === "dinheiro" && trocoPara.trim() !== "",
          troco_valor: formaPagamento === "dinheiro" ? parseValorMascarado(trocoPara) || 0 : 0,
          cupom_codigo: cupomAplicado?.codigo ?? "",
          cupom_desconto: desconto,
          cashback_usar: cashbackAplicado && cashbackUsadoEfetivo > 0,
          cashback_valor: cashbackUsadoEfetivo,
          tipo_agendamento: isAgendadaTipo ? tipo : "",
          agendamento: isAgendadaTipo && agendamento ? JSON.stringify({ data: agendamento.data.toISOString().slice(0, 10), slot: agendamento.slot }) : "",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        trackStoreEvento(perfil.loja_id, "pedido");
        onSucesso(data.codigo, {
          nome: nome.trim(),
          telefone,
          itens,
          tipo: tipo as StorePedidoSnapshot["tipo"],
          formaPagamento,
          trocoValor: formaPagamento === "dinheiro" && trocoValorValido ? trocoValorNumerico : 0,
          endereco: isEntregaTipo ? enderecoTexto() : "",
          agendamentoTexto:
            isAgendadaTipo && agendamento
              ? `${agendamento.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} ${agendamento.slot}`
              : "",
          taxa: taxaFinal,
          desconto,
          cashbackUsado: cashbackUsadoEfetivo,
          total,
        });
      } else setErroEnvio(data.msg ?? "Erro ao enviar pedido.");
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
          <div className="relative flex h-full min-h-0 flex-col">
            {isAgendadaTipo && agendamentoModalAberto && (
              <StoreAgendamentoOverlay
                brown={brown}
                perfil={perfil}
                tipo={tipo as "entrega_agendada" | "retirada_agendada"}
                onFechar={() => setAgendamentoModalAberto(false)}
                onConfirmar={(data, slot) => {
                  setAgendamento({ data, slot });
                  setAgendamentoModalAberto(false);
                }}
              />
            )}
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              {etapa === "dados" && (
                <div className="space-y-3">
                  <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome*" className={fieldClass()} />
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    onBlur={verificarCashback}
                    inputMode="tel"
                    placeholder="Telefone*"
                    className={fieldClass()}
                  />
                </div>
              )}

              {etapa === "entrega" && (
                <div>
                  <p className="mb-3 text-[.84rem] text-neutral-500">Escolha o tipo de entrega</p>
                  <div className="space-y-2.5">
                    {perfil.entAtiva && perfil.lojaAberta && (
                      <TipoCard
                        ativo={tipo === "entrega"}
                        brown={brown}
                        titulo="Entrega"
                        sub={`Tempo para entrega de ${perfil.tEntMin} a ${perfil.tEntMax} minutos`}
                        min={perfil.pedidoMinEntregaAtivo ? perfil.pedidoMinEntrega : 0}
                        onClick={() => {
                          setTipo("entrega");
                          if (!enderecoConfirmado) setEnderecoModalAberto(true);
                        }}
                      />
                    )}
                    {perfil.entAtiva && perfil.agendamentoDeliveryAtivo && (
                      <TipoCard
                        ativo={tipo === "entrega_agendada"}
                        brown={brown}
                        titulo="Entrega agendada"
                        sub="Selecione um horario especifico para entregar seu pedido"
                        min={perfil.pedidoMinEntregaAtivo ? perfil.pedidoMinEntrega : 0}
                        onClick={() => {
                          setTipo("entrega_agendada");
                          if (!enderecoConfirmado) setEnderecoModalAberto(true);
                          else if (!agendamento) setAgendamentoModalAberto(true);
                        }}
                      />
                    )}
                    {perfil.retAtiva && perfil.lojaAberta && (
                      <TipoCard
                        ativo={tipo === "retirada"}
                        brown={brown}
                        titulo="Retirada"
                        sub={`Tempo para retirada de ${perfil.tRetMin} a ${perfil.tRetMax} minutos`}
                        min={perfil.pedidoMinRetiradaAtivo ? perfil.pedidoMinRetirada : 0}
                        onClick={() => setTipo("retirada")}
                      />
                    )}
                    {perfil.retAtiva && perfil.agendamentoRetiradaAtivo && (
                      <TipoCard
                        ativo={tipo === "retirada_agendada"}
                        brown={brown}
                        titulo="Retirada agendada"
                        sub="Selecione um horario especifico para retirar seu pedido"
                        min={perfil.pedidoMinRetiradaAtivo ? perfil.pedidoMinRetirada : 0}
                        onClick={() => {
                          setTipo("retirada_agendada");
                          if (!agendamento) setAgendamentoModalAberto(true);
                        }}
                      />
                    )}
                  </div>

                  {tipo === "" && (
                    <div className="mt-1 flex items-center gap-1.5 rounded-r-lg border-l-[3px] border-blue-300 bg-blue-50 px-3 py-2.5 text-[.78rem] text-blue-800">
                      <Info size={14} className="shrink-0" />
                      Escolha o tipo de entrega!
                    </div>
                  )}

                  {isEntregaTipo && (
                    <div className="mt-4">
                      {enderecoConfirmado ? (
                        <div>
                          <p className="mb-3 text-[.86rem] font-normal text-neutral-900">Entregar no endereco</p>
                          <div className="space-y-3.5">
                            <div className="flex items-start gap-2.5">
                              <MapPin size={16} className="mt-0.5 shrink-0 text-neutral-500" fill="currentColor" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[.86rem] font-normal text-neutral-500">
                                  {rua}
                                  {numero ? `, ${numero}` : ""}
                                </p>
                                <p className="text-[.78rem] font-light text-neutral-500">
                                  {[bairro, cidade].filter(Boolean).join(", ")}
                                  {cep ? ` - ${cep.replace(/\D/g, "")}` : ""}
                                </p>
                              </div>
                              <button type="button" onClick={() => setEnderecoModalAberto(true)} className="shrink-0 text-[.8rem] font-light" style={{ color: brown }}>
                                Editar
                              </button>
                            </div>
                            {taxaInfo && (
                              <div className="flex items-start gap-2.5">
                                <Bike size={16} className="mt-0.5 shrink-0 text-neutral-500" fill="currentColor" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[.78rem] font-light text-neutral-500">Taxa de entrega</p>
                                  <p className="text-[.86rem] font-normal text-neutral-500">{taxaEntrega === 0 ? "Gratis" : formatarPreco(taxaEntrega)}</p>
                                </div>
                              </div>
                            )}
                          </div>
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

                  {isRetiradaTipo && (
                    <div className="mt-4">
                      <p className="mb-0.5 text-[.86rem] leading-tight font-normal text-neutral-900">Endereco para retirada do pedido</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[.78rem] leading-snug font-light text-neutral-500">
                          {perfil.lojaRua}
                          {perfil.lojaNumero ? `, ${perfil.lojaNumero}` : ""}
                          {perfil.lojaBairro ? ` - ${perfil.lojaBairro}` : ""}
                          {perfil.lojaCidade ? ` / ${perfil.lojaCidade}` : ""}
                        </p>
                        <div className="relative shrink-0">
                          <span
                            className="absolute inset-0 animate-ping rounded-full opacity-40"
                            style={{ background: brown, animationDuration: "2.2s" }}
                          />
                          <button
                            type="button"
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(perfil.enderecoLoja || perfil.nomeLoja)}`, "_blank", "noopener")}
                            className="relative flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                          >
                            <Map size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {isAgendadaTipo && agendamento && (
                    <div className="mt-4">
                      <p className="mb-0.5 text-[.86rem] leading-tight font-normal text-neutral-900">Agendamento</p>
                      <div className="flex items-center gap-2.5">
                        <Calendar size={16} className="shrink-0 text-neutral-500" />
                        <span className="min-w-0 flex-1 text-[.78rem] leading-snug font-light text-neutral-500">
                          {agendamento.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} {agendamento.slot}
                        </span>
                        <button type="button" onClick={() => setAgendamentoModalAberto(true)} className="shrink-0 text-[.8rem] font-light" style={{ color: brown }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  )}

                  {abaixoDoMinimo && (
                    <p className="mt-3 text-[.82rem] text-red-600">
                      Pedido minimo de {formatarPreco(pedidoMinAtivo)} para {isEntregaTipo ? "entrega" : "retirada"}.
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
                          onClick={() => {
                            if (f.valor === "dinheiro") setTrocoModalAberto(true);
                          }}
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
                          <button type="button" onClick={() => onCupomAplicadoChange(null)} className="shrink-0 rounded-xl border-[1.5px] border-neutral-200 px-4 text-[.82rem] font-semibold text-neutral-600">
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
                  <div className="mb-1 flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                      {perfil.perfilLoja ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={perfil.perfilLoja} alt="" className="size-full object-cover" />
                      ) : (
                        perfil.nomeLoja.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[.86rem] font-normal text-neutral-900">{perfil.nomeLoja}</p>
                      <button type="button" onClick={onVoltarCarrinho} className="text-[.8rem] font-light" style={{ color: brown }}>
                        Adicionar mais itens
                      </button>
                    </div>
                  </div>

                  <div className="border-b border-neutral-100 py-3.5">
                    <p className="mb-1.5 text-[.86rem] font-normal text-neutral-900">Seus dados</p>
                    <div className="flex items-start gap-2.5">
                      <User size={16} className="mt-0.5 shrink-0 text-neutral-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[.86rem] font-normal text-neutral-900">{nome}</p>
                        <p className="text-[.78rem] font-light text-neutral-500">{telefone}</p>
                      </div>
                      <button type="button" onClick={() => setEtapa("dados")} className="shrink-0 text-[.8rem] font-light" style={{ color: brown }}>
                        Editar
                      </button>
                    </div>
                  </div>

                  {isEntregaTipo && (
                    <div className="border-b border-neutral-100 py-3.5">
                      <p className="mb-1.5 text-[.86rem] font-normal text-neutral-900">Endereco para entrega do pedido</p>
                      <div className="flex items-start gap-2.5">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-neutral-500" fill="currentColor" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[.86rem] font-normal text-neutral-500">
                            {rua}
                            {numero ? `, ${numero}` : ""}
                          </p>
                          <p className="text-[.78rem] font-light text-neutral-500">
                            {[bairro, cidade].filter(Boolean).join(", ")}
                            {cep ? ` - ${cep.replace(/\D/g, "")}` : ""}
                          </p>
                        </div>
                        <button type="button" onClick={() => setEtapa("entrega")} className="shrink-0 text-[.8rem] font-light" style={{ color: brown }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  )}

                  {isRetiradaTipo && (
                    <div className="border-b border-neutral-100 py-3.5">
                      <p className="mb-1.5 text-[.86rem] font-normal text-neutral-900">Endereco para retirada do pedido</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[.78rem] font-light text-neutral-500">
                          {perfil.lojaRua}
                          {perfil.lojaNumero ? `, ${perfil.lojaNumero}` : ""}
                          {perfil.lojaBairro ? ` - ${perfil.lojaBairro}` : ""}
                          {perfil.lojaCidade ? ` / ${perfil.lojaCidade}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(perfil.enderecoLoja || perfil.nomeLoja)}`, "_blank", "noopener")}
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                        >
                          <Map size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isAgendadaTipo && agendamento && (
                    <div className="border-b border-neutral-100 py-3.5">
                      <p className="mb-1.5 text-[.86rem] font-normal text-neutral-900">Agendamento</p>
                      <div className="flex items-center gap-2.5">
                        <Calendar size={16} className="shrink-0 text-neutral-500" />
                        <span className="min-w-0 flex-1 text-[.78rem] font-light text-neutral-500">
                          {agendamento.data.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} {agendamento.slot}
                        </span>
                        <button type="button" onClick={() => setEtapa("entrega")} className="shrink-0 text-[.8rem] font-light" style={{ color: brown }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-b border-neutral-100 py-3.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[.86rem] font-normal text-neutral-900">Forma(s) de pagamento</p>
                      <button type="button" onClick={() => setEtapa("pagamento")} className="text-[.8rem] font-light" style={{ color: brown }}>
                        Editar
                      </button>
                    </div>
                    <div className="flex items-start gap-2.5">
                      {(() => {
                        const PagIcon = FORMAS_PAGAMENTO.find((f) => f.valor === formaPagamento)?.icon ?? Wallet;
                        return <PagIcon size={16} className="mt-0.5 shrink-0 text-neutral-500" />;
                      })()}
                      <div className="min-w-0 flex-1">
                        <p className="text-[.86rem] font-normal text-neutral-900 capitalize">{formaPagamento}</p>
                        <p className="text-[.78rem] font-light text-neutral-500">Forma de pagamento do pedido</p>
                        <p className="text-[.78rem] font-light text-neutral-500">Valor: {formatarPreco(total)}</p>
                        {formaPagamento === "dinheiro" && trocoValorValido && (
                          <p className="text-[.78rem] font-light text-neutral-500">Troco para {formatarPreco(trocoValorNumerico)}</p>
                        )}
                        {cashbackAplicado && cashbackUsadoEfetivo > 0 && (
                          <p className="text-[.78rem] font-light text-neutral-500">Cashback usado: {formatarPreco(cashbackUsadoEfetivo)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-neutral-100 py-3.5">
                    <button type="button" onClick={() => setItensResumoAberto((v) => !v)} className="flex w-full items-center justify-between">
                      <div className="text-left">
                        <p className="text-[.86rem] font-normal text-neutral-900">Itens do pedido</p>
                        <p className="mt-0.5 text-[.78rem] font-light text-neutral-500">
                          {itens.length} {itens.length === 1 ? "item" : "itens"} no seu pedido
                        </p>
                      </div>
                      <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform ${itensResumoAberto ? "" : "rotate-180"}`} />
                    </button>

                    {itensResumoAberto && (
                      <div className="mt-3 space-y-3">
                        {itens.map((item) => {
                          const grupos = item.combosels
                            ? item.combosels.reduce<Record<string, typeof item.combosels>>((acc, s) => {
                                const chave = s.passoNome ?? "";
                                (acc[chave] ??= []).push(s);
                                return acc;
                              }, {})
                            : null;
                          return (
                            <div key={item.key}>
                              <div className="flex items-baseline gap-2 text-[.86rem]">
                                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-neutral-400 text-[.7rem] font-light text-neutral-500">
                                  {item.qtd}
                                </span>
                                <span className="min-w-0 flex-1 font-normal text-neutral-900">
                                  {item.nome}
                                  {perfil.clubePontosAtivo && item.pontosCusto == null && (item.pontosGanho ?? 0) > 0 && (
                                    <span className="ml-1.5 align-middle">
                                      <PontosBadge pontos={(item.pontosGanho ?? 0) * item.qtd} />
                                    </span>
                                  )}
                                </span>
                                <span className="shrink-0 font-normal text-neutral-900">{formatarPreco(item.precoUnit * item.qtd)}</span>
                              </div>
                              {grupos &&
                                Object.entries(grupos).map(([passoNome, sels]) => (
                                  <div key={passoNome} className="mt-1.5 pl-5">
                                    {passoNome && <p className="text-[.8rem] font-semibold text-neutral-800">{passoNome}</p>}
                                    {sels?.map((s) => (
                                      <p key={s.id} className="flex items-baseline gap-1.5 text-[.8rem] font-light text-neutral-600">
                                        <span className="text-neutral-400">{s.qtd}</span>
                                        {s.nome}
                                      </p>
                                    ))}
                                  </div>
                                ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {erroEnvio && <p className="mt-2 text-[.84rem] text-red-600">{erroEnvio}</p>}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-neutral-100 px-5 py-3.5">
              {resumoAberto && (
                <div className="mb-1.5 space-y-1 text-[.78rem]">
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
                  {cashbackAplicado && cashbackUsadoEfetivo > 0 && (
                    <div className="flex justify-between" style={{ color: brown }}>
                      <span className="flex items-center gap-1.5">
                        Cashback usado
                        <button
                          type="button"
                          onClick={() => {
                            setCashbackAplicado(false);
                            setCashbackValorUsado(0);
                          }}
                          className="text-[.72rem] font-semibold underline"
                        >
                          Remover
                        </button>
                      </span>
                      <span>-{formatarPreco(cashbackUsadoEfetivo)}</span>
                    </div>
                  )}
                  {cashbackEstimado > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Cashback a receber (apos 12 horas da compra)</span>
                      <span>{formatarPreco(cashbackEstimado)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-2.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setResumoAberto((v) => !v)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronDown size={14} className={`text-neutral-400 transition-transform ${resumoAberto ? "" : "rotate-180"}`} />
                  <span className="text-[.72rem] text-neutral-500">Total da compra</span>
                </button>
                <span className="text-[.86rem] font-bold text-neutral-900">{formatarPreco(total)}</span>
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
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 sm:max-w-md">
          <div className="flex items-center justify-between border-b border-neutral-100 p-4">
            <DialogTitle className="text-[1rem] font-bold text-neutral-900">Endereco de Entrega</DialogTitle>
            <button type="button" onClick={() => setEnderecoModalAberto(false)} className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
              ×
            </button>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            {perfil.geoAtivo && !geoDispensado && (
              <div className="border-b border-neutral-100 pb-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[.86rem] font-bold text-neutral-900">Usar minha localizacao atual?</p>
                    <p className="mt-0.5 text-[.76rem] text-neutral-500">
                      Preenchemos o endereco automaticamente, voce so confirma o numero.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={buscandoLocalizacao}
                    onClick={usarLocalizacaoAtual}
                    className="shrink-0 rounded-full px-3.5 py-1.5 text-[.78rem] font-bold text-white disabled:opacity-70"
                    style={{ background: brown }}
                  >
                    {buscandoLocalizacao ? "Buscando..." : "Usar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeoDispensado(true)}
                    className="shrink-0 text-neutral-400 hover:text-neutral-600"
                  >
                    ×
                  </button>
                </div>
                {geoErro && <p className="mt-1.5 text-[.74rem] text-red-600">{geoErro}</p>}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} onBlur={buscarCep} placeholder="CEP" inputMode="numeric" className={fieldClass()} />
              {buscandoCep && <Loader2 size={16} className="shrink-0 animate-spin text-neutral-400" />}
            </div>
            <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Rua/Avenida" className={fieldClass()} />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
                list={perfil.taxaEntregaTipo === "bairro" ? "storeListaBairros" : undefined}
                className={fieldClass()}
              />
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className={fieldClass()} />
            </div>
            {perfil.taxaEntregaTipo === "bairro" && (
              <datalist id="storeListaBairros">
                {Object.keys(perfil.taxasBairro).map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            )}
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

            {bairroNaoAtendido ? (
              <p className="text-[.78rem] text-red-600">Bairro fora da area de entrega. Entre em contato conosco.</p>
            ) : (
              taxaInfo && (
                <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[.78rem] ${taxaInfo.gratis ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                  <Bike size={15} className="shrink-0" />
                  <span>{taxaInfo.texto}</span>
                </div>
              )
            )}
          </div>
          <div className="border-t border-neutral-100 p-4">
            {bairroNaoAtendido && wppNum ? (
              <a
                href={`https://wa.me/55${wppNum}?text=${encodeURIComponent("Olá! Meu bairro não está na área de entrega cadastrada, gostaria de combinar a forma de entrega do meu pedido.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-emerald-600 py-3.5 text-[.9rem] font-bold text-white transition-colors hover:bg-emerald-700"
              >
                <WhatsAppIcon size={18} />
                Falar no WhatsApp
              </a>
            ) : (
              <button
                type="button"
                disabled={!rua.trim() || !numero.trim() || (perfil.taxaEntregaTipo === "bairro" && (!bairro.trim() || bairroNaoAtendido))}
                onClick={confirmarEndereco}
                className="w-full rounded-[10px] py-3.5 text-[.9rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
                style={{
                  background:
                    !rua.trim() || !numero.trim() || (perfil.taxaEntregaTipo === "bairro" && (!bairro.trim() || bairroNaoAtendido)) ? "#c0a88a" : brown,
                }}
              >
                Proximo
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={trocoModalAberto} onOpenChange={setTrocoModalAberto}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-5 sm:max-w-md">
          <p className="text-[.9rem] leading-relaxed text-neutral-800">
            O total do seu pagamento em dinheiro é de <strong className="font-bold">{formatarPreco(total)}</strong>. Precisa de troco?
          </p>

          <div className="mt-4 space-y-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <span
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
                style={precisaTroco ? { borderColor: brown, background: brown } : { borderColor: "#ccc" }}
              >
                {precisaTroco && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="text-[.86rem] text-neutral-800">Sim</span>
              <input type="radio" name="precisaTroco" checked={precisaTroco} onChange={() => setPrecisaTroco(true)} className="sr-only" />
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <span
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
                style={!precisaTroco ? { borderColor: brown, background: brown } : { borderColor: "#ccc" }}
              >
                {!precisaTroco && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="text-[.86rem] text-neutral-800">Não</span>
              <input
                type="radio"
                name="precisaTroco"
                checked={!precisaTroco}
                onChange={() => {
                  setPrecisaTroco(false);
                  setTrocoPara("");
                }}
                className="sr-only"
              />
            </label>
          </div>

          {precisaTroco && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[.78rem] text-neutral-600">Informe o valor a ser pago</label>
              <input
                value={trocoPara}
                onChange={(e) => setTrocoPara(maskValorDigitado(e.target.value))}
                inputMode="decimal"
                placeholder="Troco para quanto? *"
                className={fieldClass()}
              />
              {trocoValorValido ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[.78rem] text-blue-700">
                  <Info size={14} className="shrink-0" />
                  Seu troco será de {formatarPreco(trocoValorNumerico - total)}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[.78rem] text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  O valor a ser pago precisa ser maior que o valor do pagamento em dinheiro
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={precisaTroco && !trocoValorValido}
              onClick={confirmarTroco}
              className="rounded-lg px-5 py-2.5 text-[.86rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
              style={{ background: precisaTroco && !trocoValorValido ? "#c0a88a" : brown }}
            >
              CONFIRMAR
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cashbackModalAberto} onOpenChange={setCashbackModalAberto}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-5 sm:max-w-md">
          <p className="text-[.92rem] font-bold text-neutral-900">Voce tem cashback disponivel! 🎉</p>
          <p className="mt-1.5 text-[.86rem] text-neutral-700">
            Total disponivel: <strong className="font-bold" style={{ color: brown }}>{formatarPreco(cashbackDisponivel)}</strong>
          </p>
          <p className="mt-3 text-[.84rem] text-neutral-700">Qual valor do cashback voce deseja utilizar nesse pedido?</p>

          <label className="mt-3 mb-1.5 block text-[.72rem] font-semibold tracking-wide text-neutral-500 uppercase">Valor</label>
          <input
            value={cashbackValorInput}
            onChange={(e) => setCashbackValorInput(maskValorDigitado(e.target.value))}
            inputMode="decimal"
            placeholder="0,00"
            className={fieldClass()}
          />
          {cashbackValorInput.trim() !== "" && !cashbackValorInputValido && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[.78rem] text-red-700">
              <AlertCircle size={14} className="shrink-0" />
              Valor maximo disponivel: {formatarPreco(cashbackDisponivel)}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setCashbackModalAberto(false)} className="rounded-lg px-4 py-2.5 text-[.84rem] font-semibold text-neutral-500">
              Agora nao
            </button>
            <button
              type="button"
              disabled={!cashbackValorInputValido}
              onClick={confirmarCashback}
              className="rounded-lg px-5 py-2.5 text-[.86rem] font-bold text-white transition-colors disabled:cursor-not-allowed"
              style={{ background: cashbackValorInputValido ? brown : "#c0a88a" }}
            >
              Usar
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
      className="flex w-full items-center justify-between rounded-xl border-[1.5px] p-4 text-left transition-colors"
      style={ativo ? { borderColor: brown, background: `${brown}0d` } : { borderColor: "#e5e7eb" }}
    >
      <div>
        <p className="text-[.9rem] font-bold text-neutral-900">{titulo}</p>
        <p className="mt-0.5 text-[.76rem] text-neutral-400">{sub}</p>
        {min > 0 && (
          <p className="mt-0.5 text-[.74rem] font-semibold" style={{ color: brown }}>
            Pedido minimo: {formatarPreco(min)}
          </p>
        )}
      </div>
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full border-2" style={ativo ? { borderColor: brown, background: brown } : { borderColor: "#ddd" }}>
        {ativo && <span className="size-2 rounded-full bg-white" />}
      </span>
    </button>
  );
}

