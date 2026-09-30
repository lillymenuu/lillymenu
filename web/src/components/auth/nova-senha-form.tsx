"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DICA_SENHA_FORTE, validarSenhaForte } from "@/lib/senha";

export function NovaSenhaForm({ token }: { token: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const erroSenha = validarSenhaForte(senha);
    if (erroSenha) {
      setErro(erroSenha);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/auth/reset-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json();

      if (!data.ok) {
        setErro(data.msg ?? "Erro ao redefinir a senha.");
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">{DICA_SENHA_FORTE}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmacao">Confirmar senha</Label>
        <Input
          id="confirmacao"
          type="password"
          autoComplete="new-password"
          placeholder="Confirme a nova senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button type="submit" disabled={carregando} size="lg" className="mt-2 w-full">
        {carregando ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
