"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Lock, Tv } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

export function ConectarTv({
  codigo,
  codigoFormatado,
  lojaNome,
  lojaLogo,
  permitido,
}: {
  codigo: string;
  codigoFormatado: string;
  lojaNome: string;
  lojaLogo: string | null;
  permitido: boolean;
}) {
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/midia-indoor/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nome: nome.trim() || "TV" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setErro(data.msg ?? "Não foi possível conectar a TV.");
        return;
      }
      setConectado(true);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)]">
        <div className="flex items-center gap-3">
          {lojaLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lojaLogo} alt="" className="size-11 rounded-2xl object-cover" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">{lojaNome.charAt(0)}</div>
          )}
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Mídia Indoor – Menu Digital</div>
            <div className="truncate font-semibold">{lojaNome}</div>
          </div>
        </div>

        {!permitido ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="size-5" />
            </div>
            <div className="font-semibold">Recurso não disponível</div>
            <p className="text-sm text-muted-foreground">A Mídia Indoor não está liberada no plano da sua loja ou no seu nível de acesso.</p>
            <Link href="/plan-details" className={cn(buttonVariants(), "mt-2 h-10 rounded-full px-5")}>
              Ver meu plano
            </Link>
          </div>
        ) : conectado ? (
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="size-12 text-emerald-500" />
            <div className="text-lg font-semibold">TV conectada!</div>
            <p className="text-sm text-muted-foreground">Em instantes o catálogo da loja aparece na tela da TV.</p>
            <Link href="/midia-indoor" className={cn(buttonVariants({ variant: "outline" }), "mt-2 h-10 rounded-full px-5")}>
              Configurar as TVs
            </Link>
          </div>
        ) : (
          <form onSubmit={conectar} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/60 py-4">
              <Tv className="size-6 text-primary" />
              <div className="text-xs text-muted-foreground">Código da TV</div>
              <div className="font-mono text-2xl font-semibold tracking-[0.2em]">{codigoFormatado}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tv-nome">Nome desta TV</Label>
              <Input
                id="tv-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Balcão, Salão, Vitrine"
                maxLength={60}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>
            {erro && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="h-11 rounded-full text-base" disabled={enviando}>
              {enviando ? "Conectando..." : "Conectar TV"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
