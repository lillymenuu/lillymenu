"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { ComplementoGrupo, ComplementoItem } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";
import { ItemComplementoDialog } from "./item-complemento-dialog";
import { ReordenarItensDialog } from "./reordenar-itens-dialog";

type ProdutoOpcao = { id: number; nome: string; categoriaId: number | null };
type CategoriaOpcao = { id: number; nome: string };
type Dados = { grupo: ComplementoGrupo; produtos: ProdutoOpcao[]; categorias: CategoriaOpcao[] };
type Aba = "detalhes" | "itens" | "produtos" | "categorias";

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "detalhes", label: "Detalhes do grupo" },
  { valor: "itens", label: "Itens" },
  { valor: "produtos", label: "Vincular produtos" },
  { valor: "categorias", label: "Vincular categorias" },
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function apenasNumero(v: string) {
  return v.replace(/\D/g, "").slice(0, 3);
}

function LinhaSwitch({ titulo, texto, checked, onChange }: { titulo: string; texto: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4 shadow-xs">
      <div>
        <div className="text-sm font-medium">{titulo}</div>
        <div className="text-sm text-muted-foreground">{texto}</div>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onChange(v === true)} />
    </div>
  );
}

/*
 * "Editando grupo de complemento" (aberto pelo card do grupo na aba Complementos do produto).
 * Detalhes e vinculos salvam no botao Salvar; os itens (criar, ativar, ordenar) salvam na hora.
 * Montado so enquanto aberto.
 */
