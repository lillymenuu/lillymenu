"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DadosFiscaisLoja } from "@/db/queries/nfce";

const REGIMES_TRIBUTARIOS: Record<string, string> = {
  "1": "Simples Nacional",
  "2": "Simples Nacional, excesso de sublimite",
  "3": "Regime Normal",
};

const REGIMES_ESPECIAIS: Record<string, string> = {
  "0": "Nenhum",
  "1": "Microempresa municipal",
  "2": "Estimativa",
  "3": "Sociedade de profissionais",
  "4": "Cooperativa",
};

const STATUS_LABEL: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  ativo: { label: "Ativo no PlugNotas", variant: "default" },
  erro: { label: "Erro no cadastro", variant: "destructive" },
};

export function NfceSettingsManager({ dadosIniciais }: { dadosIniciais: DadosFiscaisLoja | null }) {
  const [salvando, setSalvando] = useState(false);
  const [enviandoCertificado, setEnviandoCertificado] = useState(false);
  const [status, setStatus] = useState(dadosIniciais?.status ?? null);
  const [erroMensagem, setErroMensagem] = useState(dadosIniciais?.erro_mensagem ?? null);

  const [razaoSocial, setRazaoSocial] = useState(dadosIniciais?.razao_social ?? "");
  const [inscricaoEstadual, setInscricaoEstadual] = useState(dadosIniciais?.inscricao_estadual ?? "");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState(dadosIniciais?.inscricao_municipal ?? "");
  const [regimeTributario, setRegimeTributario] = useState(String(dadosIniciais?.regime_tributario ?? 1));
  const [regimeTributarioEspecial, setRegimeTributarioEspecial] = useState(String(dadosIniciais?.regime_tributario_especial ?? 0));
  const [simplesNacional, setSimplesNacional] = useState(dadosIniciais?.simples_nacional ?? true);
  const [ambienteProducao, setAmbienteProducao] = useState(dadosIniciais?.ambiente_producao ?? false);
  const [serieNfce, setSerieNfce] = useState(String(dadosIniciais?.serie_nfce ?? 1));
  const [numeroInicialNfce, setNumeroInicialNfce] = useState(String(dadosIniciais?.numero_inicial_nfce ?? 1));
  const [numeracaoAutomatica, setNumeracaoAutomatica] = useState(dadosIniciais?.numeracao_automatica ?? true);
  const [idCsc, setIdCsc] = useState(dadosIniciais?.id_codigo_seguranca_contribuinte ?? "");
  const [tokenCsc, setTokenCsc] = useState(dadosIniciais?.codigo_seguranca_contribuinte ?? "");

  const [arquivoCertificado, setArquivoCertificado] = useState<File | null>(null);
  const [senhaCertificado, setSenhaCertificado] = useState("");

  async function salvarDadosFiscais() {
    if (razaoSocial.trim() === "") {
      toast.error("Informe a razão social.");
      return;
    }
    setSalvando(true);
    try {
      const resp = await fetch("/api/nfce/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razaoSocial,
          inscricaoEstadual,
          inscricaoMunicipal,
          regimeTributario: Number(regimeTributario),
          regimeTributarioEspecial: Number(regimeTributarioEspecial),
          simplesNacional,
          ambienteProducao,
          serieNfce: Number(serieNfce),
          numeroInicialNfce: Number(numeroInicialNfce),
          numeracaoAutomatica,
          idCodigoSegurancaContribuinte: idCsc,
          codigoSegurancaContribuinte: tokenCsc,
        }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setStatus("erro");
        setErroMensagem(data.msg);
        toast.error(data.msg || "Erro ao salvar dados fiscais.");
        return;
      }
      setStatus("ativo");
      setErroMensagem(null);
      toast.success("Dados fiscais salvos e empresa cadastrada no PlugNotas.");
    } catch {
      toast.error("Falha de conexão ao salvar dados fiscais.");
    } finally {
      setSalvando(false);
    }
  }

  async function enviarCertificado() {
    if (!arquivoCertificado || senhaCertificado === "") {
      toast.error("Selecione o arquivo do certificado e informe a senha.");
      return;
    }
    setEnviandoCertificado(true);
    try {
      const form = new FormData();
      form.append("arquivo", arquivoCertificado);
      form.append("senha", senhaCertificado);
      const resp = await fetch("/api/nfce/certificado", { method: "POST", body: form });
      const data = await resp.json();
      if (!data.ok) {
        toast.error(data.msg || "Erro ao enviar certificado.");
        return;
      }
      setSenhaCertificado("");
      toast.success("Certificado cadastrado no PlugNotas.");
    } catch {
      toast.error("Falha de conexão ao enviar certificado.");
    } finally {
      setEnviandoCertificado(false);
    }
  }

  const statusInfo = status ? STATUS_LABEL[status] : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">NFCe</h1>
          <p className="text-sm text-muted-foreground">Emissão de Nota Fiscal do Consumidor via PlugNotas.</p>
        </div>
        {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
      </div>

      {erroMensagem && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">{erroMensagem}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="font-medium">1. Certificado digital (A1)</CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Arquivo .pfx, .p12 ou .cer da empresa. A senha é usada só no envio — não guardamos ela.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Arquivo do certificado</Label>
              <Input type="file" accept=".pfx,.p12,.cer,.p7" onChange={(e) => setArquivoCertificado(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1">
              <Label>Senha do certificado</Label>
              <Input type="password" value={senhaCertificado} onChange={(e) => setSenhaCertificado(e.target.value)} className="w-48" />
            </div>
            <Button onClick={enviarCertificado} disabled={enviandoCertificado}>
              {enviandoCertificado ? "Enviando…" : "Enviar certificado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="font-medium">2. Dados fiscais da empresa</CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Razão social</Label>
            <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Inscrição estadual</Label>
              <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Inscrição municipal</Label>
              <Input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Regime tributário</Label>
              <Select items={REGIMES_TRIBUTARIOS} value={regimeTributario} onValueChange={(v) => setRegimeTributario(v ?? "1")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REGIMES_TRIBUTARIOS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Regime tributário especial</Label>
              <Select items={REGIMES_ESPECIAIS} value={regimeTributarioEspecial} onValueChange={(v) => setRegimeTributarioEspecial(v ?? "0")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REGIMES_ESPECIAIS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Optante pelo Simples Nacional</div>
            </div>
            <Switch checked={simplesNacional} onCheckedChange={setSimplesNacional} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>ID do CSC</Label>
              <Input value={idCsc} onChange={(e) => setIdCsc(e.target.value)} placeholder="Gerado no portal da SEFAZ" />
            </div>
            <div className="space-y-1">
              <Label>Código do CSC</Label>
              <Input value={tokenCsc} onChange={(e) => setTokenCsc(e.target.value)} placeholder="Gerado no portal da SEFAZ" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Série da NFCe</Label>
              <Input type="number" min={1} value={serieNfce} onChange={(e) => setSerieNfce(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Número inicial</Label>
              <Input type="number" min={1} value={numeroInicialNfce} onChange={(e) => setNumeroInicialNfce(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm font-medium">Numeração automática</div>
            <Switch checked={numeracaoAutomatica} onCheckedChange={setNumeracaoAutomatica} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Ambiente de produção</div>
              <div className="text-xs text-muted-foreground">Desligado = homologação (notas de teste, sem valor fiscal).</div>
            </div>
            <Switch checked={ambienteProducao} onCheckedChange={setAmbienteProducao} />
          </div>

          <Button onClick={salvarDadosFiscais} disabled={salvando} className="w-full">
            {salvando ? "Salvando…" : "Salvar e cadastrar no PlugNotas"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
