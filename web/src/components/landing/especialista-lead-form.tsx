"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EspecialistaLeadForm({
  faturamentoOpcoes,
  modeloNegocioOpcoes,
  botaoTexto,
}: {
  faturamentoOpcoes: string[];
  modeloNegocioOpcoes: string[];
  botaoTexto: string;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [modeloNegocio, setModeloNegocio] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !telefone.trim() || !empresa.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/leads/especialista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, empresa, faturamento, modelo_negocio: modeloNegocio, aceite_whatsapp: aceite }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível enviar seus dados.");
        return;
      }
      setEnviado(true);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] bg-white p-8 text-center shadow-[0_24px_50px_rgba(8,20,33,0.3)]">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <h3 className="text-[17px] font-bold">Recebemos seus dados!</h3>
        <p className="text-[14.5px] text-[#5b6169]">Nosso time vai entrar em contato em breve.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-[20px] bg-white p-6 shadow-[0_24px_50px_rgba(8,20,33,0.3)] sm:p-7">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esp-nome">Seu nome</Label>
          <Input id="esp-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esp-empresa">Nome da empresa</Label>
          <Input id="esp-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esp-email">E-mail</Label>
          <Input id="esp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="esp-telefone">Telefone</Label>
          <Input id="esp-telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Faturamento mensal</Label>
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
          <Label>Modelo de negócio</Label>
          <Select value={modeloNegocio} onValueChange={(v) => setModeloNegocio(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {modeloNegocioOpcoes.map((op) => (
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
        Aceito receber contato no WhatsApp.
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[var(--landing-accent)] text-base font-semibold text-white shadow-[0_10px_22px_-6px_rgb(var(--landing-accent-rgb)/0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--landing-accent-dark)] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : botaoTexto}
      </button>
    </form>
  );
}
