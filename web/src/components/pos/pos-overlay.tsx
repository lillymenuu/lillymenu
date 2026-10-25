"use client";

import { useEffect, useState } from "react";
import { X, ShoppingBag, Copy, Coins, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatarCpfCnpj, validarCpfCnpj } from "@/lib/cpfCnpj";
import { PosCatalog } from "@/components/pos/pos-catalog";
import { PosCartList } from "@/components/pos/pos-cart-list";
import { PosVariacaoDialog } from "@/components/pos/pos-variacao-dialog";
import { consumoDoCarrinho } from "@/components/pos/estoque-carrinho";
import { PosComboDialog } from "@/components/pos/pos-combo-dialog";
import { PosAvulsoDialog } from "@/components/pos/pos-avulso-dialog";
import { PosEditarItemDialog } from "@/components/pos/pos-editar-item-dialog";
import { PosClienteSection } from "@/components/pos/pos-cliente-section";
import { PosTipoPedido } from "@/components/pos/pos-tipo-pedido";
import { PosEnderecoCard } from "@/components/pos/pos-endereco-card";
import { PosEntregaDialog } from "@/components/pos/pos-entrega-dialog";
import { PosAgendamentoCard } from "@/components/pos/pos-agendamento-card";
import { PosAgendamentoDialog } from "@/components/pos/pos-agendamento-dialog";
import { PosCupomField } from "@/components/pos/pos-cupom-field";
import { PosPagamentoPanel } from "@/components/pos/pos-pagamento-panel";
import { PosCashbackDialog } from "@/components/pos/pos-cashback-dialog";
import { PosCaixaGate } from "@/components/pos/pos-caixa-gate";
import { PosImpressaoToggle } from "@/components/pos/pos-impressao-toggle";
import { ENDERECO_VAZIO, usePosPedido } from "@/components/pos/use-pos-pedido";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Relogio ao vivo do cabecalho — le direto os campos locais do Date (sem
// passar por string/Date parsing), entao usa o fuso que o navegador do
// operador ja estiver configurado, sem ambiguidade nenhuma.
function formatAgora(d: Date): string {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = MESES_ABREV[d.getMonth()];
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia} - ${mes} - ${d.getFullYear()}, ${hora}:${min}`;
}

export function PosOverlay({
  onFechar,
  adminPerfil,
  phpAdminUrl,
  pedidoEditandoId,
  agendamentoPrefillData,
}: {
  onFechar: () => void;
  adminPerfil: string;
  phpAdminUrl: string;
  pedidoEditandoId?: number | null;
  agendamentoPrefillData?: string | null;
}) {
  const {
    cart,
    carregandoInicial,
    catalogo,
    caixaAberto,
    recarregarCaixa,
    produtoVariacao,
    setProdutoVariacao,
    itemVariacaoEditando,
    setItemVariacaoEditando,
    comboAberto,
    setComboAberto,
    comboItemEditando,
    setComboItemEditando,
    avulsoAberto,
    setAvulsoAberto,
    itemEditando,
    setItemEditando,
    etapa,
    setEtapa,
    cliente,
    setCliente,
    clienteStats,
    setClienteStats,
    cashbackAtivo,
    setCashbackAtivo,
    tipoPedido,
    endereco,
    setEndereco,
    cupom,
    setCupom,
    setPagamentoDados,
    finalizando,
    pagamentoConfig,
    temCupomDisponivel,
    entregaModalAberto,
    setEntregaModalAberto,
    setTaxaEntregaCalculada,
    agendamento,
    setAgendamento,
    agendamentoModalAberto,
    setAgendamentoModalAberto,
    lojaLink,
    lojaLogo,
    pedidoEditandoCodigo,
    temItemComboNaEdicao,
    pagamentoValoresIniciais,
    setCashbackUsarValor,
    cashbackModalAberto,
    setCashbackModalAberto,
    cpfCnpjNota,
    setCpfCnpjNota,
    abrirVariacaoOuAdicionar,
    editarItemCarrinho,
    restanteDoProduto,
    alterarQtdProduto,
    definirQtdProduto,
    taxaEntrega,
    cashbackResumoNum,
    totalResumo,
    agendamentoCfgAtual,
    onTipoPedidoChange,
    irParaPagamento,
    finalizarPedido,
    copiarLojaLink,
  } = usePosPedido({ pedidoEditandoId, agendamentoPrefillData, onConcluido: onFechar });

  const [telaCheia, setTelaCheia] = useState(false);

  /* Tela cheia no <html>, nao so no overlay: os modais do PDV (Dialog/base-ui) sao
     renderizados via portal em document.body — se so o overlay entrasse em tela cheia,
     esses modais (fora da subarvore do elemento em fullscreen) ficariam escondidos atras dele. */
  useEffect(() => {
    function onFullscreenChange() {
      setTelaCheia(document.fullscreenElement !== null);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function alternarTelaCheia() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    setAgora(new Date());
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div
      onKeyDown={(e) => e.key === "Escape" && !document.fullscreenElement && onFechar()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-[2px] animate-in fade-in duration-200 sm:p-4"
    >
      <div className="flex h-full w-full max-w-[1680px] flex-col overflow-hidden rounded-3xl bg-background shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <header className="flex shrink-0 items-center justify-between border-b bg-card px-5 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="size-3" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">
                {pedidoEditandoCodigo ? `Editar pedido #${pedidoEditandoCodigo}` : "Lançar pedido no balcão"}
              </div>
              {caixaAberto ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Caixa aberto
                  {agora ? <span>· {formatAgora(agora)}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lojaLink ? (
              <div className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1">
                <span className="max-w-40 truncate text-xs text-muted-foreground sm:max-w-56">{lojaLink}</span>
                <button
                  type="button"
                  onClick={copiarLojaLink}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Copiar link da loja"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
            ) : null}
            <PosImpressaoToggle phpAdminUrl={phpAdminUrl} />
            <Button
              variant="ghost"
              size="icon"
              onClick={alternarTelaCheia}
              aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
              title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            >
              {telaCheia ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onFechar}>
              <X className="size-4.5" />
            </Button>
          </div>
        </header>

        {carregandoInicial ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
        ) : !caixaAberto ? (
          <PosCaixaGate
            logo={lojaLogo}
            phpAdminUrl={phpAdminUrl}
            onAberto={recarregarCaixa}
          />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
            <div className="min-h-0 min-w-0 border-b bg-muted/60 p-4 lg:border-b-0 lg:border-r">
              {catalogo ? (
                <PosCatalog
                  catalogo={catalogo}
                  itensCarrinho={cart.itens}
                  onAdicionarProduto={abrirVariacaoOuAdicionar}
                  onAlterarQtdProduto={alterarQtdProduto}
                  onDefinirQtdProduto={definirQtdProduto}
                  onAbrirCombo={setComboAberto}
                  onAbrirAvulso={() => setAvulsoAberto(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Erro ao carregar catálogo.</div>
              )}
            </div>

            <div className="flex min-h-0 min-w-0 flex-col">
              <div className="scrollbar-hidden min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pt-2 pb-4">
                {temItemComboNaEdicao ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                    Este pedido tem um item de combo — a composição original (quais componentes) não pôde ser
                    restaurada no carrinho. Revise os itens antes de salvar.
                  </div>
                ) : null}
                <PosTipoPedido tipo={tipoPedido} onTipoChange={onTipoPedidoChange} />
                {tipoPedido !== null ? (
                  <>
                    {agendamentoCfgAtual?.ativo ? (
                      <PosAgendamentoCard
                        valor={agendamento}
                        onAbrir={() => setAgendamentoModalAberto(true)}
                        onLimpar={() => setAgendamento(null)}
                      />
                    ) : null}
                    <PosClienteSection
                      cliente={cliente}
                      onClienteChange={setCliente}
                      onStatsChange={setClienteStats}
                      cashbackAtivo={cashbackAtivo}
                      onCashbackAtivoChange={setCashbackAtivo}
                    />
                    {tipoPedido === "entrega" ? (
                      <PosEnderecoCard
                        endereco={endereco}
                        onLimpar={() => {
                          setEndereco(ENDERECO_VAZIO);
                          setTaxaEntregaCalculada(null);
                        }}
                        onAbrir={() => setEntregaModalAberto(true)}
                        taxaEntrega={taxaEntrega}
                      />
                    ) : null}

                    <PosCartList itens={cart.itens} onEditar={editarItemCarrinho} onRemover={cart.remover} />
                  </>
                ) : null}
              </div>

              {tipoPedido !== null ? (
                <div className="shrink-0 space-y-3 bg-card p-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatBRL(cart.subtotal)}</span>
                    </div>
                    {taxaEntrega > 0 ? (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa de entrega</span>
                        <span>{formatBRL(taxaEntrega)}</span>
                      </div>
                    ) : null}
                    {cashbackResumoNum > 0 ? (
                      <div className="flex justify-between text-emerald-600">
                        <span>Cashback usado</span>
                        <span>-{formatBRL(cashbackResumoNum)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total</span>
                      <span>{formatBRL(totalResumo)}</span>
                    </div>
                  </div>

                  {temCupomDisponivel ? (
                    <PosCupomField
                      subtotal={cart.subtotal}
                      taxaEntrega={taxaEntrega}
                      tipoPedido={tipoPedido}
                      clienteId={cliente?.id ?? null}
                      cupom={cupom}
                      onCupomChange={setCupom}
                    />
                  ) : null}

                  {clienteStats && (clienteStats.cashback ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCashbackModalAberto(true)}
                      className="flex w-full items-center gap-1.5 rounded-full bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Coins className="size-3.5 text-amber-600" />
                      {cashbackResumoNum > 0 ? (
                        <>
                          Cashback de <span className="text-primary">{formatBRL(cashbackResumoNum)}</span> aplicado · editar
                        </>
                      ) : (
                        <>
                          Usar cashback disponível de <span className="text-primary">{formatBRL(clienteStats.cashback ?? 0)}</span>
                        </>
                      )}
                    </button>
                  ) : null}

                  <PosCashbackDialog
                    open={cashbackModalAberto}
                    onOpenChange={setCashbackModalAberto}
                    saldoDisponivel={clienteStats?.cashback ?? 0}
                    validoAte={clienteStats?.cashback_valido_ate}
                    valorInicial={cashbackResumoNum}
                    onConfirmar={setCashbackUsarValor}
                  />

                  {catalogo?.nfceDisponivel ? (
                    <div>
                      <Input
                        value={cpfCnpjNota}
                        onChange={(e) => setCpfCnpjNota(formatarCpfCnpj(e.target.value))}
                        inputMode="numeric"
                        placeholder="Adicionar CPF/CNPJ na nota (NFC-e)?"
                        className="h-10 w-full rounded-full border-0 bg-muted/60 px-4 text-sm placeholder:text-xs placeholder:text-muted-foreground/70"
                      />
                      {cpfCnpjNota !== "" && !validarCpfCnpj(cpfCnpjNota) ? <p className="mt-1 text-[11px] text-destructive">CPF/CNPJ inválido.</p> : null}
                    </div>
                  ) : null}

                  <Button
                    className="h-12 w-full rounded-xl text-sm"
                    onClick={irParaPagamento}
                    disabled={cart.itens.length === 0 || !cliente}
                  >
                    Continuar
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <Dialog open={etapa === "pagamento"} onOpenChange={(v) => !v && setEtapa("resumo")}>
        <DialogContent className="max-h-[90vh] min-h-[560px] max-w-[450px] overflow-y-auto rounded-3xl sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Registre o pagamento do pedido</DialogTitle>
          </DialogHeader>
          <PosPagamentoPanel
            subtotal={cart.subtotal}
            taxaEntrega={taxaEntrega}
            cupom={cupom}
            podeAplicarDesconto={adminPerfil === "admin" || adminPerfil === "gerente"}
            clienteStats={clienteStats}
            valoresIniciais={pagamentoValoresIniciais}
            cashbackAplicado={cashbackResumoNum}
            fiadoAtivo={pagamentoConfig.fiadoAtivo}
            taxaCredito={pagamentoConfig.taxaCredito}
            taxaDebito={pagamentoConfig.taxaDebito}
            taxaVoucher={pagamentoConfig.taxaVoucher}
            onDadosChange={(dados) => setPagamentoDados(dados)}
            onFinalizar={finalizarPedido}
            finalizando={finalizando}
            desabilitado={cart.itens.length === 0 || !cliente}
          />
        </DialogContent>
      </Dialog>

      <PosEntregaDialog
        open={entregaModalAberto}
        onOpenChange={setEntregaModalAberto}
        cliente={cliente}
        endereco={endereco}
        taxaEntregaAtual={taxaEntrega}
        onConfirmar={(dados) => {
          setCliente(dados.cliente);
          setEndereco(dados.endereco);
          setTaxaEntregaCalculada(dados.taxaEntrega);
        }}
      />

      {agendamentoCfgAtual?.ativo ? (
        <PosAgendamentoDialog
          open={agendamentoModalAberto}
          onOpenChange={setAgendamentoModalAberto}
          cfg={agendamentoCfgAtual}
          valorAtual={agendamento}
          onConfirmar={setAgendamento}
        />
      ) : null}

      <PosVariacaoDialog
        produto={produtoVariacao}
        itemEditando={itemVariacaoEditando}
        estoqueDisponivel={produtoVariacao ? restanteDoProduto(produtoVariacao, itemVariacaoEditando?.rowKey) : 0}
        onOpenChange={(v) => {
          if (!v) {
            setProdutoVariacao(null);
            setItemVariacaoEditando(null);
          }
        }}
        onAdicionar={(item) => cart.adicionar(item)}
        onSalvar={(rowKey, item) => cart.atualizarItem(rowKey, item)}
      />
      <PosComboDialog
        combo={comboAberto}
        itemEditando={comboItemEditando}
        consumoCarrinho={consumoDoCarrinho(cart.itens, comboItemEditando?.rowKey)}
        onOpenChange={(v) => {
          if (!v) {
            setComboAberto(null);
            setComboItemEditando(null);
          }
        }}
        onAdicionar={(item) => cart.adicionar(item)}
        onSalvar={(rowKey, item) => cart.atualizarItem(rowKey, item)}
      />
      <PosAvulsoDialog open={avulsoAberto} onOpenChange={setAvulsoAberto} onAdicionar={(item) => cart.adicionar(item)} />
      <PosEditarItemDialog
        item={itemEditando}
        onOpenChange={(v) => !v && setItemEditando(null)}
        onSalvar={(rowKey, qtd, observacoes) => {
          cart.alterarQtd(rowKey, qtd);
          cart.alterarObservacoes(rowKey, observacoes);
        }}
      />
    </div>
  );
}