export function GrupoEditarDialog({
  open,
  onOpenChange,
  grupoId,
  onAlterado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupoId: number;
  onAlterado: () => void;
}) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    const resp = await fetch(`/api/product-complement/grupos?id=${grupoId}`);
    const data = await resp.json().catch(() => null);
    if (data?.ok) setDados({ grupo: data.grupo, produtos: data.produtos, categorias: data.categorias });
  }, [grupoId]);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/product-complement/grupos?id=${grupoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelado) return;
        if (data?.ok) setDados({ grupo: data.grupo, produtos: data.produtos, categorias: data.categorias });
        else setErroCarga(data?.msg ?? "Não foi possível carregar o grupo.");
      })
      .catch(() => !cancelado && setErroCarga("Não foi possível carregar o grupo."));
    return () => {
      cancelado = true;
    };
  }, [grupoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(MODAL_CLASSE, "max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden")}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Editando grupo de complemento</DialogTitle>
        </DialogHeader>
        {!dados ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{erroCarga ?? "Carregando..."}</p>
        ) : (
          <ConteudoGrupo
            key={dados.grupo.id}
            dados={dados}
            onFechar={() => onOpenChange(false)}
            onAlterado={onAlterado}
            onItensAlterados={async () => {
              await recarregar();
              onAlterado();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoGrupo({
  dados,
  onFechar,
  onAlterado,
  onItensAlterados,
}: {
  dados: Dados;
  onFechar: () => void;
  onAlterado: () => void;
  onItensAlterados: () => Promise<void>;
}) {
  const { grupo, produtos, categorias } = dados;
  const [aba, setAba] = useState<Aba>("detalhes");
  const [nome, setNome] = useState(grupo.nome);
  const [ativo, setAtivo] = useState(grupo.ativo);
  const [obrigatorio, setObrigatorio] = useState(grupo.obrigatorio);
  const [minimo, setMinimo] = useState(String(grupo.quantidadeMinima));
  const [maximo, setMaximo] = useState(String(grupo.quantidadeMaxima));
  const [produtoIds, setProdutoIds] = useState<number[]>(grupo.produtoIds);
  const [categoriaIds, setCategoriaIds] = useState<number[]>(grupo.categoriaIds);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [buscaCategoria, setBuscaCategoria] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [itemDialog, setItemDialog] = useState<{ chave: number; item: ComplementoItem | null } | null>(null);
  const [reordenarAberto, setReordenarAberto] = useState(false);

  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  function definirObrigatorio(v: boolean) {
    setObrigatorio(v);
    if (v && (Number(minimo) || 0) === 0) setMinimo("1");
    if (!v) setMinimo("0");
  }

  async function salvar() {
    setErro(null);
    const min = Number(minimo || 0);
    const max = Number(maximo || 0);
    if (!nome.trim()) {
      setAba("detalhes");
      setErro("Informe o nome do grupo.");
      return;
    }
    if (max > 0 && min > max) {
      setAba("detalhes");
      setErro("A quantidade mínima não pode ser maior que a máxima.");
      return;
    }
    setSalvando(true);
    try {
      const resp = await fetch("/api/product-complement/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: grupo.id,
          nome,
          ativo,
          obrigatorio,
          quantidade_minima: min,
          quantidade_maxima: max,
          produto_ids: produtoIds,
          categoria_ids: categoriaIds,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        setErro(data?.msg ?? "Não foi possível salvar o grupo.");
        return;
      }
      toast.success("Grupo atualizado");
      onAlterado();
      onFechar();
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    setApagando(true);
    try {
      const resp = await fetch("/api/product-complement/grupos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: grupo.id }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível apagar o grupo.");
        return;
      }
      toast.success("Grupo apagado");
      setConfirmarApagar(false);
      onAlterado();
      onFechar();
    } finally {
      setApagando(false);
    }
  }

  async function toggleItem(item: ComplementoItem) {
    const resp = await fetch("/api/product-complement/itens", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, ativo: !item.ativo }),
    });
    const data = await resp.json().catch(() => null);
    if (!data?.ok) {
      toast.error(data?.msg ?? "Não foi possível alterar o item.");
      return;
    }
    toast.success(item.ativo ? "Item desativado" : "Item ativado");
    await onItensAlterados();
  }

  const termoProduto = buscaProduto.trim().toLowerCase();
  const produtosFiltrados = termoProduto ? produtos.filter((p) => p.nome.toLowerCase().includes(termoProduto)) : produtos;
  const termoCategoria = buscaCategoria.trim().toLowerCase();
  const categoriasFiltradas = termoCategoria ? categorias.filter((c) => c.nome.toLowerCase().includes(termoCategoria)) : categorias;

  return (
    <>
      <div className="-mx-6 flex min-h-0 flex-col gap-4 overflow-y-auto px-6">
        <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted p-1 text-sm">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              type="button"
              onClick={() => setAba(a.valor)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors",
                aba === a.valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        {aba === "detalhes" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-grupo-nome" className="text-sm font-medium">
                Nome do grupo <span className="text-destructive">*</span>
              </label>
              <input id="editar-grupo-nome" className={CAMPO_CLASSE} maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <LinhaSwitch
              titulo="Disponibilidade"
              texto="Marque essa opção para deixar esse grupo de complemento disponível nos produtos."
              checked={ativo}
              onChange={setAtivo}
            />
            <LinhaSwitch
              titulo="Opcional"
              texto="Marque essa opção para definir que esse grupo de complemento será opcional."
              checked={!obrigatorio}
              onChange={(v) => definirObrigatorio(!v)}
            />
            <LinhaSwitch
              titulo="Obrigatório"
              texto="Marque essa opção para definir que esse grupo de complemento será obrigatório."
              checked={obrigatorio}
              onChange={definirObrigatorio}
            />
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-grupo-min" className="text-sm font-medium">
                Quantidade mínima <span className="text-destructive">*</span>
              </label>
              <input
                id="editar-grupo-min"
                inputMode="numeric"
                className={CAMPO_CLASSE}
                value={minimo}
                onChange={(e) => {
                  const v = apenasNumero(e.target.value);
                  setMinimo(v);
                  setObrigatorio(Number(v || 0) > 0);
                }}
              />
              <span className="text-xs text-muted-foreground">Número mínimo de itens que o cliente deverá escolher de forma obrigatória.</span>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-grupo-max" className="text-sm font-medium">
                Quantidade máxima <span className="text-destructive">*</span>
              </label>
              <input id="editar-grupo-max" inputMode="numeric" className={CAMPO_CLASSE} value={maximo} onChange={(e) => setMaximo(apenasNumero(e.target.value))} />
              <span className="text-xs text-muted-foreground">Número máximo de itens que o cliente irá conseguir escolher. Use 0 para não limitar.</span>
            </div>
          </div>
        )}

        {aba === "itens" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 rounded-full px-4 font-medium" disabled={grupo.itens.length < 2} onClick={() => setReordenarAberto(true)}>
                Ordenar itens
              </Button>
              <Button className={BOTAO_PRIMARIO_CLASSE} onClick={() => setItemDialog({ chave: Date.now(), item: null })}>
                Adicionar item
              </Button>
            </div>
            {grupo.itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item neste grupo ainda.</p>}
            <div className="flex flex-col gap-2.5">
              {grupo.itens.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setItemDialog({ chave: Date.now(), item })}
                  className="flex cursor-pointer items-end justify-between gap-3 rounded-md bg-muted/70 px-3 py-3 hover:bg-muted"
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <span className="truncate text-sm font-semibold">{item.nome}</span>
                    <span className="text-sm">{formatBRL(item.preco)}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch checked={item.ativo} onCheckedChange={() => toggleItem(item)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "produtos" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Escolha os produtos que você deseja vincular o <strong>{nome || grupo.nome}</strong> de adicionais individualmente.
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-grupo-busca-produto" className="text-sm font-medium">
                Buscar produto
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  id="editar-grupo-busca-produto"
                  className={cn(CAMPO_CLASSE, "pl-10")}
                  placeholder="Busque pelo nome do produto que deseja vincular."
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                />
              </div>
            </div>
            {produtosFiltrados.length === 0 && <p className="text-sm">Nenhum produto encontrado!</p>}
            {produtosFiltrados.map((p) => {
              const vinculado = produtoIds.includes(p.id);
              return (
                <div key={p.id} className="flex flex-col gap-3 rounded-xl border p-4">
                  <div>
                    <div className="text-sm">{p.nome}</div>
                    <div className="text-sm text-muted-foreground">
                      Categoria: <strong>{(p.categoriaId !== null && nomeCategoria.get(p.categoriaId)) || "Sem categoria"}</strong>
                    </div>
                  </div>
                  <LinhaSwitch
                    titulo={vinculado ? "Ativado" : "Desativado"}
                    texto={vinculado ? "o grupo está ativado neste produto" : "o grupo está desativado neste produto"}
                    checked={vinculado}
                    onChange={(v) => setProdutoIds((atual) => (v ? [...atual, p.id] : atual.filter((id) => id !== p.id)))}
                  />
                </div>
              );
            })}
          </div>
        )}

        {aba === "categorias" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Ao vincular o grupo de adicionais na categoria, o grupo <strong>{nome || grupo.nome}</strong> será vinculado a todos os produtos que
              estão cadastrados nesta categoria
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-grupo-busca-categoria" className="text-sm font-medium">
                Buscar categoria
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  id="editar-grupo-busca-categoria"
                  className={cn(CAMPO_CLASSE, "pl-10")}
                  placeholder="Busque pelo nome da categoria que deseja vincular"
                  value={buscaCategoria}
                  onChange={(e) => setBuscaCategoria(e.target.value)}
                />
              </div>
            </div>
            {categoriasFiltradas.length === 0 && <p className="text-sm">Nenhuma categoria encontrada!</p>}
            {categoriasFiltradas.map((c) => {
              const vinculada = categoriaIds.includes(c.id);
              return (
                <div key={c.id} className="flex flex-col gap-3 rounded-xl border p-4">
                  <div className="text-sm">{c.nome}</div>
                  <LinhaSwitch
                    titulo={vinculada ? "Ativado" : "Desativado"}
                    texto={vinculada ? "o grupo está ativado em todos os produtos desta categoria" : "o grupo está desativado nesta categoria"}
                    checked={vinculada}
                    onChange={(v) => setCategoriaIds((atual) => (v ? [...atual, c.id] : atual.filter((id) => id !== c.id)))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {aba !== "itens" && (
        <div className="flex flex-col gap-2">
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <div className="flex justify-end gap-2">
            {aba === "detalhes" && (
              <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => setConfirmarApagar(true)}>
                Apagar grupo
              </Button>
            )}
            <Button className={BOTAO_PRIMARIO_CLASSE} onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {itemDialog && (
        <ItemComplementoDialog
          key={itemDialog.chave}
          open
          onOpenChange={(v) => !v && setItemDialog(null)}
          grupoId={grupo.id}
          item={itemDialog.item}
          onSalvo={() => void onItensAlterados()}
        />
      )}

      {reordenarAberto && (
        <ReordenarItensDialog open onOpenChange={setReordenarAberto} grupo={grupo} onSalvo={() => void onItensAlterados()} />
      )}

      <ConfirmDialog
        open={confirmarApagar}
        onOpenChange={setConfirmarApagar}
        titulo="Apagar grupo?"
        descricao="O grupo e todos os itens dele serão apagados, inclusive dos outros produtos. Essa ação não pode ser desfeita."
        confirmando={apagando}
        textoConfirmar="Apagar"
        onConfirmar={apagar}
      />
    </>
  );
}
