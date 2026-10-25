"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Coins,
  Layers,
  Minus,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "cn";
import { formatBRL } from "@/components/ordermanager/constants";
import { formatarCpfCnpj, validarCpfCnpj } from "@/lib/cpfCnpj";
import { PRODUTO_IMAGEM_PADRAO } from "@/lib/produtoImagem";
import type { PosCartItem, PosCombo, PosProduto } from "@/lib/pos";
import { consumoDoCarrinho, estoqueRestanteProduto } from "@/components/pos/estoque-carrinho";
import { PosVariacaoDialog } from "@/components/pos/pos-variacao-dialog";
import { PosComboDialog } from "@/components/pos/pos-combo-dialog";
import { PosAvulsoDialog } from "@/components/pos/pos-avulso-dialog";
import { PosEditarItemDialog } from "@/components/pos/pos-editar-item-dialog";
import { PosClienteSection } from "@/components/pos/pos-cliente-section";
import { TIPOS_PEDIDO } from "@/components/pos/pos-tipo-pedido";
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

const SEM_CATEGORIA = -1;

type Tela = "cardapio" | "carrinho" | "detalhes";

/* Rodape fixo: respeita a barra de gestos do iPhone/Android (safe-area). */
const RODAPE = "shrink-0 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";

function vibrar() {
  navigator.vibrate?.(8);
}

/* PDV do balcao no formato de app de celular — mesma regra de negocio do PDV de computador
   (usePosPedido), so o layout muda: cardapio > carrinho > detalhes > pagamento, uma tela por vez.
   Aberto pelo PosOverlayProvider quando a tela e estreita (ver pos-overlay-provider.tsx). */
