"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Categoria, Produto } from "@/lib/produtos";

function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProdutoFormDialog({
  open,
  onOpenChange,
  categorias,
  produto,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categorias: Categoria[];
  produto: Produto | null;
  phpAdminUrl: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precoPromocional, setPrecoPromocional] = useState("");
  const [promoAtiva, setPromoAtiva] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemRemover, setImagemRemover] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setImagemBase64(null);
    setImagemRemover(false);
    if (produto) {
      setNome(produto.nome);
      setPreco(String(produto.preco_base));
      setCategoriaId(produto.categoria_id ? String(produto.categoria_id) : "");
      setDescricao(produto.descricao ?? "");
      setCodigo(produto.codigo ?? "");
      setPrecoPromocional(produto.preco_promocional ? String(produto.preco_promocional) : "");
      setPromoAtiva(Boolean(produto.preco_promocional) && produto.promo_desativado !== 1);
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
      setPreco("");
      setCategoriaId("");
      setDescricao("");
      setCodigo("");
      setPrecoPromocional("");
      setPromoAtiva(false);
      setAtivo(true);
      setImagemPreview(null);
    }
  }, [open, produto, phpAdminUrl]);

  async function handleImagemSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileParaBase64(file);
    setImagemBase64(base64);
    setImagemPreview(base64);
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
      setErro("Informe o nome do produto.");
      return;
    }
    const precoNum = parseFloat(preco.replace(",", "."));
    if (!precoNum || precoNum <= 0) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {imagemPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemPreview} alt="" className="size-full object-cover" />
              ) : (
                <ImagePlus size={22} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleImagemSelecionada}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Escolher imagem
              </Button>
              {imagemPreview && (
                <Button type="button" variant="ghost" size="sm" onClick={removerImagem}>
                  <X size={13} /> Remover
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-nome">Nome</Label>
            <Input id="p-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-preco">Preço</Label>
              <Input id="p-preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-categoria">Categoria</Label>
              <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? "")}>
                <SelectTrigger id="p-categoria">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-descricao">Descrição</Label>
            <textarea
              id="p-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-codigo">Código (opcional)</Label>
            <Input id="p-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="p-promo-ativa"
              checked={promoAtiva}
              onCheckedChange={(v) => setPromoAtiva(v === true)}
            />
            <Label htmlFor="p-promo-ativa" className="font-normal">
              Produto em promoção
            </Label>
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
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="p-ativo" checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
            <Label htmlFor="p-ativo" className="font-normal">
              Produto ativo (visível na loja)
            </Label>
          </div>

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
  );
}
