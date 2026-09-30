"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, MapPin, Pencil } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarCpfCnpj, validarCpfCnpj } from "@/lib/cpfCnpj";
import { DICA_SENHA_FORTE, validarSenhaForte } from "@/lib/senha";
import { EnderecoModal, type Endereco } from "./endereco-modal";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function HeroSignupForm({
  faturamentoOpcoes,
  segmentoOpcoes,
  labels,
}: {
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
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [modalEnderecoAberto, setModalEnderecoAberto] = useState(false);
  const [faturamento, setFaturamento] = useState("");
  const [segmento, setSegmento] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const emailValido = EMAIL_REGEX.test(email);
  const senhasConferem = confirmarSenha.length > 0 && senha === confirmarSenha;
  const erroSenha = senha.length > 0 ? validarSenhaForte(senha) : null;
  const cpfCnpjValido = validarCpfCnpj(cpfCnpj);

  const liberaContato = nome.trim().length >= 2 && empresa.trim().length >= 2;
  const liberaSenha = liberaContato && emailValido && whatsapp.trim().length >= 8;
  const liberaDocumento = liberaSenha && validarSenhaForte(senha) === null && senhasConferem;
  const liberaPerfil = liberaDocumento && cpfCnpjValido && endereco !== null;
  const liberaFinal = liberaPerfil && faturamento !== "" && segmento !== "";

  const [mostraContato, setMostraContato] = useState(false);
  const [mostraSenha, setMostraSenhaEtapa] = useState(false);
  const [mostraDocumento, setMostraDocumento] = useState(false);
  const [mostraPerfil, setMostraPerfil] = useState(false);
  const [mostraFinal, setMostraFinal] = useState(false);

  useEffect(() => {
    if (!liberaContato) return;
    const t = setTimeout(() => setMostraContato(true), 0);
    return () => clearTimeout(t);
  }, [liberaContato]);
  useEffect(() => {
    if (!liberaSenha) return;
    const t = setTimeout(() => setMostraSenhaEtapa(true), 0);
    return () => clearTimeout(t);
  }, [liberaSenha]);
  useEffect(() => {
    if (!liberaDocumento) return;
    const t = setTimeout(() => setMostraDocumento(true), 0);
    return () => clearTimeout(t);
  }, [liberaDocumento]);
  useEffect(() => {
    if (!liberaPerfil) return;
    const t = setTimeout(() => setMostraPerfil(true), 0);
    return () => clearTimeout(t);
  }, [liberaPerfil]);
  useEffect(() => {
    if (!liberaFinal) return;
    const t = setTimeout(() => setMostraFinal(true), 0);
    return () => clearTimeout(t);
  }, [liberaFinal]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!liberaFinal || !aceite) {
      toast.error("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          empresa,
          email,
          whatsapp,
          senha,
          cpf_cnpj: cpfCnpj,
          cep: endereco?.cep ?? "",
          rua: endereco?.rua ?? "",
          numero: endereco?.numero ?? "",
          bairro: endereco?.bairro ?? "",
          cidade: endereco?.cidade ?? "",
          estado: endereco?.estado ?? "",
          faturamento,
          segmento,
          aceite_whatsapp: aceite,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível concluir o cadastro.");
        return;
      }
      setSucesso(true);
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
        <h3 className="text-[17px] font-bold">Loja criada com sucesso!</h3>
        <p className="text-[14.5px] text-[#5b6169]">
          Em breve você receberá um e-mail com o link para acessar sua loja.
        </p>
      </div>
    );
  }

  return (
    <>
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
        </div>

        {mostraContato && (
          <div className="landing-card-reveal grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-email">{labels.email}</Label>
              <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-whatsapp">{labels.whatsapp}</Label>
              <Input id="lead-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required />
            </div>
          </div>
        )}

        {mostraSenha && (
          <div className="landing-card-reveal grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-senha">Senha</Label>
              <div className="relative">
                <Input
                  id="lead-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pr-8"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className={cn("text-xs", erroSenha ? "text-destructive" : "text-muted-foreground")}>{erroSenha ?? DICA_SENHA_FORTE}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-confirmar-senha">Repita a senha</Label>
              <Input
                id="lead-confirmar-senha"
                type={mostrarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                aria-invalid={confirmarSenha.length > 0 && !senhasConferem}
                required
              />
              {confirmarSenha.length > 0 && !senhasConferem && <p className="text-xs text-destructive">As senhas não coincidem.</p>}
            </div>
          </div>
        )}

        {mostraDocumento && (
          <div className="landing-card-reveal flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-cpf-cnpj">CPF/CNPJ</Label>
              <Input
                id="lead-cpf-cnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatarCpfCnpj(e.target.value))}
                aria-invalid={cpfCnpj.length > 0 && !cpfCnpjValido}
                placeholder="000.000.000-00"
                required
              />
              {cpfCnpj.length > 0 && !cpfCnpjValido && <p className="text-xs text-destructive">CPF/CNPJ inválido.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Endereço</Label>
              {endereco ? (
                <button
                  type="button"
                  onClick={() => setModalEnderecoAberto(true)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-input px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[#f9fafb]"
                >
                  <span className="truncate">
                    {endereco.rua}, {endereco.numero} - {endereco.bairro}, {endereco.cidade}/{endereco.estado}
                  </span>
                  <Pencil className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalEnderecoAberto(true)}
                  className="flex h-8 items-center gap-2 rounded-lg border border-input px-2.5 text-sm text-muted-foreground transition-colors hover:bg-[#f9fafb] hover:text-foreground"
                >
                  <MapPin className="size-3.5" />
                  Informar endereço pelo CEP
                </button>
              )}
            </div>
          </div>
        )}

        {mostraPerfil && (
          <div className="landing-card-reveal grid gap-3 sm:grid-cols-2">
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
        )}

        {mostraFinal && (
          <div className="landing-card-reveal flex flex-col gap-3">
            <label className="group/field-label flex items-start gap-2 text-xs text-muted-foreground">
              <Checkbox checked={aceite} onCheckedChange={(v) => setAceite(v === true)} className="mt-0.5" />
              {labels.aceite}
            </label>

            <button
              type="submit"
              disabled={enviando}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] text-base font-semibold text-white shadow-[0_10px_22px_-6px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:opacity-60",
                !enviando && "landing-cta-pulse"
              )}
            >
              {enviando ? "Enviando..." : labels.botao}
            </button>
          </div>
        )}
      </form>

      <EnderecoModal open={modalEnderecoAberto} onOpenChange={setModalEnderecoAberto} valorInicial={endereco} onSalvar={setEndereco} />
    </>
  );
}
