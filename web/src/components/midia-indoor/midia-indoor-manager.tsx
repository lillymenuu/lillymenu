"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link2, MonitorPlay, Pause, Play, QrCode, Settings2, Smartphone, Trash2, TriangleAlert, Tv } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import { formatarCodigoPareamento, limparCodigoPareamento, TAMANHO_CODIGO, type TvAdmin } from "@/lib/midiaIndoor";
import { TvConfigDialog } from "./tv-config-dialog";

type TvLista = TvAdmin & { online: boolean };

const LAYOUT_LABEL: Record<TvAdmin["layout"], string> = { vitrine: "Vitrine", grade: "Grade", misto: "Misto" };

function ultimoAcessoTexto(tv: TvLista): string {
  if (tv.online) return "Online agora";
  if (!tv.ultimoAcesso) return "Ainda não exibiu o catálogo";
  const d = new Date(tv.ultimoAcesso.replace(" ", "T") + "Z");
  return `Visto por último em ${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function MidiaIndoorManager({
  tvsIniciais,
  categorias,
  linkTv,
}: {
  tvsIniciais: TvLista[];
  categorias: { id: number; nome: string }[];
  linkTv: string;
}) {
  const [tvs, setTvs] = useState(tvsIniciais);
  const [copiado, setCopiado] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nomeNova, setNomeNova] = useState("");
  const [conectando, setConectando] = useState(false);
  const [editando, setEditando] = useState<TvLista | null>(null);
  const [removendo, setRemovendo] = useState<TvLista | null>(null);
  const [removendoAndamento, setRemovendoAndamento] = useState(false);
  const [pausando, setPausando] = useState<number | null>(null);

  async function alternarPausa(tv: TvLista) {
    const pausada = !tv.config.pausada;
    setPausando(tv.id);
    try {
      const res = await fetch(`/api/midia-indoor/${tv.id}/pausa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pausada }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível alterar a exibição.");
        return;
      }
      setTvs((lista) => lista.map((t) => (t.id === tv.id ? { ...t, config: { ...t.config, pausada } } : t)));
      toast.success(pausada ? "Exibição parada. A TV mostra só a marca da loja." : "Exibição retomada.");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setPausando(null);
    }
  }

  async function recarregar() {
    try {
      const res = await fetch("/api/midia-indoor", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setTvs(data.tvs);
    } catch {
      /* mantem a lista atual */
    }
  }

  /* Status online/offline das TVs. */
  useEffect(() => {
    const t = setInterval(recarregar, 30000);
    return () => clearInterval(t);
  }, []);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkTv);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Copie o link manualmente.");
    }
  }

  async function conectarPorCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (codigo.length !== TAMANHO_CODIGO) {
      toast.error("Digite o código de 6 caracteres que aparece na TV.");
      return;
    }
    setConectando(true);
    try {
      const res = await fetch("/api/midia-indoor/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nome: nomeNova || `TV ${tvs.length + 1}` }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível conectar a TV.");
        return;
      }
      toast.success("TV conectada! O catálogo já vai aparecer na tela.");
      setCodigo("");
      setNomeNova("");
      recarregar();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setConectando(false);
    }
  }

  async function remover() {
    if (!removendo) return;
    setRemovendoAndamento(true);
    try {
      await fetch(`/api/midia-indoor/${removendo.id}`, { method: "DELETE" });
      setTvs((lista) => lista.filter((t) => t.id !== removendo.id));
      toast.success("TV desconectada.");
      setRemovendo(null);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setRemovendoAndamento(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MonitorPlay className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Mídia Indoor – Menu Digital</h1>
          <p className="text-sm text-muted-foreground">Transforme qualquer Smart TV da loja em um cardápio digital com os seus produtos passando automaticamente.</p>
        </div>
      </div>

      <div className="flex gap-3 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-1">
          <div className="font-semibold text-amber-800 dark:text-amber-300">Antes de configurar: sua TV precisa ter navegador de internet</div>
          <p className="text-amber-900/80 dark:text-amber-200/80">
            A Mídia Indoor funciona em Smart TVs com navegador (Samsung, LG, Android TV/Google TV, entre outras). TVs com sistema Roku
            não têm navegador e não são compatíveis. Nesse caso, ligue na TV um aparelho com navegador pela entrada HDMI (como Fire TV
            Stick ou TV Box Android) e abra o link por ele.
          </p>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden rounded-3xl p-0">
        <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-4 p-5">
            <div className="text-sm font-semibold">Como conectar uma TV</div>
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
                <div className="min-w-0 flex-1">
                  <div>Abra este link no navegador da Smart TV:</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 font-mono text-[13px]">
                      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{linkTv}</span>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={copiarLink}>
                      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copiado ? "Copiado" : "Copiar"}
                    </Button>
                  </div>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
                <div className="flex items-center gap-1.5">
                  Aponte a câmera do celular para o <QrCode className="inline size-4 text-primary" /> QR Code que aparece na TV.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
                <div>
                  Confirme no celular. A TV troca sozinha para o catálogo da loja.
                </div>
              </li>
            </ol>
          </div>

          <form onSubmit={conectarPorCodigo} className="flex flex-col gap-3 border-t bg-muted/30 p-5 md:border-t-0 md:border-l">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="size-4 text-primary" />
              Sem câmera? Digite o código da TV
            </div>
            <Input
              value={formatarCodigoPareamento(codigo)}
              onChange={(e) => setCodigo(limparCodigoPareamento(e.target.value))}
              placeholder="Ex.: K7P-4QX"
              className="h-11 rounded-xl text-center font-mono text-lg tracking-[0.25em] uppercase"
              aria-label="Código da TV"
            />
            <Input value={nomeNova} onChange={(e) => setNomeNova(e.target.value)} placeholder="Nome da TV (ex.: Balcão)" maxLength={60} className="h-10 rounded-xl" />
            <Button type="submit" className="h-10 rounded-full" disabled={conectando}>
              {conectando ? "Conectando..." : "Conectar TV"}
            </Button>
          </form>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="text-sm font-semibold">
          TVs conectadas <span className="font-normal text-muted-foreground">({tvs.length})</span>
        </div>

        {tvs.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 rounded-3xl border-dashed py-10 text-center">
            <Tv className="size-8 text-muted-foreground/60" />
            <div className="text-sm font-medium">Nenhuma TV conectada ainda</div>
            <div className="max-w-xs text-xs text-muted-foreground">Siga os passos acima para conectar a primeira TV da loja.</div>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tvs.map((tv) => (
              <Card key={tv.id} className="gap-3 rounded-3xl p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                    <Tv className="size-5 text-muted-foreground" />
                    <span
                      className={`absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-card ${tv.online ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{tv.nome}</div>
                    <div className={`truncate text-xs ${tv.online ? "text-emerald-600" : "text-muted-foreground"}`}>{ultimoAcessoTexto(tv)}</div>
                    {tv.config.pausada && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        <Pause className="size-3" />
                        Exibição parada
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Layout {LAYOUT_LABEL[tv.layout]}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{tv.config.tempoSlide}s por produto</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {tv.config.modo === "produtos"
                      ? `${tv.config.produtos.length} produto(s) escolhido(s)`
                      : tv.config.categorias.length === 0
                        ? "Todas as categorias"
                        : `${tv.config.categorias.length} categoria(s)`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={tv.config.pausada ? "default" : "outline"}
                    size="sm"
                    className="flex-1 rounded-full"
                    disabled={pausando === tv.id}
                    onClick={() => alternarPausa(tv)}
                  >
                    {tv.config.pausada ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                    {tv.config.pausada ? "Retomar" : "Parar exibição"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => setEditando(tv)}>
                    <Settings2 className="size-3.5" />
                    Configurar
                  </Button>
                  <Button variant="destructive" size="icon-sm" className="rounded-full" onClick={() => setRemovendo(tv)} aria-label="Desconectar TV">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TvConfigDialog
        tv={editando}
        categorias={categorias}
        onOpenChange={(v) => !v && setEditando(null)}
        onSalvo={(tvAtualizada) => {
          setTvs((lista) => lista.map((t) => (t.id === tvAtualizada.id ? { ...t, ...tvAtualizada } : t)));
          setEditando(null);
        }}
      />

      <ConfirmDialog
        open={removendo !== null}
        onOpenChange={(v) => !v && setRemovendo(null)}
        titulo="Desconectar TV?"
        descricao={`A TV "${removendo?.nome ?? ""}" para de exibir o catálogo e volta para a tela de QR Code.`}
        confirmando={removendoAndamento}
        textoConfirmar="Desconectar"
        onConfirmar={remover}
      />
    </div>
  );
}
