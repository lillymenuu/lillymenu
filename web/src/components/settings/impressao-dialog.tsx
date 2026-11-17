"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, Loader2, Pencil, Plus, Printer, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  statusConexao,
  usePerfisImpressao,
} from "@/lib/impressao-qz";

const QZ_DOWNLOAD_URL = "https://qz.io/download/";

const PERFIL_VAZIO: Perfil = {
  id: null,
  nome: "",
  qzPrinterName: "",
  tipo: "nao_fiscal",
  usoPara: "cozinha",
  papel: "80mm",
  copias: 1,
  tipoImpressao: "simples",
  impressaoAutomatica: true,
};

const USO_LABEL: Record<string, string> = { cozinha: "Cozinha", pdv: "PDV", ambos: "Cozinha e PDV" };

type Conexao = { estado: "verificando" } | { estado: "conectado"; versao: string | null } | { estado: "erro"; mensagem: string };

export function ImpressaoDialog({ open, onOpenChange, lojaNome }: { open: boolean; onOpenChange: (v: boolean) => void; lojaNome: string }) {
  const [conexao, setConexao] = useState<Conexao>({ estado: "verificando" });
  const perfis = usePerfisImpressao();
  const [form, setForm] = useState<Perfil | null>(null);
  const [impressorasSistema, setImpressorasSistema] = useState<string[]>([]);
  const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);
  const [testando, setTestando] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  async function aplicarStatus() {
    const s = await statusConexao();
    setConexao(s.conectado ? { estado: "conectado", versao: s.versao } : { estado: "erro", mensagem: mensagemErroQZ(s.erro) });
  }

  function verificarConexao() {
    setConexao({ estado: "verificando" });
    void aplicarStatus();
  }

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    statusConexao().then((s) => {
      if (ativo) setConexao(s.conectado ? { estado: "conectado", versao: s.versao } : { estado: "erro", mensagem: mensagemErroQZ(s.erro) });
    });
    return () => {
      ativo = false;
    };
  }, [open]);

  function alterarAberto(v: boolean) {
    if (!v) {
      setForm(null);
      setConexao({ estado: "verificando" });
    }
    onOpenChange(v);
  }

  async function buscarImpressoras(novo: boolean) {
    setBuscandoImpressoras(true);
    try {
      const [lista, padrao] = await Promise.all([listarImpressorasSistema(), novo ? impressoraPadrao() : Promise.resolve(null)]);
      setImpressorasSistema(lista);
      setConexao((c) => (c.estado === "conectado" ? c : { estado: "conectado", versao: null }));
      if (novo && padrao) setForm((f) => (f && !f.qzPrinterName ? { ...f, qzPrinterName: padrao } : f));
      if (!lista.length) toast.warning("Nenhuma impressora instalada no Windows foi encontrada.");
    } catch (e) {
      setConexao({ estado: "erro", mensagem: mensagemErroQZ(e) });
    } finally {
      setBuscandoImpressoras(false);
    }
  }

  function abrirForm(perfil: Perfil | null) {
    setForm(perfil ? { ...perfil } : { ...PERFIL_VAZIO, nome: perfis.length ? "" : "Impressora da cozinha" });
    void buscarImpressoras(!perfil);
  }

  function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe um nome para a impressora.");
    if (!form.qzPrinterName) return toast.error("Selecione a impressora do computador.");
    salvarPerfil({ ...form, nome: form.nome.trim(), copias: Math.min(5, Math.max(1, form.copias || 1)) });
    toast.success("Impressora salva.");
    setForm(null);
  }

  function excluir() {
    if (!excluirId) return;
    excluirPerfil(excluirId);
    toast.success("Impressora removida.");
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

  const opcoesImpressora = form?.qzPrinterName && !impressorasSistema.includes(form.qzPrinterName) ? [form.qzPrinterName, ...impressorasSistema] : impressorasSistema;
  const conectado = conexao.estado === "conectado";

  return (
    <>
      <Dialog open={open} onOpenChange={alterarAberto}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form ? (form.id ? "Editar impressora" : "Nova impressora") : "Impressão"}</DialogTitle>
            <DialogDescription>Impressoras térmicas deste computador, via QZ Tray.</DialogDescription>
          </DialogHeader>

          <StatusConexao conexao={conexao} onTentar={() => (form ? void buscarImpressoras(!form.id) : verificarConexao())} />

          {form ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Impressora da cozinha" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Impressora do computador</Label>
                  <button
                    type="button"
                    onClick={() => void buscarImpressoras(false)}
                    disabled={buscandoImpressoras}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={`size-3 ${buscandoImpressoras ? "animate-spin" : ""}`} /> Buscar novamente
                  </button>
                </div>
                <Select value={form.qzPrinterName || null} onValueChange={(v) => v && setForm({ ...form, qzPrinterName: v as string })} disabled={!opcoesImpressora.length}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={buscandoImpressoras ? "Buscando impressoras..." : conectado ? "Selecione" : "Conecte o QZ Tray para listar"} />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesImpressora.map((nome) => (
                      <SelectItem key={nome} value={nome}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">A impressora precisa estar instalada no Windows (aparece em Configurações &gt; Impressoras).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Imprime pedidos de</Label>
                  <Select value={form.usoPara} onValueChange={(v) => v && setForm({ ...form, usoPara: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{(v: string) => USO_LABEL[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cozinha">Cozinha</SelectItem>
                      <SelectItem value="pdv">PDV</SelectItem>
                      <SelectItem value="ambos">Cozinha e PDV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Largura do papel</Label>
                  <Select value={form.papel} onValueChange={(v) => v && setForm({ ...form, papel: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50mm">58mm (pequena)</SelectItem>
                      <SelectItem value="80mm">80mm (padrão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Conteúdo</Label>
                  <Select value={form.tipoImpressao} onValueChange={(v) => v && setForm({ ...form, tipoImpressao: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples">Simples</SelectItem>
                      <SelectItem value="completa">Completa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cópias</Label>
                  <Input type="number" min={1} max={5} value={form.copias} onChange={(e) => setForm({ ...form, copias: Number(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Impressão automática</div>
                  <div className="text-xs text-muted-foreground">Imprime sozinho quando um pedido é finalizado no PDV.</div>
                </div>
                <Switch checked={form.impressaoAutomatica} onCheckedChange={(v) => setForm({ ...form, impressaoAutomatica: v })} />
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" className="gap-1.5" onClick={() => void testar(form)} disabled={!form.qzPrinterName || testando !== null}>
                  {testando === "form" ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />} Imprimir teste
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setForm(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={salvar}>Salvar</Button>
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              {perfis.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Printer className="mx-auto mb-2 size-6 text-muted-foreground" />
                  <div className="text-sm font-medium">Nenhuma impressora neste computador</div>
                  <div className="mt-1 text-xs text-muted-foreground">As impressoras ficam salvas por computador. Configure em cada caixa ou cozinha que for imprimir.</div>
                </div>
              ) : (
                <div className="max-h-[45vh] space-y-2 overflow-y-auto">
                  {perfis.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.nome}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.qzPrinterName || "Sem impressora vinculada"} · {p.papel === "50mm" ? "58mm" : p.papel} · {USO_LABEL[p.usoPara] ?? p.usoPara}
                          {p.impressaoAutomatica ? " · automática" : ""}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => void testar(p)} disabled={testando !== null} title="Imprimir teste">
                          {testando === p.id ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirForm(p)} title="Editar">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluirId(p.id)} title="Excluir">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => alterarAberto(false)}>
                  Fechar
                </Button>
                <Button className="gap-1.5" onClick={() => abrirForm(null)}>
                  <Plus className="size-4" /> Nova impressora
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={excluirId !== null}
        onOpenChange={(v) => !v && setExcluirId(null)}
        titulo="Excluir impressora"
        descricao="Tem certeza que deseja excluir esta impressora deste computador?"
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}

function StatusConexao({ conexao, onTentar }: { conexao: Conexao; onTentar: () => void }) {
  if (conexao.estado === "verificando") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Procurando o QZ Tray neste computador...
      </div>
    );
  }
  if (conexao.estado === "conectado") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-4 shrink-0" />
        QZ Tray conectado{conexao.versao ? ` (v${conexao.versao})` : ""}
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-start gap-2 font-medium text-amber-800 dark:text-amber-300">
        <XCircle className="mt-0.5 size-4 shrink-0" />
        {conexao.mensagem}
      </div>
      <ol className="list-decimal space-y-0.5 pl-9 text-xs text-muted-foreground">
        <li>Baixe e instale o QZ Tray neste computador (Windows).</li>
        <li>Abra o QZ Tray — o ícone aparece perto do relógio.</li>
        <li>Se aparecer o aviso pedindo permissão para este site, clique em &quot;Allow&quot;.</li>
      </ol>
      <div className="flex gap-2 pl-6">
        <Button size="sm" variant="outline" className="gap-1.5" nativeButton={false} render={<a href={QZ_DOWNLOAD_URL} target="_blank" rel="noreferrer" />}>
          <Download className="size-3.5" /> Baixar QZ Tray
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onTentar}>
          <RefreshCw className="size-3.5" /> Tentar novamente
        </Button>
      </div>
    </div>
  );
}
