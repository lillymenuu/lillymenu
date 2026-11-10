"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GalleryHorizontal, LayoutGrid, Shuffle } from "lucide-react";
import { cn } from "cn";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { TEMPO_SLIDE_MAX, TEMPO_SLIDE_MIN, type ConfigTv, type LayoutTv, type TvAdmin } from "@/lib/midiaIndoor";

const LAYOUTS: { id: LayoutTv; nome: string; descricao: string; icon: React.ComponentType<{ className?: string }>; disponivel: boolean }[] = [
  { id: "vitrine", nome: "Vitrine", descricao: "Um produto por vez, em destaque", icon: GalleryHorizontal, disponivel: true },
  { id: "grade", nome: "Grade", descricao: "Cardápio por categoria", icon: LayoutGrid, disponivel: false },
  { id: "misto", nome: "Misto", descricao: "Alterna grade e destaques", icon: Shuffle, disponivel: false },
];

const TEMPOS = [5, 8, 10, 15, 20, 30].filter((t) => t >= TEMPO_SLIDE_MIN && t <= TEMPO_SLIDE_MAX);

function Opcao({ titulo, descricao, checked, onChange }: { titulo: string; descricao: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5">
      <div>
        <div className="text-sm font-medium">{titulo}</div>
        <div className="text-xs text-muted-foreground">{descricao}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* Formulario montado so com a TV aberta, pra iniciar o estado a partir dela sem efeito. */
function Formulario({
  tv,
  categorias,
  onCancelar,
  onSalvo,
}: {
  tv: TvAdmin;
  categorias: { id: number; nome: string }[];
  onCancelar: () => void;
  onSalvo: (tv: TvAdmin) => void;
}) {
  const [nome, setNome] = useState(tv.nome);
  const [layout, setLayout] = useState<LayoutTv>(tv.layout);
  const [config, setConfig] = useState<ConfigTv>(tv.config);
  const [salvando, setSalvando] = useState(false);

  const set = <K extends keyof ConfigTv>(k: K, v: ConfigTv[K]) => setConfig((c) => ({ ...c, [k]: v }));
  const todas = config.categorias.length === 0;

  function alternarCategoria(id: number, marcado: boolean) {
    const atuais = todas ? categorias.map((c) => c.id) : config.categorias;
    const novas = marcado ? [...atuais, id] : atuais.filter((c) => c !== id);
    /* Todas marcadas (ou nenhuma) = sem filtro: categorias novas entram sozinhas na TV. */
    set("categorias", novas.length === categorias.length || novas.length === 0 ? [] : novas);
  }

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome da TV.");
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/midia-indoor/${tv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, layout, config }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível salvar.");
        return;
      }
      toast.success("Configuração salva. A TV atualiza em até 1 minuto.");
      onSalvo({ ...tv, nome: nome.trim(), layout, config });
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="scrollbar-hidden -mx-1.5 flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-1.5 py-1">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tv-nome">Nome da TV</Label>
          <Input id="tv-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} className="h-10 rounded-xl" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Layout</Label>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={!l.disponivel}
                onClick={() => setLayout(l.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors",
                  layout === l.id ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
                  !l.disponivel && "cursor-not-allowed opacity-50 hover:bg-transparent"
                )}
              >
                <l.icon className="size-5" />
                <span className="text-sm font-medium">{l.nome}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{l.disponivel ? l.descricao : "Em breve"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Tempo de cada produto na tela</Label>
          <div className="flex flex-wrap gap-1.5">
            {TEMPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("tempoSlide", t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  config.tempoSlide === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label>Categorias exibidas</Label>
            {!todas && (
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => set("categorias", [])}>
                Marcar todas
              </button>
            )}
          </div>
          {categorias.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-3 py-3 text-xs text-muted-foreground">Nenhuma categoria ativa cadastrada.</div>
          ) : (
            <div className="grid max-h-44 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border p-2">
              {categorias.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <Checkbox checked={todas || config.categorias.includes(c.id)} onCheckedChange={(v) => alternarCategoria(c.id, v === true)} />
                  <span className="truncate">{c.nome}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Opcao titulo="Esconder esgotados" descricao="Produtos sem estoque não aparecem na TV" checked={config.esconderEsgotados} onChange={(v) => set("esconderEsgotados", v)} />
          <Opcao titulo="Somente produtos com foto" descricao="Ignora produtos cadastrados sem imagem" checked={config.somenteComFoto} onChange={(v) => set("somenteComFoto", v)} />
          <Opcao titulo="QR Code da loja" descricao="Mostra o QR para o cliente pedir pelo celular" checked={config.mostrarQrLoja} onChange={(v) => set("mostrarQrLoja", v)} />
          <Opcao
            titulo="TV na vertical"
            descricao="Use quando a TV estiver instalada em pé"
            checked={config.orientacao === "vertical"}
            onChange={(v) => set("orientacao", v ? "vertical" : "horizontal")}
          />
        </div>
      </div>
      <DialogFooter className="-mx-5 -mb-5 rounded-b-3xl border-t-0 bg-transparent px-5 pt-1 pb-5">
        <Button variant="outline" className="rounded-full" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button className="rounded-full" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function TvConfigDialog({
  tv,
  categorias,
  onOpenChange,
  onSalvo,
}: {
  tv: TvAdmin | null;
  categorias: { id: number; nome: string }[];
  onOpenChange: (v: boolean) => void;
  onSalvo: (tv: TvAdmin) => void;
}) {
  return (
    <Dialog open={tv !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4 rounded-3xl p-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar TV</DialogTitle>
        </DialogHeader>
        {tv && <Formulario key={tv.id} tv={tv} categorias={categorias} onCancelar={() => onOpenChange(false)} onSalvo={onSalvo} />}
      </DialogContent>
    </Dialog>
  );
}
