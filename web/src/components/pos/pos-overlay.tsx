"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/components/ordermanager/constants";
import type {
  PosCartItem,
  PosCatalogoResposta,
  PosClienteBusca,
  PosClienteStats,
  PosCombo,
  PosProduto,
  PosTipoPedido as PosTipoPedidoValor,
} from "@/lib/pos";
import type { CaixaResumoResposta } from "@/lib/caixa";
import { usePosCart } from "@/components/pos/use-pos-cart";
import { PosCatalog } from "@/components/pos/pos-catalog";
import { PosCartList } from "@/components/pos/pos-cart-list";
import { PosVariacaoDialog } from "@/components/pos/pos-variacao-dialog";
import { PosComboDialog } from "@/components/pos/pos-combo-dialog";
import { PosAvulsoDialog } from "@/components/pos/pos-avulso-dialog";
import { PosEditarItemDialog } from "@/components/pos/pos-editar-item-dialog";
import { PosClienteSection } from "@/components/pos/pos-cliente-section";
import { PosTipoPedido, type PosEndereco } from "@/components/pos/pos-tipo-pedido";
import { PosEnderecoCard } from "@/components/pos/pos-endereco-card";
import { PosAgendamentoCard } from "@/components/pos/pos-agendamento-card";
import { PosCupomField } from "@/components/pos/pos-cupom-field";
import { PosPagamentoPanel, type PosPagamentoDados } from "@/components/pos/pos-pagamento-panel";
import { PosCaixaGate } from "@/components/pos/pos-caixa-gate";

const ENDERECO_VAZIO: PosEndereco = { rua: "", numero: "", bairro: "", cidade: "", cep: "", complemento: "" };

function montarEnderecoTexto(e: PosEndereco): string {
  const partes: string[] = [];
  if (e.rua) partes.push(e.numero ? `${e.rua}, ${e.numero}` : e.rua);
  if (e.bairro) partes.push(`Bairro: ${e.bairro}`);
  if (e.cidade) partes.push(`Cidade: ${e.cidade}`);
  if (e.cep) partes.push(`CEP: ${e.cep}`);
  if (e.complemento) partes.push(`Complemento: ${e.complemento}`);
  return partes.join(" | ");
}

