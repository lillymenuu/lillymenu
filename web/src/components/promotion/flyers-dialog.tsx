"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";

type Slot = { urlAtual: string | null; base64Novo: string | null; removido: boolean };

function slotsIniciais(flyers: string[]): Slot[] {
  return Array.from({ length: 3 }, (_, i) => ({
    urlAtual: flyers[i] ?? null,
    base64Novo: null,
    removido: false,
  }));
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function FlyersDialog({
  open,
  onOpenChange,
  flyers,
  flyersAtivo,
  phpAdminUrl,
  onAtivoChange,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flyers: string[];
  flyersAtivo: boolean;
  phpAdminUrl: string;
  onAtivoChange: (v: boolean) => void;
  onSalvo: (flyers: string[]) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() => slotsIniciais(flyers));
  const [ativo, setAtivo] = useState(flyersAtivo);
  const [alternandoAtivo, setAlternandoAtivo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setSlots(slotsIniciais(flyers));
      setAtivo(flyersAtivo);
      setErro("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function urlPreview(url: string) {
    return url.startsWith("http") ? url : `${phpAdminUrl}/${url}`;
  }

  async function alternarAtivo(v: boolean) {
    setAtivo(v);
    setAlternandoAtivo(true);
    try {
      const res = await fetch("/api/promotion/flyers-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: v ? 1 : 0 }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAtivo(!v);
        toast.error("Erro ao atualizar os slides.");
        return;
      }
      onAtivoChange(v);
      toast.success(v ? "Slides habilitados" : "Slides desabilitados");
    } catch {
      setAtivo(!v);
      toast.error("Erro ao atualizar os slides.");
    } finally {
      setAlternandoAtivo(false);
    }
  }

  async function handleArquivo(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await lerComoBase64(file);
    setSlots((atual) =>
      atual.map((s, idx) => (idx === i ? { ...s, base64Novo: base64, removido: false } : s))
    );
  }

  function removerSlot(i: number) {
    setSlots((atual) =>
      atual.map((s, idx) => (idx === i ? { ...s, base64Novo: null, removido: true } : s))
    );
  }

  function onDrop(i: number) {
    if (dragIndex === null || dragIndex === i) return;
    setSlots((atual) => {
      const copia = [...atual];
      const [movido] = copia.splice(dragIndex, 1);
      copia.splice(i, 0, movido);
      return copia;
    });
    setDragIndex(null);
  }

  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const body: Record<string, string | number> = {};
      slots.forEach((s, i) => {
        const n = i + 1;
        if (s.removido) {
          body[`flyer_${n}_remover`] = 1;
        } else if (s.base64Novo) {
          body[`flyer_${n}_base64`] = s.base64Novo;
        } else if (s.urlAtual) {
          body[`flyer_${n}_url`] = s.urlAtual;
        }
      });

      const res = await fetch("/api/promotion/flyers-salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "Erro ao salvar o flyer.");
        return;
      }
      toast.success("Slides salvos com sucesso");
      onSalvo(data.flyers ?? []);
      onOpenChange(false);
    } catch {
      setErro("Erro ao salvar o flyer.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar slides de loja</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          Essas imagens aparecem em um carrossel deslizante no topo do seu cardápio, acima das
          categorias. Você pode cadastrar até 3.
          <br />
          <strong className="text-foreground">Dimensão recomendada: 1200 x 300px (proporção 4:1).</strong>{" "}
          Evite textos ou detalhes importantes muito perto das bordas — a imagem é recortada para
          preencher o espaço sem distorcer.
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
          <span>Exibir slides no cardápio</span>
          <Switch checked={ativo} onCheckedChange={(v) => alternarAtivo(v === true)} disabled={alternandoAtivo} />
        </label>

        <div className="flex flex-col gap-3">
          {slots.map((slot, i) => {
            const preview = slot.base64Novo
              ? slot.base64Novo
              : slot.urlAtual && !slot.removido
                ? urlPreview(slot.urlAtual)
                : null;
            return (
              <div
                key={i}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className={cn(
                  "flex items-start gap-2 rounded-lg transition-opacity",
                  dragIndex === i && "opacity-40"
                )}
              >
                <div className="mt-6 cursor-grab text-muted-foreground active:cursor-grabbing">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-muted-foreground">Imagem {i + 1}</span>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="flex h-[30px] w-[120px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon size={16} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[i]?.click()}
                      >
                        Anexar imagem
                      </Button>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[i] = el;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => handleArquivo(i, e)}
                      />
                      {preview && (
                        <Button type="button" variant="outline" size="sm" onClick={() => removerSlot(i)}>
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {erro && <p className="text-xs font-semibold text-destructive">{erro}</p>}

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando} className={cn(salvando && "opacity-70")}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
