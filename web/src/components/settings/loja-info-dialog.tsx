"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ConfiguracoesDetalhe } from "@/lib/settings";

type Loja = ConfiguracoesDetalhe["loja"];

function redimensionarImagem(file: File, maxLado: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxLado || height > maxLado) {
          if (width > height) {
            height = Math.round((height * maxLado) / width);
            width = maxLado;
          } else {
            width = Math.round((width * maxLado) / height);
            height = maxLado;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponível."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function imagemUrl(rel: string, phpAdminUrl: string): string {
  if (!rel) return "";
  return rel.startsWith("http") ? rel : `${phpAdminUrl}/${rel}`;
}

export function LojaInfoDialog({
  open,
  onOpenChange,
  loja,
  lojaLinkBase,
  phpAdminUrl,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loja: Loja;
  lojaLinkBase: string;
  phpAdminUrl: string;
  onSalvo: () => void;
}) {
  const [aba, setAba] = useState("principal");
  const [nome, setNome] = useState(loja.nome);
  const [contato, setContato] = useState(loja.contato);
  const [descricao, setDescricao] = useState(loja.descricao);
  const [cnpj, setCnpj] = useState(loja.cnpj);
  const [linkSlug, setLinkSlug] = useState(loja.link);
  const [instagram, setInstagram] = useState(loja.instagram);
  const [tiktok, setTiktok] = useState(loja.tiktok);
  const [cep, setCep] = useState(loja.cep);
  const [numero, setNumero] = useState(loja.numero);
  const [rua, setRua] = useState(loja.rua);
  const [bairro, setBairro] = useState(loja.bairro);
  const [cidade, setCidade] = useState(loja.cidade);
  const [estado, setEstado] = useState(loja.estado);
  const [complemento, setComplemento] = useState(loja.complemento);

  const [capaPreview, setCapaPreview] = useState(loja.capa);
  const [capaBase64, setCapaBase64] = useState("");
  const [capaRemover, setCapaRemover] = useState(false);
  const [perfilPreview, setPerfilPreview] = useState(loja.perfil);
  const [perfilBase64, setPerfilBase64] = useState("");
  const [perfilRemover, setPerfilRemover] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const capaInputRef = useRef<HTMLInputElement>(null);
  const perfilInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setAba("principal");
    setNome(loja.nome);
    setContato(loja.contato);
    setDescricao(loja.descricao);
    setCnpj(loja.cnpj);
    setLinkSlug(loja.link);
    setInstagram(loja.instagram);
    setTiktok(loja.tiktok);
    setCep(loja.cep);
    setNumero(loja.numero);
    setRua(loja.rua);
    setBairro(loja.bairro);
    setCidade(loja.cidade);
    setEstado(loja.estado);
    setComplemento(loja.complemento);
    setCapaPreview(loja.capa);
    setCapaBase64("");
    setCapaRemover(false);
    setPerfilPreview(loja.perfil);
    setPerfilBase64("");
    setPerfilRemover(false);
  }, [open, loja]);

  async function selecionarCapa(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await redimensionarImagem(file, 1200);
      setCapaBase64(dataUrl);
      setCapaPreview(dataUrl);
      setCapaRemover(false);
    } catch {
      toast.error("Não foi possível processar a imagem.");
    }
  }

  async function selecionarPerfil(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await redimensionarImagem(file, 500);
      setPerfilBase64(dataUrl);
      setPerfilPreview(dataUrl);
      setPerfilRemover(false);
    } catch {
      toast.error("Não foi possível processar a imagem.");
    }
  }

  function removerCapa() {
    setCapaPreview("");
    setCapaBase64("");
    setCapaRemover(true);
  }

  function removerPerfil() {
    setPerfilPreview("");
    setPerfilBase64("");
    setPerfilRemover(true);
  }

  const linkPreview = linkSlug ? `${lojaLinkBase}${linkSlug.replace(/^\/+/, "")}` : lojaLinkBase;

  function copiarLink() {
    navigator.clipboard?.writeText(linkPreview).then(
      () => toast.success("Link copiado."),
      () => toast.error("Não foi possível copiar o link.")
    );
  }

  async function salvar() {
    if (!nome.trim() || !contato.trim()) {
      toast.error("Preencha o nome e o número de contato da loja.");
      return;
    }
    if (!cep.trim() || !numero.trim() || !rua.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
      toast.error("Preencha o endereço completo da loja.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/settings/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_loja: nome,
          loja_contato: contato,
          loja_descricao: descricao,
          loja_cnpj: cnpj,
          link_loja: linkSlug,
          loja_instagram: instagram,
          loja_tiktok: tiktok,
          loja_cep: cep,
          loja_numero: numero,
          loja_rua: rua,
          loja_bairro: bairro,
          loja_cidade: cidade,
          loja_estado: estado,
          loja_complemento: complemento,
          loja_capa_base64: capaBase64,
          loja_capa_remover: capaRemover ? "1" : "0",
          loja_perfil_base64: perfilBase64,
          loja_perfil_remover: perfilRemover ? "1" : "0",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Erro ao salvar.");
        return;
      }
      toast.success("Informações da loja salvas.");
      onSalvo();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Informações da loja</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col overflow-y-auto pr-1">
        <div className="flex items-center gap-3">
          <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {perfilPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfilPreview.startsWith("data:") ? perfilPreview : imagemUrl(perfilPreview, phpAdminUrl)} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-[10px] text-muted-foreground">Perfil</span>
            )}
            <button
              type="button"
              onClick={() => perfilInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition hover:bg-black/40 hover:text-white"
            >
              <Upload className="size-4" />
            </button>
          </div>
          <div className="relative h-16 flex-1 overflow-hidden rounded-lg border bg-muted">
            {capaPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capaPreview.startsWith("data:") ? capaPreview : imagemUrl(capaPreview, phpAdminUrl)} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xs text-muted-foreground">Adicionar capa</span>
            )}
            <button
              type="button"
              onClick={() => capaInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition hover:bg-black/40 hover:text-white"
            >
              <Upload className="size-4" />
            </button>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            {perfilPreview ? (
              <Button variant="ghost" size="icon" onClick={removerPerfil} title="Remover perfil">
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            ) : null}
            {capaPreview ? (
              <Button variant="ghost" size="icon" onClick={removerCapa} title="Remover capa">
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            ) : null}
          </div>
          <input ref={perfilInputRef} type="file" accept="image/*" className="hidden" onChange={selecionarPerfil} />
          <input ref={capaInputRef} type="file" accept="image/*" className="hidden" onChange={selecionarCapa} />
        </div>

        <Tabs value={aba} onValueChange={(v) => v && setAba(v as string)}>
          <TabsList variant="line">
            <TabsTrigger value="principal">Principal</TabsTrigger>
            <TabsTrigger value="redes">Redes sociais</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
          </TabsList>

          <TabsContent value="principal" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome da loja</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Número de contato</Label>
              <Input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CPF ou CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Link customizado</Label>
              <Input value={linkSlug} onChange={(e) => setLinkSlug(e.target.value)} placeholder="ex: minhaloja" />
              <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{linkPreview}</span>
                <button type="button" onClick={copiarLink} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Copy className="size-3.5" />
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="redes" className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Instagram</Label>
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="Ex.: minhaloja" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">TikTok</Label>
              <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="Ex.: minhaloja" />
            </div>
          </TabsContent>

          <TabsContent value="endereco" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CEP</Label>
                <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Rua</Label>
                <Input value={rua} onChange={(e) => setRua(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Input value={estado} onChange={(e) => setEstado(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Complemento</Label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
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
