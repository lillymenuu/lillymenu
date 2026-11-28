"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Folder,
  GripVertical,
  ImageIcon,
  ImagePlus,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "./money-input";
import { ImageCropDialog } from "./image-crop-dialog";
import { ComboCategoriaDialog } from "./combo-categoria-dialog";
import { ComboItensDialog, urlImagemProduto } from "./combo-itens-dialog";
import {
  ComboPassoDialog,
  novaChavePasso,
  resumoRegraPasso,
  type PassoRascunho,
} from "./combo-passo-dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { Categoria, Produto } from "@/lib/produtos";
import type {
  Combo,
  ComboDetalheResposta,
  ComboSalvarResposta,
  ComboPassoSalvarResposta,
  ComboTipoPreco,
} from "@/lib/combos";
import { cn } from "cn";

type Tela = "nome" | "passos" | "preco" | "resumo";
const ORDEM_WIZARD: Tela[] = ["nome", "passos", "preco"];
const DESCRICAO_MAX = 1000;

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numero(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Preco da opcao dentro do combo: o definido no combo ou, se vazio, o preco normal do produto. */
function precoNoCombo(o: PassoRascunho["opcoes"][number]): number {
  return o.precoCombo !== "" ? numero(o.precoCombo) : o.preco;
}

/** "escolhe 1", "escolhe de 1 a 3", "ate 2" */
function regraCurta(p: PassoRascunho): string {
  const min = Number(p.min) || 0;
  const max = Number(p.max) || 1;
  if (!p.obrigatorio) return `até ${max}`;
  return min === max ? `escolhe ${min}` : `escolhe de ${min} a ${max}`;
}

/** Menor valor possivel de um combo "preco por opcao": soma, nos passos obrigatorios, do minimo de itens pela opcao mais barata. */
function precoMinimoPorOpcao(passos: PassoRascunho[]): number {
  let total = 0;
  for (const p of passos) {
    if (!p.obrigatorio || p.opcoes.length === 0) continue;
    const min = Math.max(1, parseInt(p.min, 10) || 1);
    const precos = p.opcoes.map(precoNoCombo).sort((a, b) => a - b);
    total += p.permiteRepetir
      ? precos[0] * min
      : precos.slice(0, min).reduce((s, x) => s + x, 0);
  }
  return Math.round(total * 100) / 100;
}

/** Nome sugerido para o passo pela categoria das opcoes ("Escolha sobremesas"). */
function sugerirNomePasso(ids: number[], produtos: Produto[]): string {
  const cats = new Set(
    ids
      .map((id) => produtos.find((p) => p.id === id)?.categoria)
      .filter(Boolean) as string[],
  );
  if (cats.size === 1)
    return `Escolha ${[...cats][0].toLocaleLowerCase("pt-BR")}`;
  return "Escolha uma opção";
}

async function postJson<T>(
  url: string,
  body: unknown,
): Promise<T | { ok: false; msg?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * Cadastro de combo em 3 passos (nome e foto -> o que vem no combo -> preco). Um combo ja criado abre
 * num resumo com "Editar" em cada parte. Tudo fica no formulario e so e gravado ao concluir/salvar.
 */
export function ComboFormDialog({
  open,
  onOpenChange,
  categorias,
  produtos,
  combo,
  categoriaPadrao,
  phpAdminUrl,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
  produtos: Produto[];
  combo: Combo | null;
  categoriaPadrao?: number | null;
  phpAdminUrl: string;
  onSalvo: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[1240px] max-w-[calc(100%-1.5rem)] flex-col gap-0 rounded-3xl p-0 sm:max-w-[min(1240px,calc(100%-2rem))]">
        <ComboFormCorpo
          key={combo?.id ?? "novo"}
          onFechar={() => onOpenChange(false)}
          categorias={categorias}
          produtos={produtos}
          combo={combo}
          categoriaPadrao={categoriaPadrao ?? null}
          phpAdminUrl={phpAdminUrl}
          onSalvo={onSalvo}
        />
      </DialogContent>
    </Dialog>
  );
}

/* Montado a cada abertura do modal (o estado comeca limpo ou com o combo carregado). */
function ComboFormCorpo({
  onFechar,
  categorias,
  produtos,
  combo,
  categoriaPadrao,
  phpAdminUrl,
  onSalvo,
}: {
  onFechar: () => void;
  categorias: Categoria[];
  produtos: Produto[];
  combo: Combo | null;
  categoriaPadrao: number | null;
  phpAdminUrl: string;
  onSalvo: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tela, setTela] = useState<Tela>(combo ? "resumo" : "nome");
  const editando = combo !== null;

  const [comboId, setComboId] = useState<number | null>(combo?.id ?? null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | null>(
    categoriaPadrao,
  );
  const [tipoPreco, setTipoPreco] = useState<ComboTipoPreco>("por_combo");
  const [preco, setPreco] = useState("");
  const [promoAtiva, setPromoAtiva] = useState(false);
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemRemover, setImagemRemover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [passos, setPassos] = useState<PassoRascunho[]>([]);
  const [passosGravados, setPassosGravados] = useState<number[]>([]);
  const [arrastandoIdx, setArrastandoIdx] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(combo !== null);

  /* Fluxo do passo: escolher itens -> nome e regra. */
  const [passoDraft, setPassoDraft] = useState<PassoRascunho | null>(null);
  const [passoEditIdx, setPassoEditIdx] = useState<number | null>(null);
  const [etapaPasso, setEtapaPasso] = useState<"itens" | "config" | null>(null);
  const [nomeSugerido, setNomeSugerido] = useState("");

  const [trocarCategoriaOpen, setTrocarCategoriaOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /* Ao abrir uma parte pelo resumo, guarda como estava: a seta de voltar desfaz; "Concluir" mantem. */
  const copiaAntesDeEditar = useRef<{
    nome: string;
    descricao: string;
    categoriaId: number | null;
    ativo: boolean;
    imagemPreview: string | null;
    imagemBase64: string | null;
    imagemRemover: boolean;
    passos: PassoRascunho[];
    tipoPreco: ComboTipoPreco;
    preco: string;
    promoAtiva: boolean;
    precoPromocional: string;
  } | null>(null);

  function editarParte(t: Tela) {
    copiaAntesDeEditar.current = {
      nome,
      descricao,
      categoriaId,
      ativo,
      imagemPreview,
      imagemBase64,
      imagemRemover,
      passos,
      tipoPreco,
      preco,
      promoAtiva,
      precoPromocional,
    };
    setErro(null);
    setTela(t);
  }

  function voltarSemSalvarParte() {
    const c = copiaAntesDeEditar.current;
    if (c) {
      setNome(c.nome);
      setDescricao(c.descricao);
      setCategoriaId(c.categoriaId);
      setAtivo(c.ativo);
      setImagemPreview(c.imagemPreview);
      setImagemBase64(c.imagemBase64);
      setImagemRemover(c.imagemRemover);
      setPassos(c.passos);
      setTipoPreco(c.tipoPreco);
      setPreco(c.preco);
      setPromoAtiva(c.promoAtiva);
      setPrecoPromocional(c.precoPromocional);
    }
    copiaAntesDeEditar.current = null;
    setErro(null);
    setTela("resumo");
  }

  function aplicarDetalhe(
    data: ComboDetalheResposta | { ok: false; msg?: string },
  ) {
    if (!data.ok) {
      toast.error(data.msg ?? "Erro ao carregar o combo.");
      return;
    }
    setNome(data.combo.nome);
    setDescricao(data.combo.descricao ?? "");
    setCategoriaId(data.combo.categoria_id ?? null);
    setTipoPreco(data.combo.tipo_preco);
    setPreco(String(data.combo.preco));
    setPromoAtiva(
      Boolean(Number(data.combo.preco_promocional)) &&
        data.combo.promo_desativado !== 1,
    );
    setPrecoPromocional(
      data.combo.preco_promocional ? String(data.combo.preco_promocional) : "",
    );
    setAtivo(data.combo.ativo === 1);
    setImagemPreview(
      data.combo.imagem
        ? data.combo.imagem.startsWith("http")
          ? data.combo.imagem
          : `${phpAdminUrl}/${data.combo.imagem}`
        : null,
    );
    setPassos(
      data.passos.map((p) => ({
        chave: novaChavePasso(),
        id: p.id,
        nome: p.nome,
        descricao: p.descricao ?? "",
        obrigatorio: p.obrigatorio === 1,
        min: String(p.min_itens),
        max: String(p.max_itens),
        permiteRepetir: p.permite_repetir === 1,
        opcoes: p.opcoes.map((o) => ({
          id: o.id,
          nome: o.nome,
          preco: Number(o.preco) || 0,
          imagem: o.imagem,
          precoCombo:
            o.preco_combo !== null && o.preco_combo !== undefined
              ? String(Number(o.preco_combo))
              : "",
        })),
      })),
    );
    setPassosGravados(data.passos.map((p) => p.id));
  }

  useEffect(() => {
    if (!combo) return;
    fetch(`/api/combos/detalhe/${combo.id}`)
      .then((res) => res.json())
      .then(aplicarDetalhe)
      .catch(() => toast.error("Erro ao carregar o combo."))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- foto ---------- */
  function handleImagemSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setCropOpen(true);
  }
  function handleCropConfirm(dataUrl: string) {
    setImagemBase64(dataUrl);
    setImagemPreview(dataUrl);
    setImagemRemover(false);
  }
  function removerImagem() {
    setImagemBase64(null);
    setImagemPreview(null);
    setImagemRemover(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ---------- passos ---------- */
  function abrirNovoPasso() {
    setPassoDraft({
      chave: novaChavePasso(),
      nome: "",
      descricao: "",
      obrigatorio: true,
      min: "1",
      max: "1",
      permiteRepetir: false,
      opcoes: [],
    });
    setPassoEditIdx(null);
    setNomeSugerido("");
    setEtapaPasso("itens");
  }
  function abrirEdicaoPasso(idx: number) {
    setPassoDraft({ ...passos[idx] });
    setPassoEditIdx(idx);
    setNomeSugerido("");
    setEtapaPasso("config");
  }
  function itensEscolhidos(ids: number[]) {
    if (!passoDraft) return;
    const anteriores = new Map(passoDraft.opcoes.map((o) => [o.id, o]));
    const opcoes = ids.map((id) => {
      const p = produtos.find((x) => x.id === id);
      const antes = anteriores.get(id);
      return p
        ? {
            id,
            nome: p.nome,
            preco: Number(p.preco_base) || 0,
            imagem: p.imagem,
            precoCombo: antes?.precoCombo ?? "",
          }
        : (antes ?? { id, nome: `#${id}`, preco: 0, precoCombo: "" });
    });
    const sugestao = sugerirNomePasso(ids, produtos);
    /* So troca o nome se ele estiver vazio ou ainda for a sugestao anterior. */
    const nomeNovo =
      !passoDraft.nome.trim() || passoDraft.nome === nomeSugerido
        ? sugestao
        : passoDraft.nome;
    setNomeSugerido(sugestao);
    setPassoDraft({ ...passoDraft, opcoes, nome: nomeNovo });
    setEtapaPasso("config");
  }
  function confirmarPasso() {
    if (!passoDraft) return;
    const limpo = {
      ...passoDraft,
      nome: passoDraft.nome.trim(),
      min: passoDraft.obrigatorio ? passoDraft.min : "0",
    };
    setPassos((atual) =>
      passoEditIdx === null
        ? [...atual, limpo]
        : atual.map((p, i) => (i === passoEditIdx ? limpo : p)),
    );
    setEtapaPasso(null);
    setPassoDraft(null);
    setErro(null);
  }
  function alterarPrecoOpcao(chave: string, produtoId: number, valor: string) {
    setPassos((atual) =>
      atual.map((p) =>
        p.chave !== chave
          ? p
          : {
              ...p,
              opcoes: p.opcoes.map((o) =>
                o.id === produtoId ? { ...o, precoCombo: valor } : o,
              ),
            },
      ),
    );
  }

  function removerPasso(idx: number) {
    setPassos((atual) => atual.filter((_, i) => i !== idx));
  }
  function onDropPasso(destino: number) {
    if (arrastandoIdx === null || arrastandoIdx === destino) return;
    setPassos((atual) => {
      const copia = [...atual];
      const [item] = copia.splice(arrastandoIdx, 1);
      copia.splice(destino, 0, item);
      return copia;
    });
    setArrastandoIdx(null);
  }

  /* ---------- validacao e gravacao ---------- */
  function validar(t: Tela): string | null {
    if (t === "nome" && !nome.trim()) return "Informe o nome do combo.";
    if (t === "passos" && passos.length === 0)
      return "Adicione pelo menos um passo ao combo.";
    if (t === "preco" && tipoPreco === "por_combo") {
      const p = numero(preco);
      if (p <= 0) return "Informe o preço do combo.";
      if (promoAtiva) {
        const promo = numero(precoPromocional);
        if (promo <= 0) return "Informe o preço com promoção.";
        if (promo >= p)
          return "O preço com promoção precisa ser menor que o preço do combo.";
      }
    }
    return null;
  }

  function irPara(proxima: Tela) {
    const msg = validar(tela);
    if (msg) {
      setErro(msg);
      return;
    }
    setErro(null);
    setTela(proxima);
  }

  async function gravar() {
    for (const t of ORDEM_WIZARD) {
      const msg = validar(t);
      if (msg) {
        setErro(msg);
        if (!editando) setTela(t);
        return;
      }
    }
    setErro(null);
    setSalvando(true);
    try {
      const porItem = tipoPreco === "por_item";
      const resCombo = await postJson<ComboSalvarResposta>(
        "/api/combos/salvar",
        {
          id: comboId ?? 0,
          categoria_id: categoriaId ?? "",
          nome: nome.trim(),
          descricao: descricao.trim(),
          tipo_preco: tipoPreco,
          preco: porItem ? precoMinimoPorOpcao(passos) : numero(preco),
          preco_promocional:
            !porItem && promoAtiva ? numero(precoPromocional) : "",
          promo_desativado: !porItem && promoAtiva ? 0 : 1,
          imagem_base64: imagemBase64 ?? "",
          imagem_remover: imagemRemover ? "1" : "0",
          ativo: ativo ? 1 : 0,
        },
      );
      if (!resCombo.ok) {
        setErro(resCombo.msg ?? "Erro ao salvar o combo.");
        return;
      }
      const id = resCombo.combo_id;
      setComboId(id);
      setImagemBase64(null);
      setImagemRemover(false);

      /* Passos: apaga os removidos, grava os atuais (na ordem) e fixa a ordem. */
      const atuaisIds = new Set(passos.map((p) => p.id).filter(Boolean));
      for (const antigo of passosGravados.filter((x) => !atuaisIds.has(x))) {
        await postJson("/api/combos/passo-excluir", { passo_id: antigo });
      }
      const gravados: PassoRascunho[] = [];
      for (const p of passos) {
        const r = await postJson<ComboPassoSalvarResposta>(
          "/api/combos/passo-salvar",
          {
            passo_id: p.id ?? 0,
            combo_id: id,
            nome: p.nome,
            descricao: p.descricao,
            obrigatorio: p.obrigatorio ? 1 : 0,
            min_itens: p.obrigatorio
              ? Math.max(1, parseInt(p.min, 10) || 1)
              : 0,
            max_itens: Math.max(1, parseInt(p.max, 10) || 1),
            permite_repetir: p.permiteRepetir ? 1 : 0,
            produto_ids: p.opcoes.map((o) => o.id).join(","),
            /* So grava preco proprio no combo "por opcao" e quando difere do preco normal. */
            precos_combo: Object.fromEntries(
              p.opcoes.map((o) => [
                o.id,
                porItem &&
                o.precoCombo !== "" &&
                numero(o.precoCombo) !== o.preco
                  ? numero(o.precoCombo)
                  : null,
              ]),
            ),
          },
        );
        if (!r.ok) {
          setPassos([...gravados, ...passos.slice(gravados.length)]);
          setPassosGravados(
            [...gravados, ...passos.slice(gravados.length)]
              .map((g) => g.id)
              .filter((x): x is number => Boolean(x)),
          );
          setErro(r.msg ?? `Erro ao salvar o passo "${p.nome}".`);
          return;
        }
        gravados.push({ ...p, id: r.passo_id });
      }
      if (gravados.length > 0) {
        await postJson("/api/combos/passos-reordenar", {
          combo_id: id,
          passo_ids: gravados.map((g) => g.id).join(","),
        });
      }
      setPassos(gravados);
      setPassosGravados(gravados.map((g) => g.id!));

      toast.success(editando ? "Combo atualizado." : "Combo cadastrado.");
      onSalvo();
      router.refresh();
      onFechar();
    } catch {
      setErro("Erro ao salvar o combo.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirCombo() {
    if (!comboId) return;
    setExcluindo(true);
    try {
      const data = await postJson<{ ok: true }>("/api/combos/excluir", {
        combo_id: comboId,
      });
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir o combo.");
        return;
      }
      toast.success("Combo excluído.");
      setConfirmExcluirOpen(false);
      onFechar();
      onSalvo();
      router.refresh();
    } catch {
      toast.error("Erro ao excluir o combo.");
    } finally {
      setExcluindo(false);
    }
  }

  /* ---------- textos de resumo ---------- */
  const categoriaNome =
    categorias.find((c) => c.id === categoriaId)?.nome ?? "Sem categoria";
  const precoNum = numero(preco);
  const promoNum = numero(precoPromocional);
  const resumoPreco =
    tipoPreco === "por_item"
      ? `Preço por opção · a partir de ${brl(precoMinimoPorOpcao(passos))}`
      : `Preço fixo · ${brl(precoNum)}${promoAtiva && promoNum > 0 ? ` · promoção ${brl(promoNum)}` : ""}`;

  const passoAtualWizard = ORDEM_WIZARD.indexOf(tela) + 1;
  const campo = "h-10 rounded-full border-0 bg-muted/60 px-4 text-sm";

  /* ---------- telas ---------- */
  function cabecalho(titulo: string, subtitulo: string) {
    return (
      <>
        {!editando && (
          <div className="mb-6">
            <div className="mb-2 text-right text-xs text-muted-foreground">
              Passo {passoAtualWizard} de 3
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${(passoAtualWizard / 3) * 100}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          {editando && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-2 rounded-full"
              onClick={voltarSemSalvarParte}
              aria-label="Voltar ao resumo sem alterar"
              title="Voltar sem alterar"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>
      </>
    );
  }

  const telaNome = (
    <>
      {cabecalho(
        "Como se chama o combo?",
        "O nome e a foto que o cliente vê no cardápio. A descrição é opcional.",
      )}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[144px_1fr]">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Foto</span>
          <div className="relative size-36">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex size-full items-center justify-center overflow-hidden rounded-2xl border bg-muted/60 transition-colors hover:bg-muted"
              title="Escolher foto"
            >
              {imagemPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagemPreview}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                  <ImagePlus size={24} /> Adicionar foto
                </span>
              )}
            </button>
            {imagemPreview && (
              <button
                type="button"
                onClick={removerImagem}
                aria-label="Remover foto"
                className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md transition-colors hover:text-destructive"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <span className="text-xs text-muted-foreground">Imagem quadrada</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImagemSelecionada}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-0.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c-nome" className="text-sm font-medium">
              Nome do combo<span className="text-destructive">*</span>
            </label>
            <Input
              id="c-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={150}
              autoFocus={!editando}
              className={campo}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="c-descricao" className="text-sm font-medium">
              Descrição (opcional)
            </label>
            <textarea
              id="c-descricao"
              value={descricao}
              onChange={(e) =>
                setDescricao(e.target.value.slice(0, DESCRICAO_MAX))
              }
              rows={3}
              placeholder="Ex.: um salgado + uma sobremesa à sua escolha"
              className="resize-none rounded-2xl border-0 bg-muted/60 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-primary/40"
            />
            <span className="text-xs text-muted-foreground">
              {descricao.length}/{DESCRICAO_MAX}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTrocarCategoriaOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-muted/60 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-muted"
          >
            <Folder size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Categoria:</span>
            <span className="min-w-0 truncate font-semibold">
              {categoriaNome}
            </span>
            <span className="ml-auto shrink-0 text-xs font-medium text-primary">
              Trocar
            </span>
          </button>
          {editando && (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3">
              <span>
                <span className="block text-sm font-medium">
                  Visível no cardápio
                </span>
                <span className="block text-xs text-muted-foreground">
                  Desligado, o combo some do cardápio e do PDV.
                </span>
              </span>
              <Switch
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
            </label>
          )}
        </div>
      </div>
    </>
  );

  const telaPassos = (
    <>
      {cabecalho(
        "O que vem no combo?",
        "Cada passo é uma escolha do cliente, como o lanche, o acompanhamento e a bebida.",
      )}
      <div className="mt-6">
        {carregando ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : passos.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListChecks size={20} />
            </span>
            <span className="mt-4 text-sm font-semibold">
              Nenhum passo ainda
            </span>
            <span className="mt-1 max-w-sm text-sm text-muted-foreground">
              Comece pelo item principal. Depois adicione os outros, como
              acompanhamento e bebida.
            </span>
            <Button className="mt-4 rounded-full" onClick={abrirNovoPasso}>
              <Plus size={15} /> Adicionar primeiro passo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {passos.map((p, idx) => (
              <div
                key={p.chave}
                draggable
                onDragStart={() => setArrastandoIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropPasso(idx)}
                onDragEnd={() => setArrastandoIdx(null)}
                className={cn(
                  "flex gap-3 rounded-2xl border bg-card p-4 transition-opacity",
                  arrastandoIdx === idx && "opacity-50",
                )}
              >
                <GripVertical
                  size={16}
                  className="mt-0.5 shrink-0 cursor-grab text-muted-foreground"
                  aria-label="Arraste para reordenar"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {idx + 1}. {p.nome}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {resumoRegraPasso(p)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.opcoes.map((o) => (
                      <span
                        key={o.id}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                      >
                        {o.nome}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 items-start gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => abrirEdicaoPasso(idx)}
                    aria-label={`Editar passo ${p.nome}`}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removerPasso(idx)}
                    aria-label={`Excluir passo ${p.nome}`}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={abrirNovoPasso}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/40 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Plus size={15} /> Adicionar passo
            </button>
          </div>
        )}
      </div>
    </>
  );

  const telaPreco = (
    <>
      {cabecalho(
        "Quanto custa o combo?",
        "Escolha como cobrar: um valor fixo ou a soma das opções que o cliente escolher.",
      )}
      <div className="mt-6 flex w-fit items-center gap-1 rounded-full bg-muted p-1 text-sm">
        {(
          [
            { valor: "por_combo", rotulo: "Preço fixo" },
            { valor: "por_item", rotulo: "Preço por opção" },
          ] as const
        ).map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => {
              setTipoPreco(o.valor);
              setErro(null);
            }}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium transition-colors",
              tipoPreco === o.valor
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {tipoPreco === "por_combo"
          ? "Um valor só, qualquer que seja a opção que o cliente escolher."
          : "O combo custa a soma das opções que o cliente escolher. Já preenchemos com o preço normal de cada produto."}
      </p>

      <div
        className={cn(
          "mt-5",
          tipoPreco === "por_combo" && "rounded-2xl border p-5",
        )}
      >
        {tipoPreco === "por_combo" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5 p-0.5">
              <label htmlFor="c-preco" className="text-sm font-medium">
                Preço do combo
              </label>
              <MoneyInput
                id="c-preco"
                value={preco}
                onChange={setPreco}
                className={campo}
              />
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <span>
                <span className="block text-sm font-medium">
                  Preço promocional
                </span>
                {promoAtiva && promoNum > 0 && promoNum < precoNum && (
                  <span className="block text-sm text-muted-foreground">
                    O cliente paga {brl(promoNum)} no lugar de {brl(precoNum)}
                  </span>
                )}
              </span>
              <Switch
                checked={promoAtiva}
                onCheckedChange={(v) => setPromoAtiva(v === true)}
              />
            </label>
            {promoAtiva && (
              <div className="flex flex-col gap-1.5 p-0.5">
                <label htmlFor="c-preco-promo" className="text-sm font-medium">
                  Preço com promoção
                </label>
                <MoneyInput
                  id="c-preco-promo"
                  value={precoPromocional}
                  onChange={setPrecoPromocional}
                  className={campo}
                />
              </div>
            )}
          </div>
        ) : passos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Adicione os passos do combo para ver os preços das opções.
          </p>
        ) : (
          <div className="space-y-7">
            {passos.map((p, idx) => (
              <section key={p.chave}>
                <div className="text-sm font-semibold">
                  {idx + 1}. {p.nome}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {p.opcoes.length} {p.opcoes.length === 1 ? "opção" : "opções"}{" "}
                  · {p.obrigatorio ? "obrigatório" : "opcional"} ·{" "}
                  {regraCurta(p)}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {p.opcoes.map((o) => (
                    <div key={o.id} className="rounded-2xl border p-3.5">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={urlImagemProduto(
                            o.imagem ??
                              produtos.find((x) => x.id === o.id)?.imagem,
                            phpAdminUrl,
                          )}
                          alt=""
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                        <span className="line-clamp-2 min-w-0 text-[13px] leading-snug font-medium">
                          {o.nome}
                        </span>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Fora do combo: {brl(o.preco)}
                      </div>
                      <label
                        htmlFor={`preco-op-${p.chave}-${o.id}`}
                        className="mt-2.5 mb-1.5 block text-sm font-medium"
                      >
                        Preço no combo
                      </label>
                      <MoneyInput
                        id={`preco-op-${p.chave}-${o.id}`}
                        value={
                          o.precoCombo !== "" ? o.precoCombo : String(o.preco)
                        }
                        onChange={(v) => alterarPrecoOpcao(p.chave, o.id, v)}
                        className={campo}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Menor valor possível do combo
              </span>
              <span className="font-semibold tabular-nums">
                a partir de {brl(precoMinimoPorOpcao(passos))}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const linhasResumo: {
    icone: React.ComponentType<{ size?: number; className?: string }>;
    titulo: string;
    texto: string;
    tela: Tela;
  }[] = [
    {
      icone: ImageIcon,
      titulo: "Nome e foto",
      texto: `${nome || "Sem nome"} · categoria ${categoriaNome} · ${ativo ? "visível no cardápio" : "oculto no cardápio"}`,
      tela: "nome",
    },
    {
      icone: ListChecks,
      titulo: "Passos",
      texto:
        passos.length === 0
          ? "Nenhum passo"
          : `${passos.length} ${passos.length === 1 ? "passo" : "passos"} · ${passos.map((p) => p.nome).join(", ")}`,
      tela: "passos",
    },
    { icone: Tag, titulo: "Preço", texto: resumoPreco, tela: "preco" },
  ];

  const telaResumo = carregando ? (
    <div className="flex justify-center py-20 text-muted-foreground">
      <Loader2 className="animate-spin" size={22} />
    </div>
  ) : (
    <>
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
          {imagemPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagemPreview}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon size={24} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight">
            {nome}
          </h2>
          {descricao && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {descricao}
            </p>
          )}
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {linhasResumo.map((l) => (
          <button
            type="button"
            key={l.titulo}
            onClick={() => editarParte(l.tela)}
            className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:outline-none"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <l.icone size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{l.titulo}</div>
              <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {l.texto}
              </div>
            </div>
            <span className="shrink-0 rounded-full border bg-background px-3.5 py-1.5 text-[13px] font-medium transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
              Editar
            </span>
          </button>
        ))}
      </div>
    </>
  );

  /* ---------- rodape ---------- */
  let rodape: React.ReactNode;
  if (editando && tela === "resumo") {
    rodape = (
      <>
        <Button
          variant="outline"
          className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmExcluirOpen(true)}
          disabled={salvando || carregando}
        >
          Excluir combo
        </Button>
        <Button
          className="rounded-full px-5"
          onClick={gravar}
          disabled={salvando || carregando}
        >
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </>
    );
  } else if (editando) {
    rodape = (
      <Button className="rounded-full px-5" onClick={() => irPara("resumo")}>
        Concluir
      </Button>
    );
  } else if (tela === "nome") {
    rodape = (
      <>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => onFechar()}
        >
          Cancelar
        </Button>
        <Button className="rounded-full px-5" onClick={() => irPara("passos")}>
          Continuar
        </Button>
      </>
    );
  } else if (tela === "passos") {
    rodape = (
      <>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setTela("nome")}
        >
          Voltar
        </Button>
        <Button
          className="rounded-full px-5"
          disabled={passos.length === 0}
          onClick={() => irPara("preco")}
        >
          Continuar
        </Button>
      </>
    );
  } else {
    rodape = (
      <>
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => setTela("passos")}
          disabled={salvando}
        >
          Voltar
        </Button>
        <Button
          className="rounded-full px-5"
          onClick={gravar}
          disabled={salvando}
        >
          {salvando ? "Cadastrando..." : "Cadastrar combo"}
        </Button>
      </>
    );
  }

  return (
    <>
      <DialogHeader className="shrink-0 px-6 pt-5 pb-2">
        <DialogTitle className="truncate pr-8 text-base font-medium">
          {editando ? nome || "Combo" : "Novo combo"}
        </DialogTitle>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <div
          key={tela}
          className="mx-auto w-full max-w-[690px] animate-in py-8 duration-300 fade-in slide-in-from-bottom-1"
        >
          {tela === "nome"
            ? telaNome
            : tela === "passos"
              ? telaPassos
              : tela === "preco"
                ? telaPreco
                : telaResumo}
          {erro && <p className="mt-5 text-sm text-destructive">{erro}</p>}
        </div>
      </div>

      <div className="mx-6 flex shrink-0 flex-col-reverse gap-2 border-t py-4 sm:flex-row sm:justify-end">
        {rodape}
      </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={cropFile}
        onConfirm={handleCropConfirm}
      />
      <ComboCategoriaDialog
        open={trocarCategoriaOpen}
        onOpenChange={setTrocarCategoriaOpen}
        categorias={categorias}
        inicial={categoriaId}
        onContinuar={(id) => {
          setCategoriaId(id);
          setTrocarCategoriaOpen(false);
        }}
      />
      <ComboItensDialog
        open={etapaPasso === "itens"}
        onOpenChange={(v) => {
          if (v) return;
          /* Cancelar na escolha de itens: num passo novo descarta; ao "Alterar" volta pra configuracao. */
          setEtapaPasso(
            passoDraft && passoDraft.opcoes.length > 0 ? "config" : null,
          );
        }}
        produtos={produtos}
        categorias={categorias}
        selecionadosIniciais={passoDraft?.opcoes.map((o) => o.id) ?? []}
        phpAdminUrl={phpAdminUrl}
        onContinuar={itensEscolhidos}
      />
      {passoDraft && (
        <ComboPassoDialog
          open={etapaPasso === "config"}
          onOpenChange={(v) => {
            if (!v) {
              setEtapaPasso(null);
              setPassoDraft(null);
            }
          }}
          passo={passoDraft}
          onChange={setPassoDraft}
          novo={passoEditIdx === null}
          onAlterarOpcoes={() => setEtapaPasso("itens")}
          onConfirmar={confirmarPasso}
        />
      )}
      <ConfirmDialog
        open={confirmExcluirOpen}
        onOpenChange={setConfirmExcluirOpen}
        titulo="Excluir combo"
        descricao={`Tem certeza que deseja excluir o combo "${nome}"? Essa ação não pode ser desfeita.`}
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={excluirCombo}
      />
    </>
  );
}
