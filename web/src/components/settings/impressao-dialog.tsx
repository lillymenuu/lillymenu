"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";
import type { PerfilImpressao as Perfil } from "@/lib/impressao";
import {
  excluirPerfil,
  imprimirTeste,
  impressoraPadrao,
  listarImpressorasSistema,
  mensagemErroQZ,
  previaCupom,
  salvarPerfil,
  usePerfisImpressao,
} from "@/lib/impressao-qz";

const QZ_DOWNLOAD_URL = "https://qz.io/download/";
const NENHUMA = "__nenhuma__";

const PERFIL_VAZIO: Perfil = {
  id: null,
  nome: "",
  qzPrinterName: "",
  tipo: "nao_fiscal",
  usoPara: "ambos",
  papel: "50mm",
  copias: 1,
  tipoImpressao: "completa",
  impressaoAutomatica: true,
  tamanhoFonte: "pequeno",
  mostrarGruposComplementos: false,
};

const USO_LABEL: Record<string, string> = { cozinha: "Cozinha", pdv: "PDV", ambos: "Cozinha e PDV" };
const FONTE_LABEL: Record<string, string> = { pequeno: "Pequeno", medio: "Médio" };
const MODO_LABEL: Record<string, string> = { simples: "Simples", completa: "Completa" };

const DESCRICAO_MODO: Record<string, { titulo: string; texto: string }> = {
  simples: { titulo: "Impressão simples", texto: "Imprime os itens, o valor total, a forma de pagamento, o cliente e o endereço de entrega." },
  completa: {
    titulo: "Impressão completa",
    texto: "Todos os dados serão impressos: dados de entrega, formas de pagamento e dados do cliente, além de valores detalhados, cashback e pontos.",
  },
};

type Sistema = { estado: "carregando" } | { estado: "ok"; impressoras: string[] } | { estado: "erro"; mensagem: string };

