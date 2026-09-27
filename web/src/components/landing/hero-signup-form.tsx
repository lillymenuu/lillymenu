"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PlanoSignup } from "@/db/queries/landingConfig";

export function HeroSignupForm({
  planos,
  faturamentoOpcoes,
  segmentoOpcoes,
  labels,
}: {
  planos: PlanoSignup[];
  faturamentoOpcoes: string[];
  segmentoOpcoes: string[];
  labels: {
    titulo: string;
    nome: string;
    empresa: string;
    email: string;
    whatsapp: string;
    faturamento: string;
    segmento: string;
    aceite: string;
    botao: string;
  };
}) {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [planoSlug, setPlanoSlug] = useState(planos[0]?.landingSlug ?? "");
  const [faturamento, setFaturamento] = useState("");
  const [segmento, setSegmento] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<{ email: string } | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !empresa.trim() || !email.trim() || !whatsapp.trim() || !planoSlug) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, empresa, email, whatsapp, plano_slug: planoSlug, faturamento, segmento, aceite_whatsapp: aceite }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível concluir o cadastro.");
        return;
      }
      setSucesso({ email });
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center shadow-[0_22px_45px_rgba(8,20,33,0.16)]">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <h3 className="text-[17px] font-bold">Cadastro realizado!</h3>
        <p className="text-[14.5px] text-[#5b6169]">
          Acabamos de enviar o acesso ao sistema para <strong className="text-[#1f2328]">{sucesso.email}</strong>.
        </p>
        <a href="/login" className="text-sm font-semibold text-[#2563eb] underline underline-offset-4">
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="landing-lead-glow flex flex-col gap-3 rounded-[20px] bg-white p-6 shadow-[0_22px_45px_rgba(8,20,33,0.16)] sm:p-7"
    >
      <h3 className="text-[17px] font-bold">{labels.titulo}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-nome">{labels.nome}</Label>
          <Input id="lead-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-empresa">{labels.empresa}</Label>
          <Input id="lead-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-email">{labels.email}</Label>
          <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lead-whatsapp">{labels.whatsapp}</Label>
          <Input id="lead-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Escolha o seu plano</Label>
        <Select value={planoSlug} onValueChange={(v) => setPlanoSlug(v ?? "")}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o plano" />
          </SelectTrigger>
          <SelectContent>
            {planos.map((p) => (
              <SelectItem key={p.landingSlug} value={p.landingSlug}>
                {p.nome} {p.valor > 0 ? `— R$ ${p.valor.toFixed(2)}/mês` : "— grátis"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{labels.faturamento}</Label>
          <Select value={faturamento} onValueChange={(v) => setFaturamento(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {faturamentoOpcoes.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{labels.segmento}</Label>
          <Select value={segmento} onValueChange={(v) => setSegmento(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {segmentoOpcoes.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="group/field-label flex items-start gap-2 text-xs text-muted-foreground">
        <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} className="mt-0.5" />
        {labels.aceite}
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] text-base font-semibold text-white shadow-[0_10px_22px_-6px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : labels.botao}
      </button>
    </form>
  );
}
