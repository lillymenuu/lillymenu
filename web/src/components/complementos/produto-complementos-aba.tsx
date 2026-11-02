"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrupoResumo } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE } from "./estilos";
import { VincularGrupoDialog } from "./vincular-grupo-dialog";
import { GrupoConfigDialog } from "./grupo-config-dialog";
import { GrupoEditarDialog } from "./grupo-editar-dialog";

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

async function postVinculo(acao: "vincular" | "desvincular", produtoId: number, grupoId: number) {
  const resp = await fetch("/api/product-complement/produto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, produto_id: produtoId, grupo_id: grupoId }),
  });
  return resp.json().catch(() => null);
}

/* Aba "Complementos" do modal de produto: vincula/desvincula grupos de adicionais na hora (fora do Salvar do produto). */
export function ProdutoComplementosAba({ produtoId }: { produtoId: number | null }) {
  const [dados, setDados] = useState<{ vinculados: GrupoResumo[]; todos: GrupoResumo[] } | null>(null);
  const [vincularAberto, setVincularAberto] = useState(false);
  const [novoGrupoAberto, setNovoGrupoAberto] = useState(false);
  const [editandoGrupoId, setEditandoGrupoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!produtoId) return;
    const resp = await fetch(`/api/product-complement/produto?produto_id=${produtoId}`);
    const data = await resp.json().catch(() => null);
    setDados(data?.ok ? { vinculados: data.vinculados, todos: data.todos } : { vinculados: [], todos: [] });
  }, [produtoId]);

  useEffect(() => {
    if (!produtoId) return;
    let cancelado = false;
    fetch(`/api/product-complement/produto?produto_id=${produtoId}`)
      .then((r) => r.json())
      .then((data) => !cancelado && setDados(data?.ok ? { vinculados: data.vinculados, todos: data.todos } : { vinculados: [], todos: [] }))
      .catch(() => !cancelado && setDados({ vinculados: [], todos: [] }));
    return () => {
      cancelado = true;
    };
  }, [produtoId]);

  if (!produtoId) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
        <SquarePlus size={24} />
        <p className="text-sm">Salve o produto primeiro para vincular complementos.</p>
      </div>
    );
  }
  const idProduto = produtoId;

  async function desvincular(grupo: GrupoResumo) {
    const data = await postVinculo("desvincular", idProduto, grupo.id);
    if (!data?.ok) {
      toast.error(data?.msg ?? "Não foi possível desvincular o grupo.");
      return;
    }
    toast.success("Grupo desvinculado");
    await carregar();
  }

  const idsVinculados = new Set(dados?.vinculados.map((g) => g.id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-semibold">Grupo vinculados</div>
        <p className="text-sm">Aqui serão listados os grupos de adicionais disponíveis para este produto.</p>
      </div>

      {dados === null && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {dados?.vinculados.length === 0 && <p className="mt-2 text-sm">Você não vinculou nenhum grupo de adicionais para este produto.</p>}

      {dados?.vinculados.map((g) => (
        <div
          key={g.id}
          onClick={() => setEditandoGrupoId(g.id)}
          className="flex cursor-pointer flex-col gap-0.5 rounded-xl border p-4 shadow-xs transition-colors hover:bg-muted/30"
        >
          <div className="text-sm font-semibold">{g.nome}</div>
          <div className="text-sm text-muted-foreground">
            {g.ativo ? "disponível" : "indisponível"} em {plural(g.totalProdutos, "produto", "produtos")} e{" "}
            {plural(g.totalCategorias, "categoria", "categorias")}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void desvincular(g);
            }}
            className="mt-1 w-fit text-sm text-primary hover:underline"
          >
            Desvincular grupo
          </button>
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <Button className={BOTAO_PRIMARIO_CLASSE} onClick={() => setVincularAberto(true)} disabled={dados === null}>
          Adicionar grupo
        </Button>
      </div>

      {vincularAberto && dados && (
        <VincularGrupoDialog
          open={vincularAberto}
          onOpenChange={setVincularAberto}
          grupos={dados.todos.filter((g) => !idsVinculados.has(g.id))}
          onNovoGrupo={() => {
            setVincularAberto(false);
            setNovoGrupoAberto(true);
          }}
          onVincular={async (grupoId) => {
            const data = await postVinculo("vincular", idProduto, grupoId);
            if (!data?.ok) {
              toast.error(data?.msg ?? "Não foi possível vincular o grupo.");
              return;
            }
            toast.success("Grupo vinculado");
            setVincularAberto(false);
            await carregar();
          }}
        />
      )}

      {editandoGrupoId !== null && (
        <GrupoEditarDialog
          open
          onOpenChange={(v) => !v && setEditandoGrupoId(null)}
          grupoId={editandoGrupoId}
          onAlterado={() => void carregar()}
        />
      )}

      {novoGrupoAberto && (
        <GrupoConfigDialog
          open={novoGrupoAberto}
          onOpenChange={setNovoGrupoAberto}
          grupo={null}
          produtos={[]}
          categorias={[]}
          produtoFixoId={idProduto}
          onSalvo={() => void carregar()}
        />
      )}
    </div>
  );
}
