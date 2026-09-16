"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "./money-input";
import { ImageCropDialog } from "./image-crop-dialog";
import { ComboPassoDialog } from "./combo-passo-dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { Categoria, Produto } from "@/lib/produtos";
import type { Combo, ComboDetalheResposta, ComboPasso, ComboSalvarResposta, ComboTipoPreco } from "@/lib/combos";
import { cn } from "cn";

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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [comboId, setComboId] = useState<number | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
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

  const [passos, setPassos] = useState<ComboPasso[]>([]);
  const [carregandoPassos, setCarregandoPassos] = useState(false);
  const [passoDialogOpen, setPassoDialogOpen] = useState(false);
  const [passoEditando, setPassoEditando] = useState<ComboPasso | null>(null);
  const [arrastandoIdx, setArrastandoIdx] = useState<number | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setImagemBase64(null);
    setImagemRemover(false);

    if (combo) {
      setComboId(combo.id);
      carregarDetalhe(combo.id);
    } else {
      setComboId(null);
      setNome("");
      setDescricao("");
      setCategoriaId(categoriaPadrao ? String(categoriaPadrao) : "");
      setTipoPreco("por_combo");
      setPreco("");
      setPromoAtiva(false);
      setPrecoPromocional("");
      setAtivo(true);
      setImagemPreview(null);
      setPassos([]);
    }
  }, [open, combo, categoriaPadrao]);

  async function carregarDetalhe(id: number) {
    setCarregandoPassos(true);
    try {
      const res = await fetch(`/api/combos/detalhe/${id}`);
      const data: ComboDetalheResposta | { ok: false; msg?: string } = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao carregar o combo.");
        return;
      }
      setNome(data.combo.nome);
      setDescricao(data.combo.descricao ?? "");
      setCategoriaId(data.combo.categoria_id ? String(data.combo.categoria_id) : "");
      setTipoPreco(data.combo.tipo_preco);
      setPreco(String(data.combo.preco));
      setPromoAtiva(Boolean(data.combo.preco_promocional) && data.combo.promo_desativado !== 1);
      setPrecoPromocional(data.combo.preco_promocional ? String(data.combo.preco_promocional) : "");
      setAtivo(data.combo.ativo === 1);
      setImagemPreview(
        data.combo.imagem ? (data.combo.imagem.startsWith("http") ? data.combo.imagem : `${phpAdminUrl}/${data.combo.imagem}`) : null
      );
      setPassos(data.passos);
    } catch {
      toast.error("Erro ao carregar o combo.");
    } finally {
      setCarregandoPassos(false);
    }
  }

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

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome do combo.");
      return;
    }
    const precoNum = parseFloat(preco.replace(",", "."));
    if (!precoNum || precoNum <= 0) {
      setErro("Informe um preço válido.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/combos/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: comboId ?? 0,
          categoria_id: categoriaId || "",
          nome: nome.trim(),
          descricao: descricao.trim(),
          tipo_preco: tipoPreco,
          preco: precoNum,
          preco_promocional: promoAtiva && precoPromocional ? parseFloat(precoPromocional.replace(",", ".")) : "",
          promo_desativado: promoAtiva ? 0 : 1,
          imagem_base64: imagemBase64 ?? "",
          imagem_remover: imagemRemover ? "1" : "0",
          ativo: ativo ? 1 : 0,
        }),
      });
      const data: ComboSalvarResposta | { ok: false; msg?: string } = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "Erro ao salvar o combo.");
        return;
      }
      toast.success(comboId ? "Combo atualizado." : "Combo criado. Agora adicione os passos.");
      setComboId(data.combo_id);
      setImagemBase64(null);
      setImagemRemover(false);
      onSalvo();
      router.refresh();
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
      const res = await fetch("/api/combos/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combo_id: comboId }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir o combo.");
        return;
      }
      toast.success("Combo excluído.");
      setConfirmExcluirOpen(false);
      onOpenChange(false);
      onSalvo();
      router.refresh();
    } catch {
      toast.error("Erro ao excluir o combo.");
    } finally {
      setExcluindo(false);
    }
  }

  async function excluirPasso(passo: ComboPasso) {
    try {
      const res = await fetch("/api/combos/passo-excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passo_id: passo.id }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao excluir o passo.");
        return;
      }
      toast.success("Passo excluído.");
      setPassos((prev) => prev.filter((p) => p.id !== passo.id));
    } catch {
      toast.error("Erro ao excluir o passo.");
    }
  }

  function onDropPasso(idxDestino: number) {
    if (arrastandoIdx === null || arrastandoIdx === idxDestino) return;
    const copia = [...passos];
    const [item] = copia.splice(arrastandoIdx, 1);
    copia.splice(idxDestino, 0, item);
    setPassos(copia);
    setArrastandoIdx(null);

    if (!comboId) return;
    fetch("/api/combos/passos-reordenar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ combo_id: comboId, passo_ids: copia.map((p) => p.id).join(",") }),
    }).catch(() => {});
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-x-hidden sm:max-w-3xl">
          <DialogHeader className="flex-row items-center justify-between pr-8">
            <DialogTitle>{comboId ? "Editar combo" : "Novo combo"}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[68vh] flex-col gap-5 overflow-y-auto overflow-x-hidden pr-1">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted"
                  title="Clique para escolher uma imagem"
                >
                  {imagemPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemPreview} alt="" className="size-full object-cover" />
                  ) : (
                    <ImagePlus size={26} className="text-muted-foreground" />
                  )}
                </button>
                {imagemPreview && (
                  <button type="button" onClick={removerImagem} className="w-fit text-xs text-muted-foreground hover:text-destructive">
                    Remover imagem
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImagemSelecionada} />
              </div>

              <div className="flex flex-1 flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-nome">
                    Nome do combo<span className="text-destructive">*</span>
                  </Label>
                  <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-descricao">Descrição</Label>
                  <textarea
                    id="c-descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Descreva o que inclui este combo..."
                    className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTipoPreco("por_combo")}
                className={cn("rounded-lg border p-3 text-left", tipoPreco === "por_combo" && "border-primary bg-primary/5")}
              >
                <div className="text-sm font-semibold">Preço por combo</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Os itens dos passos não têm preço próprio: o cliente paga apenas o valor definido aqui para o combo.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTipoPreco("por_item")}
                className={cn("rounded-lg border p-3 text-left", tipoPreco === "por_item" && "border-primary bg-primary/5")}
              >
                <div className="text-sm font-semibold">Preço por item</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  O valor do combo é calculado a partir dos preços dos itens que o cliente escolher.
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-preco">Preço {tipoPreco === "por_item" ? "base" : ""}</Label>
              <MoneyInput id="c-preco" value={preco} onChange={setPreco} className="max-w-48" />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Habilitar preço promocional</span>
                <Switch checked={promoAtiva} onCheckedChange={(v) => setPromoAtiva(v === true)} />
              </div>
              {promoAtiva && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="c-preco-promo">Preço promocional</Label>
                  <MoneyInput id="c-preco-promo" value={precoPromocional} onChange={setPrecoPromocional} className="max-w-48" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm font-medium">Combo ativo</span>
              <Switch checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            {comboId ? (
              <div className="space-y-2.5 border-t pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Passos</div>
                    <p className="text-xs text-muted-foreground">
                      Cada passo é um momento em que o cliente escolhe itens — ex.: &quot;Escolha sua pizza&quot;, &quot;Escolha sua bebida&quot;.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    onClick={() => {
                      setPassoEditando(null);
                      setPassoDialogOpen(true);
                    }}
                  >
                    <Plus size={14} /> Adicionar passo
                  </Button>
                </div>

                {carregandoPassos ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : passos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Nenhum passo cadastrado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {passos.map((passo, idx) => (
                      <div
                        key={passo.id}
                        draggable
                        onDragStart={() => setArrastandoIdx(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => onDropPasso(idx)}
                        className="flex items-center gap-2 rounded-lg border p-2.5"
                      >
                        <GripVertical size={16} className="shrink-0 cursor-grab text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{passo.nome}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              {passo.min_itens === passo.max_itens ? `${passo.min_itens} item(ns)` : `${passo.min_itens}-${passo.max_itens} itens`}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5">{passo.obrigatorio ? "Obrigatório" : "Opcional"}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              {passo.opcoes.length} produto{passo.opcoes.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPassoEditando(passo);
                            setPassoDialogOpen(true);
                          }}
                          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
                          aria-label="Editar passo"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirPasso(passo)}
                          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Excluir passo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="border-t pt-4 text-xs text-muted-foreground">Salve as informações do combo para poder adicionar passos.</p>
            )}
          </div>

          <DialogFooter className={comboId ? "sm:justify-between" : undefined}>
            {comboId && (
              <Button variant="destructive" onClick={() => setConfirmExcluirOpen(true)} disabled={salvando} className="gap-1.5">
                <Trash2 size={14} /> Deletar combo
              </Button>
            )}
            <Button onClick={salvar} disabled={salvando} className="w-full sm:w-auto">
              {salvando ? "Salvando..." : "Salvar informações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropDialog open={cropOpen} onOpenChange={setCropOpen} file={cropFile} onConfirm={handleCropConfirm} />
      <ComboPassoDialog
        open={passoDialogOpen}
        onOpenChange={setPassoDialogOpen}
        comboId={comboId}
        passo={passoEditando}
        produtos={produtos}
        onSalvo={() => comboId && carregarDetalhe(comboId)}
      />
      <ConfirmDialog
        open={confirmExcluirOpen}
        onOpenChange={setConfirmExcluirOpen}
        titulo="Deletar combo"
        descricao={`Tem certeza que deseja excluir o combo "${nome}"? Essa ação não pode ser desfeita.`}
        confirmando={excluindo}
        textoConfirmar="Deletar"
        onConfirmar={excluirCombo}
      />
    </>
  );
}