export function PosMobile({
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
  const [telaEscolhida, setTela] = useState<Tela>("cardapio");
  const [pedidoCriado, setPedidoCriado] = useState<{ codigo: number | string | null } | null>(null);

  const pos = usePosPedido({
    pedidoEditandoId,
    agendamentoPrefillData,
    onConcluido: (r) => (pedidoEditandoId ? onFechar() : setPedidoCriado(r)),
  });
  const { cart, catalogo, cliente, clienteStats } = pos;

  /* Enquanto o PDV mobile esta aberto, os modais (variacao, combo, cliente...) abrem como
     bottom sheet — ver ".pos-mobile" em globals.css. */
  useEffect(() => {
    document.documentElement.classList.add("pos-mobile");
    return () => document.documentElement.classList.remove("pos-mobile");
  }, []);

  const qtdItens = cart.itens.reduce((s, i) => s + i.qtd, 0);
  const emPagamento = pos.etapa === "pagamento";
  /* Carrinho esvaziado nas telas seguintes: volta pro cardapio. */
  const tela = cart.itens.length === 0 && !emPagamento ? "cardapio" : telaEscolhida;

  function novoPedido() {
    pos.setTipoPedido(null);
    pos.setCashbackAtivo(true);
    pos.setCashbackUsarValor(0);
    pos.setCpfCnpjNota("");
    pos.setPagamentoDados(null);
    setPedidoCriado(null);
    setTela("cardapio");
  }

  function voltar() {
    if (emPagamento) pos.setEtapa("resumo");
    else if (tela === "detalhes") setTela("carrinho");
    else if (tela === "carrinho") setTela("cardapio");
    else onFechar();
  }

  const titulo = pos.pedidoEditandoCodigo
    ? `Editar pedido #${pos.pedidoEditandoCodigo}`
    : emPagamento
      ? "Pagamento"
      : tela === "carrinho"
        ? "Seu pedido"
        : tela === "detalhes"
          ? "Detalhes do pedido"
          : "Novo pedido";

  const passoAtual = emPagamento ? 3 : tela === "detalhes" ? 2 : tela === "carrinho" ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background">
      {/* Barra do app */}
      <header className="flex shrink-0 items-center gap-1 border-b bg-background px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-1">
        <button
          type="button"
          onClick={voltar}
          aria-label={tela === "cardapio" && !emPagamento ? "Fechar" : "Voltar"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted"
        >
          {tela === "cardapio" && !emPagamento ? <X className="size-5" /> : <ArrowLeft className="size-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-tight font-semibold">{titulo}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {pos.caixaAberto ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-500" /> Caixa aberto · Balcão
              </>
            ) : (
              "Balcão"
            )}
          </div>
        </div>
        <PosImpressaoToggle phpAdminUrl={phpAdminUrl} />
      </header>

      {pos.carregandoInicial ? (
        <CarregandoCardapio />
      ) : !pos.caixaAberto ? (
        <PosCaixaGate logo={pos.lojaLogo} phpAdminUrl={phpAdminUrl} onAberto={pos.recarregarCaixa} />
      ) : !catalogo ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
          Não foi possível carregar o cardápio.
        </div>
      ) : (
        <>
          {passoAtual > 0 ? <Passos atual={passoAtual} /> : null}

          {emPagamento ? (
            <div key="pagamento" className="min-h-0 flex-1 animate-in overflow-y-auto px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] duration-200 fade-in slide-in-from-right-6">
              <PosPagamentoPanel
                subtotal={cart.subtotal}
                taxaEntrega={pos.taxaEntrega}
                cupom={pos.cupom}
                podeAplicarDesconto={adminPerfil === "admin" || adminPerfil === "gerente"}
                clienteStats={clienteStats}
                valoresIniciais={pos.pagamentoValoresIniciais}
                cashbackAplicado={pos.cashbackResumoNum}
                fiadoAtivo={pos.pagamentoConfig.fiadoAtivo}
                taxaCredito={pos.pagamentoConfig.taxaCredito}
                taxaDebito={pos.pagamentoConfig.taxaDebito}
                taxaVoucher={pos.pagamentoConfig.taxaVoucher}
                onDadosChange={(dados) => pos.setPagamentoDados(dados)}
                onFinalizar={pos.finalizarPedido}
                finalizando={pos.finalizando}
                desabilitado={cart.itens.length === 0 || !cliente}
              />
            </div>
          ) : tela === "cardapio" ? (
            <TelaCardapio pos={pos} qtdItens={qtdItens} onVerCarrinho={() => setTela("carrinho")} />
          ) : tela === "carrinho" ? (
            <TelaCarrinho pos={pos} onAdicionarMais={() => setTela("cardapio")} onContinuar={() => setTela("detalhes")} />
          ) : (
            <TelaDetalhes pos={pos} />
          )}
        </>
      )}

      {pedidoCriado ? (
        <TelaSucesso codigo={pedidoCriado.codigo} onNovoPedido={novoPedido} onFechar={onFechar} />
      ) : null}

      {/* Modais compartilhados com o PDV de computador */}
      <PosEntregaDialog
        open={pos.entregaModalAberto}
        onOpenChange={pos.setEntregaModalAberto}
        cliente={cliente}
        endereco={pos.endereco}
        taxaEntregaAtual={pos.taxaEntrega}
        onConfirmar={(dados) => {
          pos.setCliente(dados.cliente);
          pos.setEndereco(dados.endereco);
          pos.setTaxaEntregaCalculada(dados.taxaEntrega);
        }}
      />
      {pos.agendamentoCfgAtual?.ativo ? (
        <PosAgendamentoDialog
          open={pos.agendamentoModalAberto}
          onOpenChange={pos.setAgendamentoModalAberto}
          cfg={pos.agendamentoCfgAtual}
          valorAtual={pos.agendamento}
          onConfirmar={pos.setAgendamento}
        />
      ) : null}
      <PosCashbackDialog
        open={pos.cashbackModalAberto}
        onOpenChange={pos.setCashbackModalAberto}
        saldoDisponivel={clienteStats?.cashback ?? 0}
        validoAte={clienteStats?.cashback_valido_ate}
        valorInicial={pos.cashbackResumoNum}
        onConfirmar={pos.setCashbackUsarValor}
      />
      <PosVariacaoDialog
        produto={pos.produtoVariacao}
        itemEditando={pos.itemVariacaoEditando}
        estoqueDisponivel={pos.produtoVariacao ? pos.restanteDoProduto(pos.produtoVariacao, pos.itemVariacaoEditando?.rowKey) : 0}
        onOpenChange={(v) => {
          if (!v) {
            pos.setProdutoVariacao(null);
            pos.setItemVariacaoEditando(null);
          }
        }}
        onAdicionar={(item) => cart.adicionar(item)}
        onSalvar={(rowKey, item) => cart.atualizarItem(rowKey, item)}
      />
      <PosComboDialog
        combo={pos.comboAberto}
        itemEditando={pos.comboItemEditando}
        consumoCarrinho={consumoDoCarrinho(cart.itens, pos.comboItemEditando?.rowKey)}
        onOpenChange={(v) => {
          if (!v) {
            pos.setComboAberto(null);
            pos.setComboItemEditando(null);
          }
        }}
        onAdicionar={(item) => cart.adicionar(item)}
        onSalvar={(rowKey, item) => cart.atualizarItem(rowKey, item)}
      />
      <PosAvulsoDialog open={pos.avulsoAberto} onOpenChange={pos.setAvulsoAberto} onAdicionar={(item) => cart.adicionar(item)} />
      <PosEditarItemDialog
        item={pos.itemEditando}
        onOpenChange={(v) => !v && pos.setItemEditando(null)}
        onSalvar={(rowKey, qtd, observacoes) => {
          cart.alterarQtd(rowKey, qtd);
          cart.alterarObservacoes(rowKey, observacoes);
        }}
      />
    </div>
  );
}

