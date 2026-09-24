"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROS_GOOGLE: Record<string, string> = {
  google_nao_configurado: "Login com Google indisponível no momento.",
  google_falha: "Não foi possível entrar com o Google. Tente novamente.",
  google_sem_conta: "Nenhuma conta LillyMenu com esse e-mail Google.",
  google_inativa: "Conta ou loja inativa. Entre em contato com o suporte.",
};

const DESTAQUES = [
  { icone: ShieldCheck, texto: "Acesso seguro ao seu painel" },
  { icone: BarChart3, texto: "Vendas e financeiro em tempo real" },
  { icone: Smartphone, texto: "Pedidos, cardápio e clientes num só lugar" },
];

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(ERROS_GOOGLE[searchParams.get("erro") ?? ""] ?? null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErro(data.erro ?? "Falha ao entrar.");
        return;
      }

      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch {
      setErro("Erro de conexao. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">L</span>
          LillyMenu
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
              <p className="text-sm text-muted-foreground">Entre com seu e-mail e senha para acessar o painel.</p>
            </div>

            <a href="/api/auth/google/start" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
              </svg>
              Entrar com Google
            </a>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou continue com e-mail
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" disabled={carregando} size="lg" className="mt-2 w-full">
                {carregando ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} LillyMenu. Todos os direitos reservados.</p>
      </div>

      <div className="relative hidden flex-col justify-center gap-8 overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5" />
        <div className="relative flex max-w-md flex-col gap-4">
          <h2 className="text-4xl font-semibold tracking-tight">Gerencie seu restaurante com facilidade</h2>
          <p className="text-base/7 text-primary-foreground/80">
            Acompanhe pedidos, controle o caixa e o estoque e veja o desempenho da sua loja em um só painel.
          </p>
        </div>
        <ul className="relative flex max-w-md flex-col gap-4">
          {DESTAQUES.map(({ icone: Icone, texto }) => (
            <li key={texto} className="flex items-center gap-3 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icone size={16} />
              </span>
              {texto}
              <CheckCircle2 size={16} className="ml-auto shrink-0 opacity-70" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