export function PosOverlay({ onFechar, adminPerfil }: { onFechar: () => void; adminPerfil: string }) {
  const cart = usePosCart();

  const [carregandoInicial, setCarregandoInicial] = useState(true);
  const [catalogo, setCatalogo] = useState<PosCatalogoResposta | null>(null);
  const [caixa, setCaixa] = useState<CaixaResumoResposta | null>(null);

  const [produtoVariacao, setProdutoVariacao] = useState<PosProduto | null>(null);
  const [comboAberto, setComboAberto] = useState<PosCombo | null>(null);
  const [avulsoAberto, setAvulsoAberto] = useState(false);
  const [itemEditando, setItemEditando] = useState<PosCartItem | null>(null);

  const [etapa, setEtapa] = useState<"resumo" | "pagamento">("resumo");

  const [cliente, setCliente] = useState<PosClienteBusca | null>(null);
  const [clienteStats, setClienteStats] = useState<PosClienteStats | null>(null);
  const [cashbackAtivo, setCashbackAtivo] = useState(true);
  const [tipoPedido, setTipoPedido] = useState<PosTipoPedidoValor>("retirada");
  const [endereco, setEndereco] = useState<PosEndereco>(ENDERECO_VAZIO);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [cupom, setCupom] = useState<{ codigo: string; valor: number } | null>(null);

  const [pagamentoDados, setPagamentoDados] = useState<PosPagamentoDados | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [taxaEntregaConfig, setTaxaEntregaConfig] = useState<{ tipo: string; gratis: boolean; valorFixo: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    Promise.all([
      fetch("/api/pos/catalogo").then((r) => r.json()),
      fetch("/api/cashcontrol/resumo").then((r) => r.json()),
      fetch("/api/settings/detalhe").then((r) => r.json()),
    ])
      .then(([cat, cx, cfg]) => {
        if (cat.ok) setCatalogo(cat);
        if (cx.ok) setCaixa(cx);
        if (cfg.ok) {
          setTaxaEntregaConfig({
            tipo: cfg.taxa_entrega.tipo,
            gratis: cfg.taxa_entrega.gratis,
            valorFixo: cfg.taxa_entrega.fixa.valor,
          });
        }
      })
      .finally(() => setCarregandoInicial(false));
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function abrirVariacaoOuAdicionar(produto: PosProduto) {
    setProdutoVariacao(produto);
  }

  function alterarQtdProduto(produto: PosProduto, delta: number) {
    const rowKey = `produto-${produto.id}`;
    const existente = cart.itens.find((i) => i.rowKey === rowKey);
    if (existente) {
      cart.alterarQtd(rowKey, existente.qtd + delta);
    } else if (delta > 0) {
      cart.adicionar({
        rowKey,
        produtoId: produto.id,
        nome: produto.nome,
        qtd: 1,
        preco: produto.preco_promocional ?? produto.preco,
        observacoes: "",
        usarPontos: false,
      });
    }
  }

  // Preview client-side so o total submetido bate com o que o servidor recalcula.
  // So cobre o modo "fixa" (sem CEP/distancia no MVP) — nos modos bairro/dinamica o
  // servidor ainda recalcula a taxa real, mas o preview aqui fica 0 (limitacao conhecida
  // do MVP, ja sinalizada no plano: modal de endereco completo com CEP fica pra depois).
  const taxaEntrega =
    tipoPedido === "entrega" && taxaEntregaConfig && !taxaEntregaConfig.gratis && taxaEntregaConfig.tipo === "fixa"
      ? taxaEntregaConfig.valorFixo
      : 0;

  const totalResumo = Math.max(0, cart.subtotal + taxaEntrega - (cupom?.valor ?? 0));

  function irParaPagamento() {
    if (!cliente) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (cart.itens.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }
    if (tipoPedido === "entrega" && !endereco.rua.trim()) {
      toast.error("Informe o endereço de entrega.");
      return;
    }
    setEtapa("pagamento");
  }

  async function finalizarPedido() {
    if (!pagamentoDados || !cliente) return;

    setFinalizando(true);
    try {
      const itensPayload = cart.itens.map((i) => ({
        id: i.produtoId,
        nome: i.nome,
        qtd: i.qtd,
        preco: i.preco,
        observacoes: i.observacoes,
        usar_pontos: i.usarPontos ? 1 : 0,
        ...(i.combosels ? { combosels: i.combosels } : {}),
      }));

      const res = await fetch("/api/pos/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: cliente.id,
          tipo: tipoPedido,
          endereco: tipoPedido === "entrega" ? montarEnderecoTexto(endereco) : "",
          distancia_km: 0,
          itens: JSON.stringify(itensPayload),
          taxa_entrega: taxaEntrega,
          taxa_editada: "0",
          pagamento: pagamentoDados.pagamentos[0]?.forma ?? "dinheiro",
          pagamentos: JSON.stringify(pagamentoDados.pagamentos),
          pagamento_dividido: pagamentoDados.pagamentoDividido ? "1" : "0",
          valor_pago: String(pagamentoDados.valorPago),
          cupom: cupom?.codigo ?? "",
          desconto_tipo: pagamentoDados.descontoTipo,
          desconto_valor: pagamentoDados.descontoValor,
          taxa_maquininha_percent: 0,
          cashback_aplicado: cashbackAtivo ? "1" : "0",
          cashback_usado: pagamentoDados.cashbackUsado,
          observacoes_cliente: cpfCnpj.trim() ? `CPF/CNPJ na nota: ${cpfCnpj.trim()}` : "",
          caixa_id: caixa?.caixa?.id ?? null,
          offline_uuid: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao finalizar pedido.");
        return;
      }
      toast.success(`Pedido #${data.pedido_id} criado com sucesso!`);
      cart.limpar();
      setCliente(null);
      setClienteStats(null);
      setCpfCnpj("");
      setCupom(null);
      setEndereco(ENDERECO_VAZIO);
      setEtapa("resumo");
      onFechar();
    } catch {
      toast.error("Erro ao finalizar pedido.");
    } finally {
      setFinalizando(false);
    }
  }

  const caixaAberto = caixa?.caixa?.status === "aberto";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px] animate-in fade-in duration-200 sm:p-6">
      <div className="flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-3xl bg-background shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        <header className="flex shrink-0 items-center justify-between border-b bg-card px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">Lançar pedido no balcão</div>
              {caixaAberto ? (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Caixa aberto
                </div>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onFechar}>
            <X className="size-4.5" />
          </Button>
        </header>

        {carregandoInicial ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
        ) : !caixaAberto ? (
          <PosCaixaGate onAberto={() => fetch("/api/cashcontrol/resumo").then((r) => r.json()).then((d) => d.ok && setCaixa(d))} />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
            <div className="min-h-0 border-b p-4 lg:border-b-0 lg:border-r">
              {catalogo ? (
                <PosCatalog
                  catalogo={catalogo}
                  itensCarrinho={cart.itens}
                  onAdicionarProduto={abrirVariacaoOuAdicionar}
                  onAlterarQtdProduto={alterarQtdProduto}
                  onAbrirCombo={setComboAberto}
                  onAbrirAvulso={() => setAvulsoAberto(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Erro ao carregar catálogo.</div>
              )}
            </div>

            <div className="flex min-h-0 flex-col overflow-y-auto p-4">
              {etapa === "resumo" ? (
                <div className="space-y-3">
                  <PosTipoPedido tipo={tipoPedido} onTipoChange={setTipoPedido} />
                  <PosAgendamentoCard />
                  <PosClienteSection
                    cliente={cliente}
                    onClienteChange={setCliente}
                    onStatsChange={setClienteStats}
                    cashbackAtivo={cashbackAtivo}
                    onCashbackAtivoChange={setCashbackAtivo}
                  />
                  {tipoPedido === "entrega" ? (
                    <PosEnderecoCard endereco={endereco} onEnderecoChange={setEndereco} taxaEntrega={taxaEntrega} />
                  ) : null}

                  <PosCartList itens={cart.itens} onEditar={setItemEditando} onRemover={cart.remover} />

                  <div className="space-y-1 border-t pt-2.5 text-sm">
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
                    <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
                      <span>Total</span>
                      <span>{formatBRL(totalResumo)}</span>
                    </div>
                  </div>

                  <PosCupomField
                    subtotal={cart.subtotal}
                    taxaEntrega={taxaEntrega}
                    tipoPedido={tipoPedido}
                    clienteId={cliente?.id ?? null}
                    cupom={cupom}
                    onCupomChange={setCupom}
                  />

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Adicionar CPF/CNPJ na nota (NFC-e)?</Label>
                    <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} className="h-11 rounded-xl text-sm" />
                  </div>

                  <Button
                    className="h-12 w-full rounded-xl text-sm"
                    onClick={irParaPagamento}
                    disabled={cart.itens.length === 0 || !cliente}
                  >
                    Continuar
                  </Button>
                </div>
              ) : (
                <PosPagamentoPanel
                  subtotal={cart.subtotal}
                  taxaEntrega={taxaEntrega}
                  cupom={cupom}
                  podeAplicarDesconto={adminPerfil === "admin" || adminPerfil === "gerente"}
                  clienteStats={clienteStats}
                  onDadosChange={(dados) => setPagamentoDados(dados)}
                  onVoltar={() => setEtapa("resumo")}
                  onFinalizar={finalizarPedido}
                  finalizando={finalizando}
                  desabilitado={cart.itens.length === 0 || !cliente}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <PosVariacaoDialog
        produto={produtoVariacao}
        onOpenChange={(v) => !v && setProdutoVariacao(null)}
        onAdicionar={(item) => cart.adicionar(item)}
      />
      <PosComboDialog combo={comboAberto} onOpenChange={(v) => !v && setComboAberto(null)} onAdicionar={(item) => cart.adicionar(item)} />
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
