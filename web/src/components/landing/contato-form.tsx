"use client";

import { useLayoutEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mesma largura da caixa azul inteira do "Fale com um especialista"
 * (#contato), que e fluida (max-w-1180 com padding) -- medida em tempo real
 * em vez de copiada num px fixo, pra continuar batendo em qualquer tela. */
function useLarguraComoCta(): number | undefined {
  const [largura, setLargura] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const alvo = document.querySelector("#contato .landing-dots-bg");
    if (!alvo) return;
    const atualizar = () => setLargura(alvo.getBoundingClientRect().width);
    atualizar();
    const observer = new ResizeObserver(atualizar);
    observer.observe(alvo);
    return () => observer.disconnect();
  }, []);

  return largura;
}

export function ContatoForm() {
  const largura = useLarguraComoCta();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !mensagem.trim()) {
      toast.error("Preencha nome, e-mail e a mensagem.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, whatsapp, assunto, mensagem }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.msg ?? "Não foi possível enviar sua mensagem.");
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
      <div className="mx-auto flex max-w-[1132px] flex-col items-center gap-3 rounded-[20px] border border-[#e5e7eb] bg-white p-8 text-center" style={largura ? { maxWidth: largura } : undefined}>
        <CheckCircle2 className="size-10 text-emerald-500" />
        <h3 className="text-[17px] font-bold">Mensagem enviada!</h3>
        <p className="text-[14.5px] text-[#5b6169]">Recebemos seu contato e vamos responder em breve.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="mx-auto flex max-w-[1132px] flex-col gap-3 rounded-[20px] border border-[#e5e7eb] bg-white p-6 sm:p-7"
      style={largura ? { maxWidth: largura } : undefined}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contato-nome">Seu nome</Label>
          <Input id="contato-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contato-email">E-mail</Label>
          <Input id="contato-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contato-whatsapp">Contato WhatsApp</Label>
          <Input id="contato-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contato-assunto">Assunto</Label>
          <Input id="contato-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contato-mensagem">O que você gostaria de falar?</Label>
        <textarea
          id="contato-mensagem"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          rows={4}
          required
          placeholder="Conte pra gente o que você precisa"
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] text-base font-semibold text-white shadow-[0_10px_22px_-6px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-0.5 hover:bg-[#1d4ed8] disabled:opacity-60"
      >
        {enviando ? "Enviando..." : "Enviar mensagem"}
      </button>
    </form>
  );
}
