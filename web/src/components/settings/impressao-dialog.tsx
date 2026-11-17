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
  salvarPerfil,
  usePerfisImpressao,
} from "@/lib/impressao-qz";

const QZ_DOWNLOAD_URL = "https://qz.io/download/";

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

  function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe um nome para a impressora.");
    if (!form.qzPrinterName) return toast.error("Selecione a impressora deste computador.");
    salvarPerfil({ ...form, nome: form.nome.trim() });
    toast.success("Impressora salva.");
    setForm(null);
  }

  function excluir() {
    if (!excluirId) return;
    excluirPerfil(excluirId);
    toast.success("Impressora apagada.");
    setExcluirId(null);
  }

  async function testar(perfil: Perfil) {
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
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 rounded-3xl p-0 sm:max-w-xl">
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
              sistema={sistema}
              onRecarregar={recarregarImpressoras}
              testando={testando === "form"}
              onTestar={() => void testar(form)}
              onSalvar={salvar}
            />
          ) : (
            <>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6">
                {perfis.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma impressora configurada. As impressoras ficam salvas em cada computador que imprime (caixa, cozinha).
                  </div>
                ) : (
                  perfis.map((p) => (
                    <CardImpressora
                      key={p.id}
                      perfil={p}
                      naoEncontrada={sistema.estado === "ok" && !impressorasSistema.includes(p.qzPrinterName)}
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
        descricao="Tem certeza que deseja apagar esta impressora deste computador?"
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
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{USO_LABEL[perfil.usoPara] ?? perfil.usoPara}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Info rotulo="Impressão automática" valor={perfil.impressaoAutomatica ? "Habilitado" : "Desabilitado"} />
        <Info rotulo="Número de cópias" valor={String(perfil.copias || 1)} />
        <Info rotulo="Tamanho" valor={perfil.papel} className="sm:text-right" />
        <Info rotulo="Tamanho da fonte" valor={FONTE_LABEL[perfil.tamanhoFonte ?? "pequeno"]} />
        <span className="hidden sm:block" />
        <Info rotulo="Modo" valor={MODO_LABEL[perfil.tipoImpressao] ?? perfil.tipoImpressao} className="sm:text-right" />
      </div>
      <div className="mt-2 truncate text-sm text-muted-foreground">Impressora: {perfil.qzPrinterName || "não vinculada"}</div>
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
  sistema,
  onRecarregar,
  testando,
  onTestar,
  onSalvar,
}: {
  form: Perfil;
  setForm: (f: Perfil) => void;
  sistema: Sistema;
  onRecarregar: () => void;
  testando: boolean;
  onTestar: () => void;
  onSalvar: () => void;
}) {
  const impressoras = sistema.estado === "ok" ? sistema.impressoras : [];
  const opcoes = form.qzPrinterName && !impressoras.includes(form.qzPrinterName) ? [form.qzPrinterName, ...impressoras] : impressoras;
  const modo = DESCRICAO_MODO[form.tipoImpressao] ?? DESCRICAO_MODO.completa;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2">
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
            <Label className="text-sm font-medium">
              Impressora deste computador<span className="text-primary">*</span>
            </Label>
            <button
              type="button"
              onClick={onRecarregar}
              disabled={sistema.estado === "carregando"}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${sistema.estado === "carregando" ? "animate-spin" : ""}`} /> Buscar
            </button>
          </div>
          <Select value={form.qzPrinterName || null} onValueChange={(v) => v && setForm({ ...form, qzPrinterName: v as string })} disabled={!opcoes.length}>
            <SelectTrigger className="h-10 w-full rounded-full bg-muted/60 px-4">
              <SelectValue
                placeholder={sistema.estado === "carregando" ? "Buscando impressoras..." : sistema.estado === "erro" ? "Abra o QZ Tray para listar" : "Selecione"}
              />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((nome) => (
                <SelectItem key={nome} value={nome}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      <DialogFooter className="mx-0 mb-0 border-t-0 bg-transparent px-6 pt-4 pb-6">
        <Button variant="secondary" className="gap-1.5 rounded-full" onClick={onTestar} disabled={!form.qzPrinterName || testando}>
          {testando && <Loader2 className="size-4 animate-spin" />} Imprimir teste
        </Button>
        <Button className="rounded-full px-5" onClick={onSalvar}>
          Salvar
        </Button>
      </DialogFooter>
    </>
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
