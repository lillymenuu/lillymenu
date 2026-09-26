"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

function fieldClass() {
  return "w-full rounded-xl border-[1.5px] border-neutral-200 bg-neutral-50 px-3.5 py-3 text-base text-neutral-900 outline-none transition-colors focus:bg-white";
}

/* Equivalente de public/garcom_login.php. */
export function GarcomLoginForm({ lojaId, slug, nomeLoja, logoUrl }: { lojaId: number; slug: string; nomeLoja: string; logoUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !codigo.trim()) {
      setErro("Preencha o e-mail e o código de acesso.");
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/waitermode/garcom-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loja_id: lojaId, email, codigo }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErro(data.msg ?? "E-mail ou código inválido.");
        return;
      }
      router.push(`/${slug}/garcom`);
      router.refresh();
    } catch {
      setErro("Erro de comunicação. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex size-16 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-neutral-400">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <h1 className="text-[1.1rem] font-bold text-neutral-900">Acesso do garçom</h1>
          <p className="text-[.86rem] text-neutral-500">{nomeLoja}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoCapitalize="off"
            placeholder="seu@email.com"
            className={fieldClass()}
          />
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            maxLength={5}
            autoCapitalize="characters"
            placeholder="Código de acesso"
            className={`${fieldClass()} text-center tracking-[.3em] uppercase`}
          />
          {erro && <p className="text-[.82rem] text-red-600">{erro}</p>}
          <button type="submit" disabled={carregando} className="mt-1 w-full rounded-[10px] bg-neutral-900 py-3.5 text-[.9rem] font-bold text-white disabled:opacity-60">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
