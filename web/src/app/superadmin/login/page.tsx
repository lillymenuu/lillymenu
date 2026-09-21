"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperadminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErro(data.erro ?? "Falha ao entrar.");
        return;
      }
      router.push("/superadmin/dashboard");
      router.refresh();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.1fr_1fr]">
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background:
            "radial-gradient(120% 80% at 0% 0%, rgba(156,85,35,.55), transparent 60%), linear-gradient(160deg, #1e293b 0%, #0f172a 100%)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon_store.png" alt="" className="size-9 rounded-lg bg-white p-1" />
          <span className="text-lg font-semibold">Lilly Menu</span>
        </div>
        <div className="max-w-md">
          <ShieldCheck size={40} className="mb-5 text-white/70" />
          <h1 className="text-3xl leading-tight font-semibold">Central de controle da plataforma</h1>
          <p className="mt-3 text-base text-white/70">
            Gerencie lojas, planos, cobranças e o atendimento de suporte em um só lugar.
          </p>
        </div>
        <p className="text-sm text-white/50">Acesso restrito à equipe Lilly Menu.</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-5">
          <div>
            <h2 className="text-2xl font-semibold">Entrar como superadmin</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use suas credenciais de administrador da plataforma.</p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email ou usuário
            <span className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <User size={16} className="text-muted-foreground" />
              <input
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha
            <span className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <Lock size={16} className="text-muted-foreground" />
              <input
                type={mostrar ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-normal outline-none"
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {erro && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <Button type="submit" size="lg" disabled={carregando} className="h-10">
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
