"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Clock3, FileKey2, Building2, UploadCloud, FileCheck2, Info, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DadosFiscaisLoja, CertificadoFiscal } from "@/db/queries/nfce";
import { cn } from "cn";

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

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info size={12} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function StepMarker({ icon: Icon, done, withLine }: { icon: React.ElementType; done: boolean; withLine: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
      </div>
      {withLine && <div className="mt-2 w-px flex-1 bg-border" />}
    </div>
  );
}

export function NfceSettingsManager({
  dadosIniciais,
  certificadoInicial,
}: {
  dadosIniciais: DadosFiscaisLoja | null;
  certificadoInicial: CertificadoFiscal | null;
}) {
  const [salvando, setSalvando] = useState(false);
  const [enviandoCertificado, setEnviandoCertificado] = useState(false);
  const [status, setStatus] = useState(dadosIniciais?.status ?? null);
  const [erroMensagem, setErroMensagem] = useState(dadosIniciais?.erro_mensagem ?? null);
  const [certificadoCadastrado, setCertificadoCadastrado] = useState(Boolean(certificadoInicial));

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setCertificadoCadastrado(true);
      toast.success("Certificado cadastrado no PlugNotas.");
    } catch {
      toast.error("Falha de conexão ao enviar certificado.");
    } finally {
      setEnviandoCertificado(false);
    }
  }

  const dadosFiscaisCompletos = razaoSocial.trim() !== "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Emissão de NFC-e</h1>
        <p className="text-sm text-muted-foreground">
          Cadastre o certificado digital e os dados fiscais da loja pra começar a emitir Nota Fiscal do Consumidor eletrônica, via PlugNotas.
        </p>
      </div>

      <StatusBanner status={status} erroMensagem={erroMensagem} ambienteProducao={ambienteProducao} />

      <div className="rounded-xl border bg-card">
        {/* Passo 1 — Certificado digital */}
        <div className="flex gap-4 p-6">
          <StepMarker icon={FileKey2} done={certificadoCadastrado} withLine />
          <div className="flex-1 space-y-4 pb-2">
            <div>
              <h2 className="font-medium">Certificado digital (A1)</h2>
              <p className="text-sm text-muted-foreground">O arquivo que identifica sua empresa perante a Receita e assina as notas eletronicamente.</p>
            </div>

            <details className="group rounded-md border border-dashed px-3 py-2 text-muted-foreground open:bg-muted/30">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <HelpCircle size={13} className="shrink-0" />
                Não sei onde encontrar o arquivo do certificado
              </summary>
              <div className="mt-2 space-y-1.5 pl-[19px] text-xs">
                <p>
                  O arquivo (.pfx ou .p12) é baixado no site da <strong className="text-foreground">Autoridade Certificadora</strong> que emitiu o certificado — Certisign,
                  Serasa Experian, Soluti, SafeWeb, AC Bird ID etc. — na área &quot;Meus Certificados&quot; da conta, dentro do prazo de validade.
                </p>
                <p>
                  Se o certificado foi enviado pra outra plataforma de emissão de notas (não a certificadora original), normalmente não dá pra baixar de volta por lá — essas
                  plataformas guardam o arquivo só pra uso interno. É preciso pegar o arquivo direto com quem emitiu o certificado.
                </p>
              </div>
            </details>

            <div className="flex flex-wrap items-start gap-3">
              <div className="space-y-1.5">
                <Label>Arquivo do certificado</Label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-64 items-center gap-2 rounded-md border border-dashed px-3 text-left text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <UploadCloud size={15} className="shrink-0" />
                  <span className="truncate">{arquivoCertificado ? arquivoCertificado.name : "Escolher arquivo .pfx, .p12 ou .cer"}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pfx,.p12,.cer,.p7"
                  className="hidden"
                  onChange={(e) => setArquivoCertificado(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Senha do certificado</Label>
                <Input type="password" value={senhaCertificado} onChange={(e) => setSenhaCertificado(e.target.value)} className="w-48" />
              </div>
              <Button onClick={enviarCertificado} disabled={enviandoCertificado} className="mt-[22px]">
                {enviandoCertificado ? "Enviando…" : certificadoCadastrado ? "Substituir" : "Enviar certificado"}
              </Button>
            </div>
            <FieldHint>A senha trafega só no envio — não guardamos ela, apenas o certificado fica com o PlugNotas.</FieldHint>
          </div>
        </div>

        {/* Passo 2 — Dados fiscais */}
        <div className="flex gap-4 border-t p-6">
          <StepMarker icon={Building2} done={status === "ativo"} withLine={false} />
          <div className="flex-1 space-y-5 pb-1">
            <div>
              <h2 className="font-medium">Dados fiscais da empresa</h2>
              <p className="text-sm text-muted-foreground">Como sua loja é identificada e tributada perante o Fisco.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Razão social</Label>
              <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Razão social conforme CNPJ" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Inscrição estadual</Label>
                <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Inscrição municipal</Label>
                <Input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
            <FieldHint>Na dúvida sobre regime tributário, confirme com seu contador — esse dado define como o imposto é calculado em cada nota.</FieldHint>

            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm font-medium">Optante pelo Simples Nacional</span>
              <Switch checked={simplesNacional} onCheckedChange={setSimplesNacional} />
            </div>

            <div className="space-y-1.5 border-t pt-4">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Código de Segurança do Contribuinte</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={idCsc} onChange={(e) => setIdCsc(e.target.value)} placeholder="ID do CSC" />
                <Input value={tokenCsc} onChange={(e) => setTokenCsc(e.target.value)} placeholder="Código do CSC" />
              </div>
              <FieldHint>Gerado no Portal do Contribuinte da SEFAZ da sua UF. É o que garante a autenticidade do QR Code impresso na nota.</FieldHint>
            </div>

            <div className="space-y-1.5 border-t pt-4">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Numeração</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">Série da NFC-e</Label>
                  <Input type="number" min={1} value={serieNfce} onChange={(e) => setSerieNfce(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal text-muted-foreground">Próximo número</Label>
                  <Input type="number" min={1} value={numeroInicialNfce} onChange={(e) => setNumeroInicialNfce(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">Numeração automática</span>
                <Switch checked={numeracaoAutomatica} onCheckedChange={setNumeracaoAutomatica} />
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-4">
              <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ambiente de emissão</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setAmbienteProducao(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    !ambienteProducao ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Homologação (testes)
                </button>
                <button
                  type="button"
                  onClick={() => setAmbienteProducao(true)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    ambienteProducao ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Produção
                </button>
              </div>
              <FieldHint>
                {ambienteProducao
                  ? "As notas emitidas em produção têm valor fiscal real e são enviadas à SEFAZ de verdade."
                  : "Em homologação as notas são de teste, sem valor fiscal — use pra validar o cadastro antes de ir pra produção."}
              </FieldHint>
            </div>

            <Button onClick={salvarDadosFiscais} disabled={salvando} className="w-full">
              {dadosFiscaisCompletos && status === "ativo" ? <FileCheck2 size={16} /> : null}
              {salvando ? "Salvando…" : status === "ativo" ? "Atualizar cadastro no PlugNotas" : "Salvar e cadastrar no PlugNotas"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  erroMensagem,
  ambienteProducao,
}: {
  status: "pendente" | "ativo" | "erro" | null;
  erroMensagem: string | null;
  ambienteProducao: boolean;
}) {
  if (status === "ativo") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-[#bbf0c9] bg-[#f0fdf4] p-4">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#15803d]" />
        <div>
          <div className="text-sm font-medium text-[#15803d]">Pronta pra emitir NFC-e</div>
          <p className="text-sm text-[#166534]">
            Cadastro ativo no PlugNotas, ambiente de {ambienteProducao ? "produção" : "homologação"}. Emita a nota direto no detalhe do pedido.
          </p>
        </div>
      </div>
    );
  }

  if (status === "erro") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
        <div>
          <div className="text-sm font-medium text-destructive">Não foi possível concluir o cadastro</div>
          <p className="text-sm text-destructive/90">{erroMensagem ?? "Revise os dados abaixo e tente salvar novamente."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
      <Clock3 size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-sm font-medium">Cadastro pendente</div>
        <p className="text-sm text-muted-foreground">Envie o certificado digital e preencha os dados fiscais abaixo pra ativar a emissão de NFC-e.</p>
      </div>
    </div>
  );
}