export function ImpressaoDialog({ open, onOpenChange, lojaNome }: { open: boolean; onOpenChange: (v: boolean) => void; lojaNome: string }) {
  const perfis = usePerfisImpressao();
  const [sistema, setSistema] = useState<Sistema>({ estado: "carregando" });
  const [form, setForm] = useState<Perfil | null>(null);
  const [testando, setTestando] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function recarregarImpressoras() {
    setSistema({ estado: "carregando" });
    listarImpressorasSistema()
      .then((impressoras) => setSistema({ estado: "ok", impressoras }))
      .catch((e) => setSistema({ estado: "erro", mensagem: mensagemErroQZ(e) }));
  }

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    listarImpressorasSistema()
      .then((impressoras) => ativo && setSistema({ estado: "ok", impressoras }))
      .catch((e) => ativo && setSistema({ estado: "erro", mensagem: mensagemErroQZ(e) }));
    return () => {
      ativo = false;
    };
  }, [open]);

  function alterarAberto(v: boolean) {
    if (!v) {
      setForm(null);
      setSistema({ estado: "carregando" });
    }
    onOpenChange(v);
  }

  async function novaImpressora() {
    setForm({ ...PERFIL_VAZIO });
    const padrao = await impressoraPadrao();
    if (padrao) setForm((f) => (f && !f.id && !f.qzPrinterName ? { ...f, qzPrinterName: padrao, nome: f.nome || padrao.toUpperCase() } : f));
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe um nome para a impressora.");
    setSalvando(true);
    try {
      await salvarPerfil({ ...form, nome: form.nome.trim() });
      toast.success("Impressora salva.");
      setForm(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar impressora.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!excluirId) return;
    try {
      await excluirPerfil(excluirId);
      toast.success("Impressora apagada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao apagar impressora.");
    } finally {
      setExcluirId(null);
    }
  }

  async function testar(perfil: Perfil) {
    if (!perfil.qzPrinterName) {
      toast.error("Escolha em Editar qual impressora deste computador corresponde a esta.");
      return;
    }
    setTestando(perfil.id ?? "form");
    try {
      await imprimirTeste(perfil, lojaNome);
      toast.success(`Teste enviado para ${perfil.qzPrinterName}.`);
    } catch (e) {
      toast.error(mensagemErroQZ(e));
    } finally {
      setTestando(null);
    }
  }

  const impressorasSistema = sistema.estado === "ok" ? sistema.impressoras : [];

  return (
    <>
      <Dialog open={open} onOpenChange={alterarAberto}>
        <DialogContent className={`flex max-h-[90vh] flex-col gap-0 rounded-3xl p-0 ${form ? "sm:max-w-xl lg:max-w-5xl" : "sm:max-w-xl"}`}>
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg">{form ? (form.id ? "Editando impressora" : "Nova impressora") : "Configurações de impressora"}</DialogTitle>
          </DialogHeader>

          {sistema.estado === "erro" && (
            <div className="px-6 pb-4">
              <AvisoQZ mensagem={sistema.mensagem} onTentar={recarregarImpressoras} />
            </div>
          )}

          {form ? (
            <FormImpressora
              form={form}
              setForm={setForm}
              lojaNome={lojaNome}
              sistema={sistema}
              onRecarregar={recarregarImpressoras}
              testando={testando === "form"}
              salvando={salvando}
              onTestar={() => void testar(form)}
              onSalvar={() => void salvar()}
            />
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6">
                {perfis.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma impressora cadastrada. As impressoras ficam salvas na loja; em cada computador que imprime, basta escolher a impressora do Windows correspondente.
                  </div>
                ) : (
                  perfis.map((p) => (
                    <CardImpressora
                      key={p.id}
                      perfil={p}
                      naoEncontrada={!p.qzPrinterName || (sistema.estado === "ok" && !impressorasSistema.includes(p.qzPrinterName))}
                      testando={testando === p.id}
                      onApagar={() => setExcluirId(p.id)}
                      onTestar={() => void testar(p)}
                      onEditar={() => setForm({ ...PERFIL_VAZIO, ...p })}
                    />
                  ))
                )}
              </div>
              <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-6 pt-5 pb-6">
                <Button className="rounded-full px-5" onClick={() => void novaImpressora()}>
                  Adicionar impressora
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={excluirId !== null}
        onOpenChange={(v) => !v && setExcluirId(null)}
        titulo="Apagar impressora"
        descricao="Tem certeza que deseja apagar esta impressora? Ela some de todos os computadores da loja."
        textoConfirmar="Apagar"
        onConfirmar={excluir}
      />
    </>
  );
}

function CardImpressora({
  perfil,
  naoEncontrada,
  testando,
  onApagar,
  onTestar,
  onEditar,
}: {
  perfil: Perfil;
  naoEncontrada: boolean;
  testando: boolean;
  onApagar: () => void;
  onTestar: () => void;
  onEditar: () => void;
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold">{perfil.nome}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Vinculado a essa loja</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{USO_LABEL[perfil.usoPara] ?? perfil.usoPara}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Info rotulo="Impressão automática" valor={perfil.impressaoAutomatica ? "Habilitado" : "Desabilitado"} />
        <Info rotulo="Número de cópias" valor={String(perfil.copias || 1)} />
        <Info rotulo="Tamanho" valor={perfil.papel} className="sm:text-right" />
        <Info rotulo="Tamanho da fonte" valor={FONTE_LABEL[perfil.tamanhoFonte ?? "pequeno"]} />
        <span className="hidden sm:block" />
        <Info rotulo="Modo" valor={MODO_LABEL[perfil.tipoImpressao] ?? perfil.tipoImpressao} className="sm:text-right" />
      </div>
      {perfil.qzPrinterName && <div className="mt-2 truncate text-sm text-muted-foreground">Neste computador: {perfil.qzPrinterName}</div>}
      {naoEncontrada && (
        <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">Impressora não está configurada nesse computador. Possivelmente é compartilhada!</div>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="secondary" className="rounded-full" onClick={onApagar}>
          Apagar impressora
        </Button>
        <Button variant="secondary" className="gap-1.5 rounded-full" onClick={onTestar} disabled={testando}>
          {testando && <Loader2 className="size-4 animate-spin" />} Imprimir teste
        </Button>
        <Button className="rounded-full px-5" onClick={onEditar}>
          Editar
        </Button>
      </div>
    </div>
  );
}

function Info({ rotulo, valor, className = "" }: { rotulo: string; valor: string; className?: string }) {
  return (
    <div className={className}>
      {rotulo}: <span className="font-semibold">{valor}</span>
    </div>
  );
}

function FormImpressora({
  form,
  setForm,
  lojaNome,
  sistema,
  onRecarregar,
  testando,
  salvando,
  onTestar,
  onSalvar,
}: {
  form: Perfil;
  setForm: (f: Perfil) => void;
  lojaNome: string;
  sistema: Sistema;
  onRecarregar: () => void;
  testando: boolean;
  salvando: boolean;
  onTestar: () => void;
  onSalvar: () => void;
}) {
  const impressoras = sistema.estado === "ok" ? sistema.impressoras : [];
  const opcoes = form.qzPrinterName && !impressoras.includes(form.qzPrinterName) ? [form.qzPrinterName, ...impressoras] : impressoras;
  const modo = DESCRICAO_MODO[form.tipoImpressao] ?? DESCRICAO_MODO.completa;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Nome<span className="text-primary">*</span>
          </Label>
          <Input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex.: IMPRESSORA COZINHA"
            className="h-10 rounded-full bg-muted/60 px-4"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Impressora deste computador</Label>
            <button
              type="button"
              onClick={onRecarregar}
              disabled={sistema.estado === "carregando"}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${sistema.estado === "carregando" ? "animate-spin" : ""}`} /> Buscar
            </button>
          </div>
          <Select
            value={form.qzPrinterName || (opcoes.length ? NENHUMA : null)}
            onValueChange={(v) => v && setForm({ ...form, qzPrinterName: v === NENHUMA ? "" : (v as string) })}
            disabled={!opcoes.length}
          >
            <SelectTrigger className="h-10 w-full rounded-full bg-muted/60 px-4">
              <SelectValue>
                {(v: string | null) =>
                  v === NENHUMA
                    ? "Nenhuma (este computador não imprime)"
                    : v || (sistema.estado === "carregando" ? "Buscando impressoras..." : sistema.estado === "erro" ? "Abra o QZ Tray para listar" : "Selecione")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NENHUMA}>Nenhuma (este computador não imprime)</SelectItem>
              {opcoes.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Vale só para este computador. Os outros dados ficam salvos na loja.</p>
        </div>

        <GrupoRadio
          titulo="Tamanho do papel"
          valor={form.papel}
          opcoes={[
            { valor: "50mm", rotulo: "50mm" },
            { valor: "80mm", rotulo: "80mm" },
          ]}
          onChange={(v) => setForm({ ...form, papel: v })}
        />
        <GrupoRadio
          titulo="Tamanho da fonte"
          valor={form.tamanhoFonte ?? "pequeno"}
          opcoes={[
            { valor: "pequeno", rotulo: "Pequeno" },
            { valor: "medio", rotulo: "Médio" },
          ]}
          onChange={(v) => setForm({ ...form, tamanhoFonte: v as "pequeno" | "medio" })}
        />
        <GrupoRadio
          titulo="Número de cópias"
          valor={String(form.copias || 1)}
          opcoes={["1", "2", "3", "4"].map((n) => ({ valor: n, rotulo: n }))}
          onChange={(v) => setForm({ ...form, copias: Number(v) })}
        />
        <GrupoRadio
          titulo="Imprimir pedidos de"
          valor={form.usoPara}
          opcoes={[
            { valor: "ambos", rotulo: "Cozinha e PDV" },
            { valor: "cozinha", rotulo: "Cozinha" },
            { valor: "pdv", rotulo: "PDV" },
          ]}
          onChange={(v) => setForm({ ...form, usoPara: v })}
        />
        <GrupoRadio
          titulo="Tipo de impressão"
          valor={form.tipoImpressao}
          opcoes={[
            { valor: "simples", rotulo: "Simples" },
            { valor: "completa", rotulo: "Completa" },
          ]}
          onChange={(v) => setForm({ ...form, tipoImpressao: v })}
        />

        <div className="rounded-xl bg-sky-50 p-4 text-sm dark:bg-sky-950/40">
          <div className="font-semibold">{modo.titulo}</div>
          <div className="mt-0.5 text-foreground/80">{modo.texto}</div>
        </div>

        <CartaoSwitch titulo="Impressão automática" checked={form.impressaoAutomatica} onChange={(v) => setForm({ ...form, impressaoAutomatica: v })} />
        <CartaoSwitch
          titulo="Imprimir nome dos grupos de complementos"
          descricao="Mostra o nome do grupo acima dos complementos escolhidos. Exemplo: Molho, Bebida"
          checked={!!form.mostrarGruposComplementos}
          onChange={(v) => setForm({ ...form, mostrarGruposComplementos: v })}
        />
      </div>

      <div className="mt-6 lg:sticky lg:top-0 lg:mt-0 lg:self-start">
        <PreviaCupom perfil={form} lojaNome={lojaNome} />
      </div>
      </div>

      <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-6 pt-4 pb-6">
        <Button variant="secondary" className="gap-1.5 rounded-full" onClick={onTestar} disabled={!form.qzPrinterName || testando}>
          {testando && <Loader2 className="size-4 animate-spin" />} Imprimir teste
        </Button>
        <Button className="gap-1.5 rounded-full px-5" onClick={onSalvar} disabled={salvando}>
          {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
        </Button>
      </DialogFooter>
    </>
  );
}

/* Cupom de exemplo como sai na termica: monoespacado, largura em colunas do papel (32 ou 48),
   titulos em altura+largura dupla e fonte "Medio" em altura dupla. Atualiza a cada opcao. */
function PreviaCupom({ perfil, lojaNome }: { perfil: Perfil; lojaNome: string }) {
  const { colunas, linhas } = previaCupom(perfil, lojaNome);
  const medio = perfil.tamanhoFonte === "medio";
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Prévia do cupom</span>
        <span className="text-xs text-muted-foreground">Pedido de exemplo · {perfil.papel}</span>
      </div>
      <div className="flex justify-center overflow-x-auto">
        <div
          className="rounded-sm bg-white px-3 pt-4 pb-6 font-mono text-[11px] leading-[1.25] text-neutral-900 shadow-sm ring-1 ring-black/5"
          style={{ width: `calc(${colunas}ch + 1.5rem)` }}
          aria-label="Prévia do cupom impresso"
        >
          {linhas.map((l, i) => (
            <div
              key={i}
              className={`overflow-hidden whitespace-pre ${l.bold ? "font-bold" : ""}`}
              style={{ textAlign: l.align, ...(medio && !l.big ? { height: "2.5em", lineHeight: "2.5em" } : {}) }}
            >
              {l.big ? (
                <span style={{ fontSize: "2em", lineHeight: 1.15 }}>{l.texto || " "}</span>
              ) : medio ? (
                <span className="inline-block" style={{ transform: "scaleY(2)" }}>
                  {l.texto || " "}
                </span>
              ) : (
                l.texto || " "
              )}
            </div>
          ))}
          <div className="mt-4 border-t border-dashed border-neutral-300" />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Atualiza conforme você muda as opções. No papel, as letras saem sem acento.</p>
    </div>
  );
}

function GrupoRadio({
  titulo,
  valor,
  opcoes,
  onChange,
}: {
  titulo: string;
  valor: string;
  opcoes: { valor: string; rotulo: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm text-muted-foreground">{titulo}</legend>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <label key={o.valor} className="flex w-fit cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name={titulo} checked={ativo} onChange={() => onChange(o.valor)} className="peer sr-only" />
            <span
              className={`flex size-4 items-center justify-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 ${
                ativo ? "border-primary bg-primary" : "border-border bg-background"
              }`}
            >
              {ativo && <span className="size-1.5 rounded-full bg-background" />}
            </span>
            {o.rotulo}
          </label>
        );
      })}
    </fieldset>
  );
}

function CartaoSwitch({ titulo, descricao, checked, onChange }: { titulo: string; descricao?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
      <div>
        <div className="text-sm font-medium">{titulo}</div>
        {descricao && <div className="mt-0.5 text-sm text-muted-foreground">{descricao}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={titulo} />
    </div>
  );
}

function AvisoQZ({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start gap-2 font-medium text-amber-800 dark:text-amber-300">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        {mensagem}
      </div>
      <div className="flex flex-wrap gap-2 pl-6">
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full" nativeButton={false} render={<a href={QZ_DOWNLOAD_URL} target="_blank" rel="noreferrer" />}>
          <Download className="size-3.5" /> Baixar QZ Tray
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full" onClick={onTentar}>
          <RefreshCw className="size-3.5" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
