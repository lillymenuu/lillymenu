"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { ImageCropDialog } from "@/components/produtos/image-crop-dialog";
import { MoneyInput } from "@/components/produtos/money-input";
import type { ComplementoItem } from "@/db/queries/complementos";
import { BOTAO_PRIMARIO_CLASSE, BOTAO_SECUNDARIO_CLASSE, CAMPO_CLASSE, MODAL_CLASSE } from "./estilos";
import { ItemEstoqueAba } from "./item-estoque-aba";

type Aba = "detalhes" | "pontos" | "estoque";

const ABAS: { valor: Aba; label: string }[] = [
  { valor: "detalhes", label: "Detalhes do item" },
  { valor: "pontos", label: "Pontos" },
  { valor: "estoque", label: "Gerenciar estoque" },
];

function apenasNumero(v: string) {
  return v.replace(/\D/g, "").slice(0, 6);
}

function LinhaSwitch({ titulo, texto, checked, onChange }: { titulo: string; texto: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
      <div>
        <div className="text-sm font-semibold">{titulo}</div>
        <div className="text-sm text-muted-foreground">{texto}</div>
      </div>
      <Switch checked={checked} onCheckedChange={(v) => onChange(v === true)} />
    </div>
  );
}

/* O estado nasce das props: quem usa remonta o dialog (key) a cada abertura. */
export function ItemComplementoDialog({
  open,
  onOpenChange,
  grupoId,
  item,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  grupoId: number;
  item: ComplementoItem | null;
  onSalvo: () => void;
}) {
  const [aba, setAba] = useState<Aba>("detalhes");
  const [nome, setNome] = useState(item?.nome ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [preco, setPreco] = useState(item && item.preco > 0 ? String(item.preco) : "");
  const [podeRepetir, setPodeRepetir] = useState(item?.podeRepetir ?? true);
  const [pontosGanhoAtivo, setPontosGanhoAtivo] = useState((item?.pontosGanho ?? 0) > 0);
  const [pontosGanho, setPontosGanho] = useState(String(item?.pontosGanho || 1));
  const [pontosCustoAtivo, setPontosCustoAtivo] = useState((item?.pontosCusto ?? 0) > 0);
  const [pontosCusto, setPontosCusto] = useState(String(item?.pontosCusto || 1));
  const [imagemPreview, setImagemPreview] = useState<string | null>(item?.imagem ?? null);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [imagemRemover, setImagemRemover] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function removerImagem() {
    setImagemPreview(null);
    setImagemBase64(null);
    setImagemRemover(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setAba("detalhes");
      setErro("Informe o nome do item.");
      return;
    }
    setSalvando(true);
    try {
      const resp = await fetch("/api/product-complement/itens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item?.id,
          grupo_id: grupoId,
          nome,
          descricao,
          preco: parseFloat(preco || "0") || 0,
          pode_repetir: podeRepetir,
          pontos_ganho: pontosGanhoAtivo ? Math.max(1, parseInt(pontosGanho, 10) || 1) : 0,
          pontos_custo: pontosCustoAtivo ? Math.max(1, parseInt(pontosCusto, 10) || 1) : 0,
          imagem_base64: imagemBase64 ?? "",
          imagem_remover: imagemRemover,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        setErro(data?.msg ?? "Não foi possível salvar o item.");
        return;
      }
      toast.success(item ? "Item atualizado" : "Item criado");
      onOpenChange(false);
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!item) return;
    setExcluindo(true);
    try {
      const resp = await fetch("/api/product-complement/itens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await resp.json().catch(() => null);
      if (!data?.ok) {
        toast.error(data?.msg ?? "Não foi possível excluir o item.");
        return;
      }
      toast.success("Item excluído");
      setConfirmarExclusao(false);
      onOpenChange(false);
      onSalvo();
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={MODAL_CLASSE}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{item ? "Editando item" : "Criando item"}</DialogTitle>
          </DialogHeader>

          <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full bg-muted p-1 text-sm">
            {ABAS.map((a) => (
              <button
                key={a.valor}
                type="button"
                onClick={() => setAba(a.valor)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 font-medium transition-colors",
                  aba === a.valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          {aba === "detalhes" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para escolher uma imagem"
                  className="relative flex size-36 items-center justify-center overflow-hidden rounded-xl bg-muted"
                >
                  {imagemPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagemPreview} alt="" className="size-full object-cover" />
                  )}
                  <span className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-background text-foreground shadow-md">
                    <Camera size={15} />
                  </span>
                </button>
                {imagemPreview && (
                  <button type="button" onClick={removerImagem} className="text-xs text-muted-foreground hover:text-destructive">
                    Remover imagem
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCropFile(file);
                    setCropOpen(true);
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="item-nome" className="text-sm font-medium">
                  Nome
                </label>
                <input id="item-nome" className={CAMPO_CLASSE} placeholder="Ex.: Coca Cola" maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="item-descricao" className="text-sm font-medium">
                  Descrição do item
                </label>
                <input
                  id="item-descricao"
                  className={CAMPO_CLASSE}
                  placeholder="Ex.: Refrigerante lata."
                  maxLength={255}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="item-preco" className="text-sm font-medium">
                  Preço
                </label>
                <MoneyInput id="item-preco" className={CAMPO_CLASSE} placeholder="0,00" value={preco} onChange={setPreco} />
              </div>
              <LinhaSwitch
                titulo="Pode repetir esse item"
                texto="Habilitado: o cliente poderá selecionar até o máximo configurado na quantidade do grupo."
                checked={podeRepetir}
                onChange={setPodeRepetir}
              />
            </div>
          )}

          {aba === "pontos" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Configure se este item gera pontos no Clube de Pontos e se pode ser resgatado com o saldo do cliente.
              </p>
              <LinhaSwitch
                titulo="Ativar ganho de pontos"
                texto="O cliente acumula pontos ao escolher este item."
                checked={pontosGanhoAtivo}
                onChange={setPontosGanhoAtivo}
              />
              {pontosGanhoAtivo && (
                <input aria-label="Pontos ganhos" inputMode="numeric" className={CAMPO_CLASSE} value={pontosGanho} onChange={(e) => setPontosGanho(apenasNumero(e.target.value))} />
              )}
              <LinhaSwitch
                titulo="Ativar troca por pontos"
                texto="O cliente pode usar o saldo de pontos para resgatar este item."
                checked={pontosCustoAtivo}
                onChange={setPontosCustoAtivo}
              />
              {pontosCustoAtivo && (
                <input aria-label="Pontos para troca" inputMode="numeric" className={CAMPO_CLASSE} value={pontosCusto} onChange={(e) => setPontosCusto(apenasNumero(e.target.value))} />
              )}
            </div>
          )}

          {aba === "estoque" && <ItemEstoqueAba item={item} onAlterado={onSalvo} />}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2">
            {item && (
              <Button variant="ghost" className={BOTAO_SECUNDARIO_CLASSE} onClick={() => setConfirmarExclusao(true)}>
                Excluir item
              </Button>
            )}
            <Button className={BOTAO_PRIMARIO_CLASSE} onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        file={cropFile}
        onConfirm={(dataUrl) => {
          setImagemBase64(dataUrl);
          setImagemPreview(dataUrl);
          setImagemRemover(false);
        }}
      />

      <ConfirmDialog
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        titulo="Excluir item?"
        descricao="O item será removido do grupo. Essa ação não pode ser desfeita."
        confirmando={excluindo}
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}
