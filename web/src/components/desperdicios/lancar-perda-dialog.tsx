"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, PackageOpen, Plus, Search, ShoppingBasket, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/produtos/money-input";
import { formatBRLMilhar } from "@/components/ordermanager/constants";
import {
  MESES_NOMES,
  MOTIVOS,
  MOTIVO_LABEL,
  TIPOS,
  TIPO_LABEL,
  type Desperdicio,
  type MotivoDesperdicio,
  type OrigemDesperdicio,
  type ProdutoParaPerda,
  type TipoDesperdicio,
} from "@/lib/desperdicios";

type ItemForm = {
  chave: string;
  origem: OrigemDesperdicio;
  produtoId: number | null;
  descricao: string;
  tipo: TipoDesperdicio;
  quantidade: string;
  custo: string; // decimal "7.5" (formato do MoneyInput)
};

const CAMPO = "h-9 w-full rounded-full border-0 bg-muted/60 px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const TIPOS_AVULSA = TIPOS.filter((t) => t.id !== "produto_vencido");

function hojeFortaleza(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function numero(v: string): number {
  return parseFloat(String(v).replace(",", ".")) || 0;
}

/* Lista de produtos guardada entre aberturas do modal (so recarrega ao abrir de novo depois de 5 min). */
let cacheProdutos: { em: number; lista: ProdutoParaPerda[] } | null = null;

function precisaCarregarProdutos() {
  return !cacheProdutos || Date.now() - cacheProdutos.em > 5 * 60_000;
}

function itemDoLancamento(d: Desperdicio): ItemForm {
  return {
    chave: `e${d.id}`,
    origem: d.origem,
    produtoId: d.produtoId,
    descricao: d.descricao,
    tipo: d.tipo,
    quantidade: String(d.quantidade).replace(".", ","),
    custo: String(d.custoUnitario),
  };
}

/** O estado nasce das props: quem usa recria o modal (key) a cada abertura. */
export function LancarPerdaDialog({
  open,
  editando,
  onOpenChange,
  onSalvo,
}: {
  open: boolean;
  /** Lancamento existente: o modal abre so com ele, para editar. */
  editando: Desperdicio | null;
  onOpenChange: (v: boolean) => void;
  /** Recebe a data da perda salva (YYYY-MM-DD) — a tela vai pro mes dela. */
  onSalvo: (data: string) => void;
}) {
  const [data, setData] = useState(editando?.data ?? hojeFortaleza());
  const [motivo, setMotivo] = useState<MotivoDesperdicio>(editando?.motivo ?? "vencido");
  const [observacao, setObservacao] = useState(editando?.observacao ?? "");
  const [aba, setAba] = useState<"produtos" | "avulsa">("produtos");
  const [itens, setItens] = useState<ItemForm[]>(editando ? [itemDoLancamento(editando)] : []);
  const [produtos, setProdutos] = useState<ProdutoParaPerda[]>(cacheProdutos?.lista ?? []);
  const [carregandoProdutos, setCarregandoProdutos] = useState(() => !editando && precisaCarregarProdutos());
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [avulsa, setAvulsa] = useState({ descricao: "", tipo: "insumo" as TipoDesperdicio, quantidade: "1", custo: "" });
  const [salvando, setSalvando] = useState(false);
  const [destaque, setDestaque] = useState<string | null>(null);
  const descricaoAvulsaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || editando || !precisaCarregarProdutos()) return;
    fetch("/api/desperdicios/produtos")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        cacheProdutos = { em: Date.now(), lista: d.produtos };
        setProdutos(d.produtos);
      })
      .catch(() => toast.error("Não foi possível carregar os produtos."))
      .finally(() => setCarregandoProdutos(false));
  }, [open, editando]);

  const categorias = useMemo(() => [...new Set(produtos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort(), [produtos]);
  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => (categoria === "todas" || p.categoria === categoria) && (!termo || p.nome.toLowerCase().includes(termo)));
  }, [produtos, busca, categoria]);
  const qtdPorProduto = useMemo(() => new Map(itens.filter((i) => i.produtoId).map((i) => [i.produtoId, numero(i.quantidade)])), [itens]);

  const total = itens.reduce((s, i) => s + numero(i.quantidade) * numero(i.custo), 0);

  function piscar(chave: string) {
    setDestaque(chave);
    setTimeout(() => setDestaque((atual) => (atual === chave ? null : atual)), 700);
  }

  function adicionarProduto(p: ProdutoParaPerda) {
    const chave = `p${p.id}`;
    setItens((atual) => {
      const existente = atual.find((i) => i.chave === chave);
      if (existente) {
        return atual.map((i) => (i.chave === chave ? { ...i, quantidade: String(numero(i.quantidade) + 1).replace(".", ",") } : i));
      }
      return [
        ...atual,
        { chave, origem: "produto", produtoId: p.id, descricao: p.nome, tipo: "produto_vencido", quantidade: "1", custo: p.precoCusto ? String(p.precoCusto) : "" },
      ];
    });
    piscar(chave);
  }

  function adicionarAvulsa() {
    const descricao = avulsa.descricao.trim();
    if (!descricao) {
      toast.error("Informe a descrição da despesa avulsa.");
      descricaoAvulsaRef.current?.focus();
      return;
    }
    if (!(numero(avulsa.quantidade) > 0)) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    const chave = `a${Date.now()}`;
    setItens((atual) => [...atual, { chave, origem: "avulsa", produtoId: null, descricao, tipo: avulsa.tipo, quantidade: avulsa.quantidade, custo: avulsa.custo }]);
    setAvulsa({ descricao: "", tipo: avulsa.tipo, quantidade: "1", custo: "" });
    piscar(chave);
    descricaoAvulsaRef.current?.focus();
  }

  function atualizar(chave: string, patch: Partial<ItemForm>) {
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...patch } : i)));
  }

  async function salvar() {
    if (itens.length === 0) {
      toast.error("Adicione ao menos um item.");
      return;
    }
    const semQtd = itens.find((i) => !(numero(i.quantidade) > 0));
    if (semQtd) {
      toast.error(`Informe a quantidade de "${semQtd.descricao}".`);
      return;
    }
    const semCusto = itens.find((i) => i.custo === "");
    if (semCusto) {
      toast.error(`Informe o custo de "${semCusto.descricao}".`);
      return;
    }
    const corpo = {
      id: editando?.id,
      data,
      motivo,
      observacao,
      itens: itens.map((i) => ({
        origem: i.origem,
        produtoId: i.produtoId,
        descricao: i.descricao,
        tipo: i.tipo,
        quantidade: numero(i.quantidade),
        custoUnitario: numero(i.custo),
      })),
    };
    setSalvando(true);
    try {
      const res = await fetch("/api/desperdicios", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resp = await res.json();
      if (!resp.ok) {
        toast.error(resp.msg ?? "Erro ao salvar a perda.");
        return;
      }
      toast.success(editando ? "Lançamento atualizado" : `${itens.length} ${itens.length === 1 ? "perda lançada" : "perdas lançadas"}`);
      onOpenChange(false);
      onSalvo(data);
    } catch {
      toast.error("Erro ao salvar a perda.");
    } finally {
      setSalvando(false);
    }
  }

  const listaItens = (
    <div className={`flex flex-col rounded-2xl border bg-muted/20 ${editando ? "" : "min-h-0 flex-1"}`}>
      <div className="flex items-center justify-between border-b px-3.5 py-2.5">
        <span className="text-sm font-medium">{editando ? "Item" : "Itens deste lançamento"}</span>
        {!editando && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">{itens.length}</span>
        )}
      </div>
      <div className={`space-y-2 p-2.5 ${editando ? "" : "min-h-0 flex-1 overflow-y-auto"}`}>
        {itens.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ShoppingBasket className="size-7 opacity-40" />
            <p className="max-w-56 text-xs">Escolha produtos ao lado ou adicione uma despesa avulsa.</p>
          </div>
        ) : (
          itens.map((i) => (
            <div
              key={i.chave}
              className={`rounded-xl border bg-background p-2.5 shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-[box-shadow,border-color] duration-300 ${
                destaque === i.chave ? "border-primary/50 shadow-[0_0_0_3px_rgba(156,85,35,.15)]" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  {i.origem === "avulsa" ? (
                    <input
                      value={i.descricao}
                      onChange={(e) => atualizar(i.chave, { descricao: e.target.value })}
                      aria-label="Descrição"
                      className="w-full truncate bg-transparent text-sm font-medium outline-none"
                    />
                  ) : (
                    <div className="truncate text-sm font-medium">{i.descricao}</div>
                  )}
                  <div className="text-[11px] text-muted-foreground">{i.origem === "avulsa" ? "Despesa avulsa" : "Produto cadastrado"}</div>
                </div>
                {!editando && (
                  <button
                    type="button"
                    onClick={() => setItens((atual) => atual.filter((x) => x.chave !== i.chave))}
                    aria-label={`Remover ${i.descricao}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-[1fr_72px_96px] items-end gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">Tipo</label>
                  <Select value={i.tipo} onValueChange={(v) => v && atualizar(i.chave, { tipo: v as TipoDesperdicio })}>
                    <SelectTrigger className="h-8 w-full rounded-full border-0 bg-muted/60 px-3 text-xs">
                      <SelectValue>{() => TIPO_LABEL[i.tipo]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(i.origem === "produto" ? TIPOS : TIPOS_AVULSA).map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">Qtd</label>
                  <input
                    inputMode="decimal"
                    value={i.quantidade}
                    onChange={(e) => atualizar(i.chave, { quantidade: e.target.value.replace(/[^\d,.]/g, "").slice(0, 9) })}
                    className="h-8 w-full rounded-full border-0 bg-muted/60 px-3 text-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] text-muted-foreground">Custo un.</label>
                  <MoneyInput
                    value={i.custo}
                    onChange={(v) => atualizar(i.chave, { custo: v })}
                    className="h-8 w-full rounded-full border-0 bg-muted/60 px-3 text-xs tabular-nums"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {i.custo === "" && i.origem === "produto" ? "Sem preço de custo no cadastro — informe aqui" : "Subtotal"}
                </span>
                <span className="font-semibold tabular-nums">{formatBRLMilhar(numero(i.quantidade) * numero(i.custo))}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between rounded-b-2xl border-t bg-background px-3.5 py-3">
        <span className="text-sm text-muted-foreground">Total da perda</span>
        <span className="text-lg font-semibold text-primary tabular-nums">{formatBRLMilhar(total)}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Edicao (um item so): modal estreito e da altura do conteudo; lancamento novo: duas colunas, altura fixa. */}
      <DialogContent
        className={`flex max-w-[calc(100%-2rem)] flex-col gap-4 rounded-3xl ${
          editando ? "max-h-[calc(100dvh-2rem)] w-[480px] sm:max-w-[480px]" : "h-[min(720px,calc(100dvh-2rem))] w-[920px] sm:max-w-[920px]"
        }`}
      >
        <DialogHeader>
          <DialogTitle>{editando ? "Editar lançamento de perda" : "Lançar perda"}</DialogTitle>
          <p className="text-xs text-muted-foreground">Lançamentos de perda não alteram o estoque dos produtos.</p>
        </DialogHeader>

        <div className={`grid grid-cols-2 gap-3 ${editando ? "" : "sm:grid-cols-[160px_220px_1fr]"}`}>
          <div>
            <label className="mb-1 block text-xs font-medium">Data da perda</label>
            <input type="date" value={data} max={hojeFortaleza()} onChange={(e) => setData(e.target.value)} className={CAMPO} />
            {/^\d{4}-\d{2}/.test(data) && data.slice(0, 7) !== hojeFortaleza().slice(0, 7) && (
              <p className="mt-1 text-[11px] font-medium text-amber-700">
                Entra em {MESES_NOMES[Number(data.slice(5, 7)) - 1]} de {data.slice(0, 4)}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Motivo</label>
            <Select value={motivo} onValueChange={(v) => v && setMotivo(v as MotivoDesperdicio)}>
              <SelectTrigger className="h-9 w-full rounded-full border-0 bg-muted/60 px-3.5 text-sm">
                <SelectValue>{() => MOTIVO_LABEL[motivo]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={editando ? "col-span-2" : "col-span-2 sm:col-span-1"}>
            <label className="mb-1 block text-xs font-medium">Observação</label>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={255} placeholder="Opcional" className={CAMPO} />
          </div>
        </div>

        <div className={editando ? "min-h-0 overflow-y-auto" : "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto md:flex-row md:overflow-hidden"}>
          {!editando && (
            <div className="flex min-h-[320px] flex-col md:min-h-0 md:w-[46%]">
              <div className="mb-2.5 flex w-fit gap-1 rounded-full bg-muted p-1 text-xs">
                {(
                  [
                    ["produtos", "Produtos cadastrados"],
                    ["avulsa", "Despesa avulsa"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAba(id)}
                    className={`rounded-full px-3 py-1.5 font-medium transition-colors ${aba === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {aba === "produtos" ? (
                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border">
                  <div className="flex gap-2 border-b p-2.5">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className={`${CAMPO} pl-8`} autoFocus />
                    </div>
                    {categorias.length > 0 && (
                      <Select value={categoria} onValueChange={(v) => v && setCategoria(v as string)}>
                        <SelectTrigger className="h-9 w-36 shrink-0 rounded-full border-0 bg-muted/60 px-3 text-xs">
                          <SelectValue>{() => (categoria === "todas" ? "Categorias" : categoria)}</SelectValue>
                        </SelectTrigger>
                        {/* Lista mais larga que o botao: nomes de categoria longos aparecem inteiros. */}
                        <SelectContent className="w-auto min-w-(--anchor-width) max-w-[min(20rem,calc(100vw-2rem))]">
                          <SelectItem value="todas">Todas</SelectItem>
                          {categorias.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {carregandoProdutos && produtos.length === 0 ? (
                      <div className="flex h-full min-h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Carregando produtos...
                      </div>
                    ) : produtosFiltrados.length === 0 ? (
                      <div className="flex h-full min-h-32 flex-col items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                        <PackageOpen className="size-6 opacity-40" />
                        Nenhum produto encontrado.
                      </div>
                    ) : (
                      produtosFiltrados.map((p) => {
                        const naLista = qtdPorProduto.get(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => adicionarProduto(p)}
                            className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm">{p.nome}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {p.categoria ?? "Sem categoria"} · {p.precoCusto ? `custo ${formatBRLMilhar(p.precoCusto)}` : "sem preço de custo"}
                              </div>
                            </div>
                            {naLista ? (
                              <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 text-xs font-medium text-primary-foreground tabular-nums">
                                <Check className="size-3" /> {naLista.toLocaleString("pt-BR")}
                              </span>
                            ) : (
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                                <Plus className="size-3.5" />
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border p-3.5">
                  <p className="text-xs text-muted-foreground">Para o que não está cadastrado como produto: um insumo que estragou, embalagens perdidas…</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Descrição</label>
                    <input
                      ref={descricaoAvulsaRef}
                      value={avulsa.descricao}
                      onChange={(e) => setAvulsa({ ...avulsa, descricao: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && adicionarAvulsa()}
                      maxLength={160}
                      placeholder="Ex.: Leite condensado"
                      className={CAMPO}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Tipo</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TIPOS_AVULSA.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAvulsa({ ...avulsa, tipo: t.id })}
                          className={`rounded-full border px-2 py-1.5 text-xs transition-colors ${
                            avulsa.tipo === t.id ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Quantidade</label>
                      <input
                        inputMode="decimal"
                        value={avulsa.quantidade}
                        onChange={(e) => setAvulsa({ ...avulsa, quantidade: e.target.value.replace(/[^\d,.]/g, "").slice(0, 9) })}
                        className={CAMPO}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Custo unitário</label>
                      <MoneyInput value={avulsa.custo} onChange={(v) => setAvulsa({ ...avulsa, custo: v })} className="h-9 w-full rounded-full border-0 bg-muted/60 px-3.5 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      Subtotal <span className="font-semibold text-foreground tabular-nums">{formatBRLMilhar(numero(avulsa.quantidade) * numero(avulsa.custo))}</span>
                    </span>
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={adicionarAvulsa}>
                      <Plus className="size-3.5" /> Adicionar à lista
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {editando ? listaItens : <div className="flex min-h-[280px] flex-col md:min-h-0 md:flex-1">{listaItens}</div>}
        </div>

        <DialogFooter className="border-t-0 bg-transparent">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button className="rounded-full px-5" onClick={salvar} disabled={salvando || itens.length === 0}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : `Salvar perda · ${formatBRLMilhar(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
