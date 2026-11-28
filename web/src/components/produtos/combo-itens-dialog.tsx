"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUTO_IMAGEM_PADRAO } from "@/lib/produtoImagem";
import type { Categoria, Produto } from "@/lib/produtos";
import { cn } from "cn";

export function urlImagemProduto(
  imagem: string | null | undefined,
  phpAdminUrl: string,
): string {
  if (!imagem) return PRODUTO_IMAGEM_PADRAO;
  return imagem.startsWith("http") || imagem.startsWith("data:")
    ? imagem
    : `${phpAdminUrl}/${imagem}`;
}

/** "O que entra neste passo?": grade de produtos para marcar as opcoes que o cliente pode escolher. */
export function ComboItensDialog({
  open,
  onOpenChange,
  produtos,
  categorias,
  selecionadosIniciais,
  phpAdminUrl,
  onContinuar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  produtos: Produto[];
  categorias: Categoria[];
  selecionadosIniciais: number[];
  phpAdminUrl: string;
  onContinuar: (ids: number[]) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayForceRender
        className="flex h-[90vh] w-[940px] flex-col gap-0 rounded-3xl p-0 sm:max-w-[940px]"
      >
        <Corpo
          produtos={produtos}
          categorias={categorias}
          selecionadosIniciais={selecionadosIniciais}
          phpAdminUrl={phpAdminUrl}
          onCancelar={() => onOpenChange(false)}
          onContinuar={onContinuar}
        />
      </DialogContent>
    </Dialog>
  );
}

/* Montado a cada abertura do modal: comeca com as opcoes ja marcadas do passo. */
function Corpo({
  produtos,
  categorias,
  selecionadosIniciais,
  phpAdminUrl,
  onCancelar,
  onContinuar,
}: {
  produtos: Produto[];
  categorias: Categoria[];
  selecionadosIniciais: number[];
  phpAdminUrl: string;
  onCancelar: () => void;
  onContinuar: (ids: number[]) => void;
}) {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [selecionados, setSelecionados] =
    useState<number[]>(selecionadosIniciais);

  /* Produtos ativos (e os ja marcados, mesmo se pausados depois, para nao sumirem do passo). */
  const disponiveis = useMemo(
    () =>
      produtos.filter(
        (p) => p.ativo === 1 || selecionadosIniciais.includes(p.id),
      ),
    [produtos, selecionadosIniciais],
  );
  const categoriasComItens = useMemo(() => {
    const ids = new Set(disponiveis.map((p) => p.categoria_id));
    return categorias.filter((c) => ids.has(c.id));
  }, [disponiveis, categorias]);

  const termo = busca.trim().toLowerCase();
  const visiveis = disponiveis.filter(
    (p) =>
      (categoriaFiltro === "todas" ||
        String(p.categoria_id) === categoriaFiltro) &&
      (!termo || p.nome.toLowerCase().includes(termo)),
  );
  const todosVisiveisMarcados =
    visiveis.length > 0 && visiveis.every((p) => selecionados.includes(p.id));

  function alternar(id: number) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  function alternarTodos() {
    const ids = visiveis.map((p) => p.id);
    setSelecionados((atual) =>
      todosVisiveisMarcados
        ? atual.filter((x) => !ids.includes(x))
        : [...atual, ...ids.filter((x) => !atual.includes(x))],
    );
  }

  const categoriaItems: Record<string, string> = { todas: "Todas" };
  for (const c of categoriasComItens) categoriaItems[String(c.id)] = c.nome;

  return (
    <>
      <DialogHeader className="gap-1 px-6 pt-6 pb-4">
        <DialogTitle className="text-base">
          O que entra neste passo?
        </DialogTitle>
        <DialogDescription>
          Marque o que o cliente pode escolher. Ex.: as bebidas do combo.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="combo-itens-busca" className="text-sm font-medium">
            Pesquisar item
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="combo-itens-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procure pelo nome"
              className="h-10 rounded-full border-0 bg-muted/60 pl-10"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Filtrar por categoria</span>
          <Select
            items={categoriaItems}
            value={categoriaFiltro}
            onValueChange={(v) => setCategoriaFiltro(v ?? "todas")}
          >
            <SelectTrigger className="h-10 w-full rounded-full border-0 bg-muted/60 px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categoriasComItens.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 pt-3 pb-2">
        <button
          type="button"
          onClick={alternarTodos}
          disabled={visiveis.length === 0}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          <Check size={15} />{" "}
          {todosVisiveisMarcados ? "Desmarcar todos" : "Selecionar todos"}
        </button>
        <span className="text-xs text-muted-foreground">
          {selecionados.length}{" "}
          {selecionados.length === 1 ? "selecionado" : "selecionados"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
        {visiveis.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 p-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((p) => {
              const marcado = selecionados.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  onClick={() => alternar(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors hover:bg-muted/50",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlImagemProduto(p.imagem, phpAdminUrl)}
                    alt=""
                    className="size-11 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13px] leading-snug font-medium">
                      {p.nome}
                    </span>
                    {p.ativo !== 1 && (
                      <span className="text-[11px] text-muted-foreground">
                        pausado
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                      marcado
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {marcado && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DialogFooter className="mx-0 mb-0 rounded-b-3xl border-t-0 bg-transparent px-6 pt-3 pb-6">
        <Button variant="outline" className="rounded-full" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          className="rounded-full px-5"
          disabled={selecionados.length === 0}
          onClick={() => onContinuar(selecionados)}
        >
          Continuar
        </Button>
      </DialogFooter>
    </>
  );
}
