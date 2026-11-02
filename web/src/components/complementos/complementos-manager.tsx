"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, Layers, Plus, Search, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PRODUTO_IMAGEM_PADRAO } from "@/lib/produtoImagem";
import type { ComplementoGrupo, ComplementoItem } from "@/db/queries/complementos";
import { EscolherGrupoDialog } from "./escolher-grupo-dialog";
import { GrupoConfigDialog } from "./grupo-config-dialog";
import { ItemComplementoDialog } from "./item-complemento-dialog";
import { ReordenarItensDialog } from "./reordenar-itens-dialog";

export type OpcaoVinculo = { id: number; nome: string };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

type Filtro = "todos" | "ativos" | "inativos";

export function ComplementosManager({
  grupos,
  produtos,
  categorias,
}: {
  grupos: ComplementoGrupo[];
  produtos: OpcaoVinculo[];
  categorias: OpcaoVinculo[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  /* fluxo "Novo complemento": escolhe o grupo e depois cria o item nele */
  const [escolherAberto, setEscolherAberto] = useState<"novo-item" | "clonar" | null>(null);
  const [grupoDialog, setGrupoDialog] = useState<{ aberto: boolean; grupo: ComplementoGrupo | null }>({ aberto: false, grupo: null });
  const [itemDialog, setItemDialog] = useState<{ aberto: boolean; grupoId: number; item: ComplementoItem | null }>({ aberto: false, grupoId: 0, item: null });
  const [reordenarGrupo, setReordenarGrupo] = useState<ComplementoGrupo | null>(null);
  /* incrementa a cada abertura: os dialogs remontam (key) e nascem com o estado do grupo/item atual */
  const [abertura, setAbertura] = useState(0);

  function abrirEscolher(modo: "novo-item" | "clonar") {
    setAbertura((n) => n + 1);
    setEscolherAberto(modo);
  }
  function abrirGrupo(grupo: ComplementoGrupo | null) {
    setAbertura((n) => n + 1);
    setGrupoDialog({ aberto: true, grupo });
  }
  function abrirItem(grupoId: number, item: ComplementoItem | null) {
    setAbertura((n) => n + 1);
    setItemDialog({ aberto: true, grupoId, item });
  }
  function abrirReordenar(grupo: ComplementoGrupo) {
    setAbertura((n) => n + 1);
    setReordenarGrupo(grupo);
  }

  const gruposFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return grupos
      .filter((g) => (filtro === "ativos" ? g.ativo : filtro === "inativos" ? !g.ativo : true))
      .map((g) => {
        if (!termo || g.nome.toLowerCase().includes(termo)) return g;
        return { ...g, itens: g.itens.filter((i) => i.nome.toLowerCase().includes(termo)) };
      })
      .filter((g) => !termo || g.nome.toLowerCase().includes(termo) || g.itens.length > 0);
  }, [grupos, filtro, busca]);

  async function toggleAtivoItem(item: ComplementoItem) {
    const novoAtivo = !item.ativo;
    const resp = await fetch("/api/product-complement/itens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ativo: novoAtivo }),
    });
    const data = await resp.json().catch(() => null);
    if (!data?.ok) {
      toast.error(data?.msg ?? "Não foi possível alterar o item.");
      return;
    }
    toast.success(novoAtivo ? "Item ativado" : "Item desativado");
    router.refresh();
  }

  async function clonarGrupo(grupoId: number) {
    const resp = await fetch("/api/product-complement/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clonar_de: grupoId }),
    });
    const data = await resp.json().catch(() => null);
    if (!data?.ok) {
      toast.error(data?.msg ?? "Não foi possível clonar o grupo.");
      return;
    }
    toast.success("Grupo clonado");
    setEscolherAberto(null);
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Grupo de adicionais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aqui você cadastra e vincula os complementos aos produtos que seus clientes podem adicionar à mais em seus produtos,
          como por exemplo: (Bebidas, Coberturas, Talheres e etc...)
        </p>
      </div>

      <div className="flex flex-col rounded-2xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
            {(
              [
                { valor: "todos", label: "Todos" },
                { valor: "ativos", label: "Ativos" },
                { valor: "inativos", label: "Inativos" },
              ] as const
            ).map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setFiltro(opcao.valor)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium transition-colors",
                  filtro === opcao.valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opcao.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full min-w-56 sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                aria-label="Pesquisar grupo ou item"
                className="h-9 w-full rounded-full border bg-muted/60 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
                placeholder="Pesquisar grupo ou item"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-9 rounded-xl" onClick={() => abrirEscolher("clonar")} disabled={grupos.length === 0}>
              <Copy size={15} /> Clonar grupo
            </Button>
            <Button className="h-9 rounded-xl" onClick={() => abrirEscolher("novo-item")}>
              <Plus size={16} /> Novo complemento
            </Button>
          </div>
        </div>

        {gruposFiltrados.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Layers size={28} />
            <p className="text-sm">{grupos.length === 0 ? "Nenhum grupo de adicionais cadastrado ainda." : "Nenhum grupo encontrado."}</p>
          </div>
        )}

        <div className="flex flex-col divide-y">
          {gruposFiltrados.map((grupo) => (
            <section key={grupo.id} className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{grupo.nome}</h2>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        grupo.ativo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {grupo.ativo ? "disponível" : "indisponível"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    disponível em {plural(grupo.produtoIds.length, "produto", "produtos")} e{" "}
                    {plural(grupo.categoriaIds.length, "categoria", "categorias")}
                    {(grupo.obrigatorio || grupo.quantidadeMaxima > 0) && (
                      <>
                        {" · "}
                        {grupo.obrigatorio ? "obrigatório" : "opcional"}
                        {grupo.quantidadeMaxima > 0 && `, até ${grupo.quantidadeMaxima}`}
                      </>
                    )}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="secondary" className="shrink-0 rounded-full font-medium" />}>
                    Opções do grupo
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44 rounded-xl">
                    <DropdownMenuItem onClick={() => abrirItem(grupo.id, null)}>Criar item</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => abrirGrupo(grupo)}>Editar grupo</DropdownMenuItem>
                    <DropdownMenuItem disabled={grupo.itens.length < 2} onClick={() => abrirReordenar(grupo)}>
                      Reordenar itens
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {grupo.itens.length === 0 ? (
                <button
                  type="button"
                  onClick={() => abrirItem(grupo.id, null)}
                  className="flex h-24 items-center justify-center gap-1.5 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <Plus size={15} /> Criar o primeiro item deste grupo
                </button>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                  {grupo.itens.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => abrirItem(grupo.id, item)}
                      className={cn(
                        "flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-md",
                        !item.ativo && "opacity-70"
                      )}
                    >
                      <div className="relative aspect-[4/3] w-full bg-muted">
                        {
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imagem || PRODUTO_IMAGEM_PADRAO} alt={item.nome} className="size-full object-cover" />
                        }
                        <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                          <Switch checked={item.ativo} onCheckedChange={() => toggleAtivoItem(item)} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 p-2.5">
                        <span className="truncate text-sm font-semibold">{item.nome}</span>
                        {item.controlaEstoque && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {item.estoqueQuantidade > 0 ? (
                              <CheckCircle2 size={13} className="text-emerald-600" />
                            ) : (
                              <X size={13} className="text-destructive" />
                            )}
                            <strong className="font-semibold text-foreground">{item.estoqueQuantidade}</strong> em estoque
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">{formatBRL(item.preco)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <EscolherGrupoDialog
        key={`escolher-${abertura}`}
        open={escolherAberto !== null}
        onOpenChange={(v) => !v && setEscolherAberto(null)}
        grupos={grupos}
        modo={escolherAberto ?? "novo-item"}
        onNovoGrupo={() => {
          setEscolherAberto(null);
          abrirGrupo(null);
        }}
        onContinuar={(grupoId) => {
          if (escolherAberto === "clonar") {
            void clonarGrupo(grupoId);
            return;
          }
          setEscolherAberto(null);
          abrirItem(grupoId, null);
        }}
      />

      <GrupoConfigDialog
        key={`grupo-${abertura}`}
        open={grupoDialog.aberto}
        onOpenChange={(v) => setGrupoDialog((s) => ({ ...s, aberto: v }))}
        grupo={grupoDialog.grupo}
        produtos={produtos}
        categorias={categorias}
        onSalvo={() => router.refresh()}
      />

      <ItemComplementoDialog
        key={`item-${abertura}`}
        open={itemDialog.aberto}
        onOpenChange={(v) => setItemDialog((s) => ({ ...s, aberto: v }))}
        grupoId={itemDialog.grupoId}
        item={itemDialog.item}
        onSalvo={() => router.refresh()}
      />

      <ReordenarItensDialog
        key={`reordenar-${abertura}`}
        open={reordenarGrupo !== null}
        onOpenChange={(v) => !v && setReordenarGrupo(null)}
        grupo={reordenarGrupo}
        onSalvo={() => router.refresh()}
      />
    </div>
  );
}
