"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Plus, Trash2, Printer, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ordermanager/confirm-dialog";

type Perfil = {
  id: string | null;
  nome: string;
  qzPrinterName: string;
  tipo: string;
  usoPara: string;
  papel: string;
  copias: number;
  tipoImpressao: string;
  impressaoAutomatica: boolean;
};

declare global {
  interface Window {
    impressaoQZ?: {
      listarPerfis: () => Perfil[];
      salvarPerfil: (p: Perfil) => Perfil;
      excluirPerfil: (id: string) => void;
      listarImpressorasSistema: () => Promise<string[]>;
      imprimirTeste: (perfil: Perfil, lojaNome: string) => Promise<void>;
      garantirConexao: () => Promise<void>;
    };
  }
}

const PERFIL_VAZIO: Perfil = {
  id: null,
  nome: "",
  qzPrinterName: "",
  tipo: "nao_fiscal",
  usoPara: "cozinha",
  papel: "50mm",
  copias: 1,
  tipoImpressao: "simples",
  impressaoAutomatica: false,
};

export function ImpressaoDialog({
  open,
  onOpenChange,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  phpAdminUrl: string;
}) {
  const [scriptPronto, setScriptPronto] = useState(false);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [form, setForm] = useState<Perfil | null>(null);
  const [impressorasSistema, setImpressorasSistema] = useState<string[]>([]);
  const [buscandoImpressoras, setBuscandoImpressoras] = useState(false);
  const [testando, setTestando] = useState<string | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  function recarregar() {
    if (window.impressaoQZ) setPerfis(window.impressaoQZ.listarPerfis());
  }

  useEffect(() => {
    if (open && scriptPronto) recarregar();
  }, [open, scriptPronto]);

  async function abrirForm(perfil: Perfil | null) {
    setForm(perfil ?? { ...PERFIL_VAZIO });
    if (!window.impressaoQZ) return;
    setBuscandoImpressoras(true);
    try {
      const lista = await window.impressaoQZ.listarImpressorasSistema();
      setImpressorasSistema(lista);
    } catch {
      toast.error("Não foi possível conectar ao QZ Tray. Verifique se o aplicativo está aberto.");
    } finally {
      setBuscandoImpressoras(false);
    }
  }

  function salvar() {
    if (!form || !window.impressaoQZ) return;
    if (!form.nome.trim()) {
      toast.error("Informe um nome para a impressora.");
      return;
    }
    window.impressaoQZ.salvarPerfil(form);
    toast.success("Impressora salva.");
    setForm(null);
    recarregar();
  }

  function excluir() {
    if (!excluirId || !window.impressaoQZ) return;
    window.impressaoQZ.excluirPerfil(excluirId);
    toast.success("Impressora removida.");
    setExcluirId(null);
    recarregar();
  }

  async function testar(perfil: Perfil) {
    if (!window.impressaoQZ) return;
    setTestando(perfil.id);
    try {
      await window.impressaoQZ.imprimirTeste(perfil, "Minha Loja");
      toast.success("Teste enviado para a impressora.");
    } catch {
      toast.error("Erro ao imprimir teste. Verifique a conexão com o QZ Tray.");
    } finally {
      setTestando(null);
    }
  }

  return (
    <>
      <Script src={`${phpAdminUrl}/admin/assets/js/impressao_qz.js`} strategy="afterInteractive" onLoad={() => setScriptPronto(true)} />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Impressão</DialogTitle>
          </DialogHeader>

          {form ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Impressora da cozinha" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Impressora do sistema</Label>
                <Select value={form.qzPrinterName} onValueChange={(v) => v && setForm({ ...form, qzPrinterName: v as string })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={buscandoImpressoras ? "Buscando..." : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {impressorasSistema.map((nome) => (
                      <SelectItem key={nome} value={nome}>
                        {nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Uso</Label>
                  <Select value={form.usoPara} onValueChange={(v) => v && setForm({ ...form, usoPara: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cozinha">Cozinha</SelectItem>
                      <SelectItem value="pdv">PDV</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Papel</Label>
                  <Select value={form.papel} onValueChange={(v) => v && setForm({ ...form, papel: v as string })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50mm">50mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de impressão</Label>
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
                  <Input type="number" min={1} value={form.copias} onChange={(e) => setForm({ ...form, copias: Number(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="text-sm font-medium">Impressão automática</div>
                <Switch checked={form.impressaoAutomatica} onCheckedChange={(v) => setForm({ ...form, impressaoAutomatica: v })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button onClick={salvar}>Salvar impressora</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[45vh] space-y-2 overflow-y-auto">
                {perfis.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma impressora configurada neste computador.</div>
                ) : (
                  perfis.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.nome}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.qzPrinterName || "Sem impressora vinculada"} · {p.papel} · {p.usoPara}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => testar(p)} disabled={testando === p.id} title="Imprimir teste">
                          <Printer className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirForm(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluirId(p.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
                <Button className="gap-1.5" onClick={() => abrirForm(null)} disabled={!scriptPronto}>
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
        descricao="Tem certeza que deseja excluir este perfil de impressora?"
        textoConfirmar="Excluir"
        onConfirmar={excluir}
      />
    </>
  );
}