type Pos = ReturnType<typeof usePosPedido>;

/* ---------------------------------------------------------------- Cardapio */

function TelaCardapio({ pos, qtdItens, onVerCarrinho }: { pos: Pos; qtdItens: number; onVerCarrinho: () => void }) {
  const catalogo = pos.catalogo!;
  const itens = pos.cart.itens;
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const secaoRefs = useRef<Record<number, HTMLElement | null>>({});
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const ignorarScrollSpy = useRef(false);

  const termo = busca.trim().toLowerCase();

  const qtdPorProduto = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itens) if (item.produtoId !== null && !item.comboId) map[item.produtoId] = (map[item.produtoId] ?? 0) + item.qtd;
    return map;
  }, [itens]);

  const qtdPorCombo = useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of itens) if (item.comboId) map[item.comboId] = (map[item.comboId] ?? 0) + item.qtd;
    return map;
  }, [itens]);

  const restantePorProduto = useMemo(() => {
    const consumo = consumoDoCarrinho(itens);
    const map: Record<number, number> = {};
    for (const p of catalogo.produtos) map[p.id] = Math.max(0, estoqueRestanteProduto(p, catalogo.produtos, consumo));
    return map;
  }, [catalogo.produtos, itens]);

  /* Mesmo agrupamento do PosCatalog: so produtos com estoque, sem-categoria no fim, busca por nome/codigo. */
  const secoes = useMemo(() => {
    const disponiveis = catalogo.produtos.filter((p) => p.estoque > 0);
    const grupos = catalogo.categorias.map((cat) => ({
      categoria: cat,
      produtos: disponiveis.filter((p) => p.categoria_id === cat.id),
      combos: catalogo.combos.filter((c) => c.categoria_id === cat.id),
    }));
    const semCategoria = {
      categoria: { id: SEM_CATEGORIA, nome: "Outros" },
      produtos: disponiveis.filter((p) => p.categoria_id === null),
      combos: catalogo.combos.filter((c) => c.categoria_id === null),
    };
    const todas = semCategoria.produtos.length + semCategoria.combos.length > 0 ? [...grupos, semCategoria] : grupos;
    return todas
      .map((g) =>
        termo
          ? {
              ...g,
              produtos: g.produtos.filter((p) => p.nome.toLowerCase().includes(termo) || (p.codigo ?? "").toLowerCase().includes(termo)),
              combos: g.combos.filter((c) => c.nome.toLowerCase().includes(termo)),
            }
          : g
      )
      .filter((g) => g.produtos.length + g.combos.length > 0);
  }, [catalogo, termo]);

  const ativa = categoriaAtiva ?? secoes[0]?.categoria.id ?? null;

  useEffect(() => {
    if (ativa === null) return;
    chipRefs.current[ativa]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [ativa]);

  function irParaSecao(id: number) {
    setCategoriaAtiva(id);
    const el = secaoRefs.current[id];
    const container = scrollRef.current;
    if (!el || !container) return;
    ignorarScrollSpy.current = true;
    container.scrollTo({ top: el.offsetTop - 4, behavior: "smooth" });
    setTimeout(() => (ignorarScrollSpy.current = false), 600);
  }

  function onScroll() {
    const container = scrollRef.current;
    if (!container || ignorarScrollSpy.current) return;
    const topo = container.getBoundingClientRect().top;
    let atual: number | null = null;
    for (const s of secoes) {
      const el = secaoRefs.current[s.categoria.id];
      if (el && el.getBoundingClientRect().top - topo <= 60) atual = s.categoria.id;
    }
    if (atual !== null && atual !== categoriaAtiva) setCategoriaAtiva(atual);
  }

  function tocarProduto(p: PosProduto) {
    if ((restantePorProduto[p.id] ?? 0) <= 0) return;
    vibrar();
    if (p.tem_variacoes) pos.abrirVariacaoOuAdicionar(p);
    else pos.alterarQtdProduto(p, 1);
  }

  return (
    <>
      <div className="shrink-0 space-y-2.5 border-b bg-background pt-3 pb-2.5">
        <div className="flex items-center gap-2 px-4">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código"
              enterKeyHint="search"
              className="h-11 w-full rounded-full bg-muted/70 pr-9 pl-10 text-base outline-none placeholder:text-sm placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            {busca ? (
              <button
                type="button"
                onClick={() => setBusca("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => pos.setAvulsoAberto(true)}
            className="flex h-11 shrink-0 items-center gap-1 rounded-full border px-3.5 text-sm font-medium text-foreground transition-colors active:bg-muted"
          >
            <Plus className="size-4" /> Avulso
          </button>
        </div>

        {secoes.length > 1 ? (
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-4">
            {secoes.map((s) => (
              <button
                key={s.categoria.id}
                ref={(el) => void (chipRefs.current[s.categoria.id] = el)}
                type="button"
                onClick={() => irParaSecao(s.categoria.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors",
                  ativa === s.categoria.id ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground active:bg-muted"
                )}
              >
                {s.categoria.nome}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {pos.temItemComboNaEdicao ? <AvisoComboEdicao /> : null}
        {secoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-16 text-center text-sm text-muted-foreground">
            <Search className="size-8 text-muted-foreground/40" />
            {termo ? <>Nada encontrado para &quot;{busca}&quot;.</> : "Nenhum produto disponível."}
          </div>
        ) : (
          secoes.map((s) => (
            <section key={s.categoria.id} ref={(el) => void (secaoRefs.current[s.categoria.id] = el)} className="pt-4">
              <h2 className="px-4 pb-1 text-base font-bold">{s.categoria.nome}</h2>
              <ul>
                {s.combos.map((c) => (
                  <ComboLinha key={`c-${c.id}`} combo={c} qtd={qtdPorCombo[c.id] ?? 0} onAbrir={() => { vibrar(); pos.setComboAberto(c); }} />
                ))}
                {s.produtos.map((p) => (
                  <ProdutoLinha
                    key={`p-${p.id}`}
                    produto={p}
                    qtd={qtdPorProduto[p.id] ?? 0}
                    restante={restantePorProduto[p.id] ?? p.estoque}
                    onTocar={() => tocarProduto(p)}
                    onAlterar={(delta) => { vibrar(); pos.alterarQtdProduto(p, delta); }}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
        <div className="h-6" />
      </div>

      {qtdItens > 0 ? (
        <div className={RODAPE}>
          <button
            type="button"
            onClick={onVerCarrinho}
            className="flex h-14 w-full animate-in items-center gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-lg shadow-primary/25 duration-200 fade-in slide-in-from-bottom-3 active:scale-[0.99]"
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-foreground/20 px-2 text-sm font-bold tabular-nums">
              {qtdItens}
            </span>
            <span className="flex-1 text-left text-[15px] font-semibold">Ver pedido</span>
            <span className="text-[15px] font-bold tabular-nums">{formatBRL(pos.cart.subtotal)}</span>
          </button>
        </div>
      ) : null}
    </>
  );
}

function ProdutoLinha({
  produto,
  qtd,
  restante,
  onTocar,
  onAlterar,
}: {
  produto: PosProduto;
  qtd: number;
  restante: number;
  onTocar: () => void;
  onAlterar: (delta: number) => void;
}) {
  const emPromo = produto.preco_promocional !== null;
  const esgotou = restante <= 0 && qtd === 0;
  const mostraStepper = qtd > 0 && !produto.tem_variacoes;

  return (
    <li className={cn("relative mx-4 flex gap-3 border-b border-border/60 py-3.5 last:border-b-0", esgotou && "opacity-50")}>
      <button type="button" onClick={onTocar} disabled={esgotou} className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold text-foreground">{produto.nome}</span>
        {produto.descricao ? <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{produto.descricao}</span> : null}
        <span className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-foreground">
            {produto.tem_variacoes ? <span className="text-xs font-medium text-muted-foreground">a partir de </span> : null}
            {formatBRL(produto.preco_promocional ?? produto.preco)}
          </span>
          {emPromo ? <span className="text-xs text-muted-foreground line-through">{formatBRL(produto.preco)}</span> : null}
        </span>
        <span className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", restante > 0 ? (restante <= 3 ? "text-amber-700" : "text-muted-foreground") : "text-destructive")}>
          {restante > 0 ? (restante <= 3 ? `Últimas ${restante} unidades` : `${restante} em estoque`) : (<><AlertCircle className="size-3" /> Sem estoque</>)}
        </span>
      </button>

      <div className="relative size-[92px] shrink-0">
        <button type="button" onClick={onTocar} disabled={esgotou} className="block size-full overflow-hidden rounded-2xl bg-muted" tabIndex={-1} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={produto.imagem || PRODUTO_IMAGEM_PADRAO} alt="" loading="lazy" className="size-full object-cover" />
        </button>
        {emPromo ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Promo</span>
        ) : null}

        {mostraStepper ? (
          <div className="absolute inset-x-1 -bottom-2 flex h-9 animate-in items-center justify-between rounded-full bg-background px-0.5 shadow-md ring-1 ring-border duration-150 zoom-in-90">
            <button type="button" onClick={() => onAlterar(-1)} aria-label={`Remover um ${produto.nome}`} className="flex size-8 items-center justify-center rounded-full text-primary active:bg-muted">
              {qtd === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-4" />}
            </button>
            <span className="text-sm font-bold tabular-nums">{qtd}</span>
            <button
              type="button"
              onClick={() => onAlterar(1)}
              disabled={restante <= 0}
              aria-label={`Adicionar um ${produto.nome}`}
              className="flex size-8 items-center justify-center rounded-full text-primary active:bg-muted disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onTocar}
            disabled={esgotou || restante <= 0}
            aria-label={`Adicionar ${produto.nome}`}
            className="absolute -right-1.5 -bottom-1.5 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform active:scale-90 disabled:opacity-40"
          >
            {qtd > 0 ? <span className="text-sm font-bold tabular-nums">{qtd}</span> : <Plus className="size-4.5" />}
          </button>
        )}
      </div>
    </li>
  );
}

function ComboLinha({ combo, qtd, onAbrir }: { combo: PosCombo; qtd: number; onAbrir: () => void }) {
  const emPromo = combo.preco_promocional !== null;
  return (
    <li className="relative mx-4 flex gap-3 border-b border-border/60 py-3.5 last:border-b-0">
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="flex items-center gap-1.5">
          <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{combo.nome}</span>
        </span>
        <span className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">Combo</span>
        <span className="mt-1.5 flex items-baseline gap-1.5">
          {combo.tipo_preco === "por_item" ? (
            <span className="text-[13px] font-semibold text-muted-foreground">Soma dos itens escolhidos</span>
          ) : (
            <>
              <span className="text-[15px] font-bold">{formatBRL(combo.preco_promocional ?? combo.preco)}</span>
              {emPromo ? <span className="text-xs text-muted-foreground line-through">{formatBRL(combo.preco)}</span> : null}
            </>
          )}
        </span>
      </button>
      <div className="relative size-[92px] shrink-0">
        <button type="button" onClick={onAbrir} tabIndex={-1} aria-hidden className="flex size-full items-center justify-center overflow-hidden rounded-2xl bg-muted text-muted-foreground/50">
          {combo.imagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={combo.imagem} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <Layers className="size-7" />
          )}
        </button>
        <button
          type="button"
          onClick={onAbrir}
          aria-label={`Montar ${combo.nome}`}
          className="absolute -right-1.5 -bottom-1.5 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform active:scale-90"
        >
          {qtd > 0 ? <span className="text-sm font-bold tabular-nums">{qtd}</span> : <Plus className="size-4.5" />}
        </button>
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- Carrinho */

function TelaCarrinho({ pos, onAdicionarMais, onContinuar }: { pos: Pos; onAdicionarMais: () => void; onContinuar: () => void }) {
  const { cart, catalogo } = pos;

  function maisUm(item: PosCartItem) {
    vibrar();
    /* Combo: a quantidade fica no proprio modal (ele valida o estoque de cada componente). */
    if (item.comboId) return pos.editarItemCarrinho(item);
    const produto = item.produtoId ? catalogo?.produtos.find((p) => p.id === item.produtoId) : undefined;
    if (produto && pos.restanteDoProduto(produto) <= 0) return;
    cart.alterarQtd(item.rowKey, item.qtd + 1);
  }

  function podeMaisUm(item: PosCartItem) {
    if (item.comboId) return true;
    const produto = item.produtoId ? catalogo?.produtos.find((p) => p.id === item.produtoId) : undefined;
    return !produto || pos.restanteDoProduto(produto) > 0;
  }

  return (
    <>
      <div key="carrinho" className="min-h-0 flex-1 animate-in overflow-y-auto overscroll-contain duration-200 fade-in slide-in-from-right-6">
        {pos.temItemComboNaEdicao ? <AvisoComboEdicao /> : null}
        <ul className="px-4">
          {cart.itens.map((item) => {
            const detalhe = item.combosels?.length
              ? item.combosels.map((s) => `${s.qtd}x ${s.nome}`).join(", ")
              : item.opcoesSnapshot?.length
                ? item.opcoesSnapshot.map((o) => o.nome).join(", ")
                : null;
            const obs = item.observacoes && !item.observacoes.startsWith("[combo]") ? item.observacoes : null;
            return (
              <li key={item.rowKey} className="flex gap-3 border-b border-border/60 py-4 last:border-b-0">
                <button type="button" onClick={() => pos.editarItemCarrinho(item)} className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted" aria-label={`Editar ${item.nome}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imagem || PRODUTO_IMAGEM_PADRAO} alt="" className="size-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => pos.editarItemCarrinho(item)} className="block w-full text-left">
                    <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{item.nome}</span>
                    {detalhe ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{detalhe}</span> : null}
                    {obs ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">Obs.: {obs}</span> : null}
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold tabular-nums">{formatBRL(item.preco * item.qtd)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => pos.editarItemCarrinho(item)}
                        aria-label={`Editar ${item.nome}`}
                        className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-muted"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <div className="flex h-9 items-center rounded-full border">
                        <button
                          type="button"
                          onClick={() => { vibrar(); cart.alterarQtd(item.rowKey, item.qtd - 1); }}
                          aria-label={item.qtd === 1 ? `Remover ${item.nome}` : "Diminuir quantidade"}
                          className="flex size-9 items-center justify-center rounded-full text-primary active:bg-muted"
                        >
                          {item.qtd === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                        </button>
                        <span className="w-6 text-center text-sm font-bold tabular-nums">{item.qtd}</span>
                        <button
                          type="button"
                          onClick={() => maisUm(item)}
                          disabled={!podeMaisUm(item)}
                          aria-label="Aumentar quantidade"
                          className="flex size-9 items-center justify-center rounded-full text-primary active:bg-muted disabled:opacity-30"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="px-4 pt-1 pb-6">
          <button
            type="button"
            onClick={onAdicionarMais}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-semibold text-primary active:bg-muted"
          >
            <Plus className="size-4" /> Adicionar mais itens
          </button>
        </div>
      </div>

      <div className={RODAPE}>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold tabular-nums">{formatBRL(cart.subtotal)}</span>
        </div>
        <BotaoPrincipal onClick={onContinuar}>
          Continuar <ChevronRight className="size-5" />
        </BotaoPrincipal>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Detalhes */

function TelaDetalhes({ pos }: { pos: Pos }) {
  const { cart, tipoPedido, cliente, clienteStats } = pos;
  const cpfInvalido = pos.cpfCnpjNota !== "" && !validarCpfCnpj(pos.cpfCnpjNota);

  return (
    <>
      <div key="detalhes" className="min-h-0 flex-1 animate-in space-y-6 overflow-y-auto overscroll-contain px-4 pt-4 pb-6 duration-200 fade-in slide-in-from-right-6">
        <section>
          <h2 className="mb-2.5 text-sm font-bold">Como será o pedido?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {TIPOS_PEDIDO.map((opcao) => {
              const ativo = tipoPedido === opcao.valor;
              const Icon = opcao.icon;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => { vibrar(); pos.onTipoPedidoChange(opcao.valor); }}
                  aria-pressed={ativo}
                  className={cn(
                    "relative flex h-[72px] flex-col items-start justify-between rounded-2xl border-[1.5px] p-3 text-left text-sm font-semibold transition-colors",
                    ativo ? "border-primary bg-primary/5 text-primary" : "text-foreground active:bg-muted"
                  )}
                >
                  <Icon className="size-5" />
                  {opcao.label}
                  {ativo ? (
                    <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {tipoPedido !== null ? (
          <>
            <section className="space-y-2.5">
              <h2 className="text-sm font-bold">Cliente</h2>
              <PosClienteSection
                cliente={cliente}
                onClienteChange={pos.setCliente}
                onStatsChange={pos.setClienteStats}
                cashbackAtivo={pos.cashbackAtivo}
                onCashbackAtivoChange={pos.setCashbackAtivo}
              />
            </section>

            {tipoPedido === "entrega" ? (
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold">Entrega</h2>
                <PosEnderecoCard
                  endereco={pos.endereco}
                  onLimpar={() => {
                    pos.setEndereco(ENDERECO_VAZIO);
                    pos.setTaxaEntregaCalculada(null);
                  }}
                  onAbrir={() => pos.setEntregaModalAberto(true)}
                  taxaEntrega={pos.taxaEntrega}
                />
              </section>
            ) : null}

            {pos.agendamentoCfgAtual?.ativo ? (
              <PosAgendamentoCard valor={pos.agendamento} onAbrir={() => pos.setAgendamentoModalAberto(true)} onLimpar={() => pos.setAgendamento(null)} />
            ) : null}

            {pos.temCupomDisponivel || (clienteStats && (clienteStats.cashback ?? 0) > 0) || pos.catalogo?.nfceDisponivel ? (
              <section className="space-y-2.5">
                <h2 className="text-sm font-bold">Descontos e nota</h2>
                {pos.temCupomDisponivel ? (
                  <PosCupomField
                    subtotal={cart.subtotal}
                    taxaEntrega={pos.taxaEntrega}
                    tipoPedido={tipoPedido}
                    clienteId={cliente?.id ?? null}
                    cupom={pos.cupom}
                    onCupomChange={pos.setCupom}
                  />
                ) : null}

                {clienteStats && (clienteStats.cashback ?? 0) > 0 ? (
                  <button
                    type="button"
                    onClick={() => pos.setCashbackModalAberto(true)}
                    className="flex h-12 w-full items-center gap-2 rounded-xl border px-3.5 text-left text-sm active:bg-muted"
                  >
                    <Coins className="size-4 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1 truncate">
                      {pos.cashbackResumoNum > 0 ? (
                        <>
                          Cashback <span className="font-semibold text-primary">{formatBRL(pos.cashbackResumoNum)}</span> aplicado
                        </>
                      ) : (
                        <>
                          Usar cashback de <span className="font-semibold text-primary">{formatBRL(clienteStats.cashback ?? 0)}</span>
                        </>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ) : null}

                {pos.catalogo?.nfceDisponivel ? (
                  <div>
                    <input
                      value={pos.cpfCnpjNota}
                      onChange={(e) => pos.setCpfCnpjNota(formatarCpfCnpj(e.target.value))}
                      inputMode="numeric"
                      placeholder="CPF/CNPJ na nota (opcional)"
                      aria-invalid={cpfInvalido}
                      className="h-12 w-full rounded-xl border px-3.5 text-base outline-none placeholder:text-sm placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-primary/50 aria-invalid:border-destructive"
                    />
                    {cpfInvalido ? <p className="mt-1 text-xs text-destructive">CPF/CNPJ inválido.</p> : null}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        ) : (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">Escolha o tipo do pedido para informar o cliente.</p>
        )}
      </div>

      <div className={RODAPE}>
        <div className="mb-3 space-y-1 text-sm">
          {pos.taxaEntrega > 0 || (pos.cupom?.valor ?? 0) > 0 || pos.cashbackResumoNum > 0 ? (
            <>
              <LinhaValor rotulo="Subtotal" valor={formatBRL(cart.subtotal)} />
              {pos.taxaEntrega > 0 ? <LinhaValor rotulo="Taxa de entrega" valor={formatBRL(pos.taxaEntrega)} /> : null}
              {(pos.cupom?.valor ?? 0) > 0 ? <LinhaValor rotulo="Cupom" valor={`-${formatBRL(pos.cupom!.valor)}`} destaque /> : null}
              {pos.cashbackResumoNum > 0 ? <LinhaValor rotulo="Cashback" valor={`-${formatBRL(pos.cashbackResumoNum)}`} destaque /> : null}
            </>
          ) : null}
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums">{formatBRL(pos.totalResumo)}</span>
          </div>
        </div>
        <BotaoPrincipal onClick={pos.irParaPagamento} disabled={tipoPedido === null || !cliente || cart.itens.length === 0}>
          Ir para pagamento <ChevronRight className="size-5" />
        </BotaoPrincipal>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Pecas */

function Passos({ atual }: { atual: number }) {
  const passos = ["Itens", "Cliente", "Pagamento"];
  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2.5">
      {passos.map((p, i) => {
        const n = i + 1;
        const feito = n < atual;
        const ativo = n === atual;
        return (
          <div key={p} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                feito || ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {feito ? <Check className="size-3" /> : n}
            </span>
            <span className={cn("truncate text-xs font-medium", ativo ? "text-foreground" : "text-muted-foreground")}>{p}</span>
            {n < passos.length ? <span className={cn("h-px min-w-2 flex-1", feito ? "bg-primary" : "bg-border")} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function BotaoPrincipal({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-14 w-full items-center justify-center gap-1 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function LinhaValor({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={cn("flex justify-between", destaque ? "text-emerald-600" : "text-muted-foreground")}>
      <span>{rotulo}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

function AvisoComboEdicao() {
  return (
    <div className="mx-4 mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
      Este pedido tem um item de combo — a composição original não pôde ser restaurada no carrinho. Revise os itens antes de salvar.
    </div>
  );
}

function CarregandoCardapio() {
  return (
    <div className="flex-1 space-y-1 overflow-hidden px-4 pt-3" aria-busy aria-label="Carregando cardápio">
      <div className="h-11 animate-pulse rounded-full bg-muted" />
      <div className="flex gap-2 py-2">
        {[64, 88, 72, 96].map((w) => (
          <div key={w} className="h-9 shrink-0 animate-pulse rounded-full bg-muted" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3.5">
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
          </div>
          <div className="size-[92px] shrink-0 animate-pulse rounded-2xl bg-muted" />
        </div>
      ))}
    </div>
  );
}

function TelaSucesso({ codigo, onNovoPedido, onFechar }: { codigo: number | string | null; onNovoPedido: () => void; onFechar: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex animate-in flex-col bg-background duration-200 fade-in">
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="flex size-20 animate-in items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 duration-300 zoom-in-50">
          <Check className="size-10" strokeWidth={2.5} />
        </div>
        <h2 className="mt-5 text-xl font-bold">Pedido lançado!</h2>
        {codigo ? <p className="mt-1 text-sm text-muted-foreground">Pedido #{codigo} registrado no balcão.</p> : null}
      </div>
      <div className={cn(RODAPE, "space-y-2 border-t-0")}>
        <BotaoPrincipal onClick={onNovoPedido}>
          <ShoppingBag className="size-5" /> Novo pedido
        </BotaoPrincipal>
        <button type="button" onClick={onFechar} className="h-12 w-full rounded-2xl text-sm font-semibold text-muted-foreground active:bg-muted">
          Fechar
        </button>
      </div>
    </div>
  );
}
