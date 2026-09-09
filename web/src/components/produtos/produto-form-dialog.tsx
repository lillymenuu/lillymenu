"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Grid2x2,
  Tag,
  CalendarCheck,
  Star,
  Box,
  HourglassIcon,
  Info,
  ImagePlus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageCropDialog } from "./image-crop-dialog";
import type { Categoria, Produto } from "@/lib/produtos";

const ABAS_PLACEHOLDER = [
  { value: "disponibilidade", label: "Disponibilidade", icon: CalendarCheck },
  { value: "pontos", label: "Pontos", icon: Star },
  { value: "estoque", label: "Estoque", icon: Box },
  { value: "validade", label: "Prazo de validade", icon: HourglassIcon },
  { value: "outros", label: "Outros", icon: Info },
];

export function ProdutoFormDialog({
  open,
  onOpenChange,
  categorias,
  produto,
  categoriaPadrao,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
  produto: Produto | null;
  categoriaPadrao?: number | null;
  phpAdminUrl: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aba, setAba] = useState("detalhes");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [apenasAgendamento, setApenasAgendamento] = useState(false);
  const [qtdMinimaAtiva, setQtdMinimaAtiva] = useState(false);
  const [qtdMinima, setQtdMinima] = useState("1");

  const [preco, setPreco] = useState("");
  const [promoAtiva, setPromoAtiva] = useState(false);
  const [precoPromocional, setPrecoPromocional] = useState("");

  const [ativo, setAtivo] = useState(true);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemRemover, setImagemRemover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAba("detalhes");
    setErro(null);
    setImagemBase64(null);
    setImagemRemover(false);
    if (produto) {
      setNome(produto.nome);
      setCodigo(produto.codigo ?? "");
      setDescricao(produto.descricao ?? "");
      setCategoriaId(produto.categoria_id ? String(produto.categoria_id) : "");
      setApenasAgendamento(produto.apenas_agendamento === 1);
      setQtdMinimaAtiva((produto.quantidade_minima ?? 0) > 0);
      setQtdMinima(String(produto.quantidade_minima || 1));
      setPreco(String(produto.preco_base));
      setPromoAtiva(Boolean(produto.preco_promocional) && produto.promo_desativado !== 1);
      setPrecoPromocional(produto.preco_promocional ? String(produto.preco_promocional) : "");
      setAtivo(produto.ativo === 1);
      setImagemPreview(
        produto.imagem
          ? produto.imagem.startsWith("http")
            ? produto.imagem
            : `${phpAdminUrl}/${produto.imagem}`
          : null
      );
    } else {
      setNome("");
      setCodigo("");
      setDescricao("");
      setCategoriaId(categoriaPadrao ? String(categoriaPadrao) : "");
      setApenasAgendamento(false);
      setQtdMinimaAtiva(false);
      setQtdMinima("1");
      setPreco("");
      setPromoAtiva(false);
      setPrecoPromocional("");
      setAtivo(true);
      setImagemPreview(null);
    }
  }, [open, produto, categoriaPadrao, phpAdminUrl]);

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
      setAba("detalhes");
      setErro("Informe o nome do produto.");
      return;
    }
    const precoNum = parseFloat(preco.replace(",", "."));
    if (!precoNum || precoNum <= 0) {
      setAba("preco");
      setErro("Informe um preço válido.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        id: produto?.id,
        nome: nome.trim(),
        preco: precoNum,
        categoria_id: categoriaId || null,
        descricao: descricao.trim(),
        codigo: codigo.trim(),
        preco_promocional: promoAtiva && precoPromocional ? parseFloat(precoPromocional.replace(",", ".")) : "",
        promo_desativado: promoAtiva ? 0 : 1,
        ativo,
        apenas_agendamento: apenasAgendamento,
        quantidade_minima: qtdMinimaAtiva ? Math.max(1, parseInt(qtdMinima, 10) || 1) : 0,
        imagem_base64: imagemBase64 ?? "",
        imagem_remover: imagemRemover,
      };
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.msg ?? "Erro ao salvar produto.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!produto) return;
    if (!confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;
    setExcluindo(true);
    try {
      await fetch("/api/produtos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: produto.id }),
      });
      onOpenChange(false);
      router.refresh();
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-x-hidden sm:max-w-4xl">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"} - detalhes</DialogTitle>
          {produto && (
            <button
              onClick={excluir}
              disabled={excluindo}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              aria-label="Excluir produto"
              title="Excluir produto"
            >
              <Trash2 size={15} />
            </button>
          )}
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col overflow-y-auto overflow-x-hidden">
        <Tabs value={aba} onValueChange={(v) => v && setAba(v)}>
          <div className="overflow-x-auto">
            <TabsList variant="line" className="w-max">
              <TabsTrigger value="detalhes">
                <Grid2x2 size={14} /> Detalhes
              </TabsTrigger>
              <TabsTrigger value="preco">
                <Tag size={14} /> Preço e variações
              </TabsTrigger>
              {ABAS_PLACEHOLDER.map((a) => (
                <TabsTrigger key={a.value} value={a.value}>
                  <a.icon size={14} /> {a.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="detalhes">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex size-32 items-center justify-center overflow-hidden rounded-lg border bg-muted"
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
                  <button
                    type="button"
                    onClick={removerImagem}
                    className="w-fit text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remover imagem
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImagemSelecionada}
                />
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-nome">
                    Nome do produto<span className="text-destructive">*</span>
                  </Label>
                  <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-codigo">Código do produto (PDV)</Label>
                  <Input id="p-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 123" className="max-w-64" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-descricao">Descrição do produto</Label>
                  <textarea
                    id="p-descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Descreva o produto"
                    className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Produto apenas por agendamento</div>
                      <div className="text-xs text-muted-foreground">
                        Ao marcar essa opção o produto só poderá ser vendido por agendamento.
                      </div>
                    </div>
                    <Switch checked={apenasAgendamento} onCheckedChange={(v) => setApenasAgendamento(v === true)} />
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">Quantidade mínima para pedido</div>
                        <div className="text-xs text-muted-foreground">
                          Ao habilitar seus clientes terão que pedir uma quantidade mínima desse produto.
                        </div>
                      </div>
                      <Switch checked={qtdMinimaAtiva} onCheckedChange={(v) => setQtdMinimaAtiva(v === true)} />
                    </div>
                    {qtdMinimaAtiva && (
                      <Input
                        type="number"
                        min={1}
                        value={qtdMinima}
                        onChange={(e) => setQtdMinima(e.target.value)}
                        className="max-w-32"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
                  <Label className="font-normal">Produto ativo (visível na loja)</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preco">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-preco">Preço</Label>
                <Input
                  id="p-preco"
                  inputMode="decimal"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="0,00"
                  className="max-w-48"
                />
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Habilitar preço promocional</span>
                  <Switch checked={promoAtiva} onCheckedChange={(v) => setPromoAtiva(v === true)} />
                </div>
                {promoAtiva && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="p-preco-promo">Preço promocional</Label>
                    <Input
                      id="p-preco-promo"
                      inputMode="decimal"
                      value={precoPromocional}
                      onChange={(e) => setPrecoPromocional(e.target.value)}
                      placeholder="0,00"
                      className="max-w-48"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border p-3 opacity-60">
                <div>
                  <div className="text-sm font-medium">Seu produto possui diferentes preços, tamanhos ou cores?</div>
                  <div className="text-xs text-muted-foreground">
                    Variações chegam em breve nesta versão — cadastre pelo admin atual por enquanto.
                  </div>
                </div>
                <Switch disabled checked={false} />
              </div>
            </div>
          </TabsContent>

          {ABAS_PLACEHOLDER.map((a) => (
            <TabsContent key={a.value} value={a.value}>
              <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                <a.icon size={24} />
                <p className="text-sm">{a.label} chega em breve nesta versão.</p>
                <p className="text-xs">Por enquanto, gerencie pelo admin atual.</p>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ImageCropDialog open={cropOpen} onOpenChange={setCropOpen} file={cropFile} onConfirm={handleCropConfirm} />
    </>
  );
}
