"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { ComplementoGrupo } from "@/db/queries/complementos";
import type { OpcaoVinculo } from "./complementos-manager";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";

type Etapa = "nome" | "quantidade" | "vinculo";

const ETAPAS: { chave: Etapa; titulo: string }[] = [
  { chave: "nome", titulo: "Configuração do grupo" },
  { chave: "quantidade", titulo: "Quantidade de escolhas" },
  { chave: "vinculo", titulo: "Onde o grupo aparece" },
];

function apenasNumero(v: string) {
  return v.replace(/\D/g, "").slice(0, 3);
}

/* Criacao/edicao do grupo em 3 etapas: nome -> quantidades (min/max/obrigatorio) -> produtos e categorias vinculados.
   O estado nasce das props: quem usa remonta o dialog (key) a cada abertura. */
export function GrupoConfigDialog({
  open,
  onOpenChange,
  grupo,
  produtos,
  categorias,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupo: ComplementoGrupo | null;
  produtos: OpcaoVinculo[];
  categorias: OpcaoVinculo[];
  onSalvo: () => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("nome");
  const [nome, setNome] = useState(grupo?.nome ?? "");
  const [ativo, setAtivo] = useState(grupo?.ativo ?? true);
  const [obrigatorio, setObrigatorio] = useState(grupo?.obrigatorio ?? false);
  const [minimo, setMinimo] = useState(String(grupo?.quantidadeMinima ?? 0));
  const [maximo, setMaximo] = useState(String(grupo ? grupo.quantidadeMaxima : 1));
  const [produtoIds, setProdutoIds] = useState<number[]>(grupo?.produtoIds ?? []);
  const [categoriaIds, setCategoriaIds] = useState<number[]>(grupo?.categoriaIds ?? []);
  const [abaVinculo, setAbaVinculo] = useState<"produtos" | "categorias">("produtos");
  const [buscaVinculo, setBuscaVinculo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const indiceEtapa = ETAPAS.findIndex((e) => e.chave === etapa);
  const min = Number(minimo || 0);
  const max = Number(maximo || 0);

  function avancar() {
    setErro(null);
    if (etapa === "nome") {
      if (!nome.trim()) {
        setErro("Informe o nome do grupo.");
        return;
      }
      setEtapa("quantidade");
      return;
    }
    if (etapa === "quantidade") {
      if (max > 0 && min > max) {
        setErro("A quantidade mínima não pode ser maior que a máxima.");
        return;
      }
      setEtapa("vinculo");
      return;
    }
    void salvar();
  }

  function voltar() {
    setErro(null);
    setEtapa(ETAPAS[Math.max(0, indiceEtapa - 1)].chave);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const resp = await fetch("/api/product-complement/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: grupo?.id,
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
      toast.success(grupo ? "Grupo atualizado" : "Grupo criado");
      onOpenChange(false);
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!grupo) return;
    setExcluindo(true);
    try {
      const resp = await fetch("/api/product-complement/grupos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: grupo.id }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível excluir o grupo.");
        return;
      }
      toast.success("Grupo excluído");
      setConfirmarExclusao(false);
      onOpenChange(false);
      onSalvo();
    } finally {
      setExcluindo(false);
    }
  }

  const listaVinculo = abaVinculo === "produtos" ? produtos : categorias;
  const selecionadosVinculo = abaVinculo === "produtos" ? produtoIds : categoriaIds;
  const setSelecionadosVinculo = abaVinculo === "produtos" ? setProdutoIds : setCategoriaIds;
  const termo = buscaVinculo.trim().toLowerCase();
  const listaFiltrada = termo ? listaVinculo.filter((o) => o.nome.toLowerCase().includes(termo)) : listaVinculo;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={MODAL_CLASSE}>
          <DialogHeader>
            <span className="text-xs font-medium text-muted-foreground">
              Etapa {indiceEtapa + 1} de {ETAPAS.length}
            </span>
            <DialogTitle className="text-base font-semibold">{ETAPAS[indiceEtapa].titulo}</DialogTitle>
          </DialogHeader>

          {etapa === "nome" && (
            <div className="flex flex-col gap-4">
              <DialogDescription>Escolha o nome do seu grupo de complementos.</DialogDescription>
              <div className="flex flex-col gap-2">
                <label htmlFor="grupo-nome" className="text-sm font-medium">
                  Nome do grupo <span className="text-destructive">*</span>
                </label>
                <input
                  id="grupo-nome"
                  className={CAMPO_CLASSE}
                  placeholder="Ex.: Escolha seu refrigerante."
                  maxLength={120}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && avancar()}
                  autoFocus
                />
              </div>
              {grupo && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                  <div>
                    <div className="text-sm font-semibold">Grupo disponível</div>
                    <div className="text-sm text-muted-foreground">Desativado, o grupo deixa de aparecer nos produtos.</div>
                  </div>
                  <Switch checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
                </div>
              )}
            </div>
          )}

          {etapa === "quantidade" && (
            <div className="flex flex-col gap-4">
              <DialogDescription>
                Defina quantos itens deste grupo o cliente pode escolher. Ex.: numa pizza de até 2 sabores, use mínimo 1 e máximo 2.
              </DialogDescription>
              <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
                <div>
                  <div className="text-sm font-semibold">Escolha obrigatória</div>
                  <div className="text-sm text-muted-foreground">O cliente precisa escolher ao menos um item para continuar.</div>
                </div>
                <Switch
                  checked={obrigatorio}
                  onCheckedChange={(v) => {
                    setObrigatorio(v === true);
                    if (v === true && min === 0) setMinimo("1");
                    if (v !== true) setMinimo("0");
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="grupo-min" className="text-sm font-medium">
                    Quantidade mínima
                  </label>
                  <input
                    id="grupo-min"
                    inputMode="numeric"
                    className={CAMPO_CLASSE}
                    value={minimo}
                    onChange={(e) => {
                      const v = apenasNumero(e.target.value);
                      setMinimo(v);
                      setObrigatorio(Number(v || 0) > 0);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="grupo-max" className="text-sm font-medium">
                    Quantidade máxima
                  </label>
                  <input id="grupo-max" inputMode="numeric" className={CAMPO_CLASSE} value={maximo} onChange={(e) => setMaximo(apenasNumero(e.target.value))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Deixe a quantidade máxima em 0 para não limitar as escolhas.</p>
            </div>
          )}

          {etapa === "vinculo" && (
            <div className="flex flex-col gap-4">
              <DialogDescription>
                Escolha em quais produtos o grupo aparece. Vinculando uma categoria, ele aparece em todos os produtos dela.
              </DialogDescription>
              <div className="flex w-fit items-center gap-1 rounded-full bg-muted p-1 text-sm">
                {(
                  [
                    { valor: "produtos", label: "Produtos", total: produtoIds.length },
                    { valor: "categorias", label: "Categorias", total: categoriaIds.length },
                  ] as const
                ).map((aba) => (
                  <button
                    key={aba.valor}
                    type="button"
                    onClick={() => setAbaVinculo(aba.valor)}
                    className={cn(
                      "rounded-full px-3 py-1.5 font-medium transition-colors",
                      abaVinculo === aba.valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {aba.label}
                    {aba.total > 0 && <span className="ml-1.5 text-xs text-primary">{aba.total}</span>}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  aria-label="Buscar"
                  className={cn(CAMPO_CLASSE, "pl-10")}
                  placeholder={abaVinculo === "produtos" ? "Buscar produto..." : "Buscar categoria..."}
                  value={buscaVinculo}
                  onChange={(e) => setBuscaVinculo(e.target.value)}
                />
              </div>
              <div className="-mr-2 flex max-h-[38vh] flex-col gap-1 overflow-y-auto pr-2">
                {listaFiltrada.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>}
                {listaFiltrada.map((o) => {
                  const marcado = selecionadosVinculo.includes(o.id);
                  return (
                    <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50">
                      <Checkbox
                        checked={marcado}
                        onCheckedChange={(v) =>
                          setSelecionadosVinculo((atual) => (v === true ? [...atual, o.id] : atual.filter((id) => id !== o.id)))
                        }
                      />
                      {o.nome}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex items-center gap-2">
            {grupo && etapa === "nome" && (
              <button type="button" onClick={() => setConfirmarExclusao(true)} className="text-sm font-medium text-destructive hover:underline">
                Excluir grupo
              </button>
            )}
            <div className="ml-auto flex gap-2">
              {indiceEtapa > 0 && (
                <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={voltar}>
                  Voltar
                </Button>
              )}
              <Button className={BOTAO_PRIMARIO_CLASSE} onClick={avancar} disabled={salvando}>
                {etapa === "vinculo" ? (salvando ? "Salvando..." : "Salvar") : "Avançar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        titulo="Excluir grupo?"
        descricao="O grupo e todos os itens dele serão excluídos. Essa ação não pode ser desfeita."
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}
