"use client";

import Link from "next/link";
import { ArrowLeft, Plus, ShieldCheck, User, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import type { NivelAcesso } from "@/lib/permissoes";

export function PermissoesLista({ niveis }: { niveis: NivelAcesso[] }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 min-[1800px]:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/settings" className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft size={13} /> Configurações
          </Link>
          <h1 className="text-xl font-semibold">Permissões</h1>
          <p className="text-sm text-muted-foreground">Crie níveis de acesso e defina o que cada usuário da equipe pode usar no sistema.</p>
        </div>
        <Link href="/settings/permissions/new" className={cn(buttonVariants(), "h-10 rounded-full px-5")}>
          <Plus size={16} /> Criar permissão
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {niveis.map((n) => (
          <Link
            key={n.id}
            href={`/settings/permissions/${n.id}`}
            className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-11 items-center justify-center rounded-full border text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                {n.acessoTotal ? <ShieldCheck size={18} /> : <User size={18} />}
              </span>
              <span className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                {n.acessoTotal ? "Acesso total" : `${n.permissoes.length} ${n.permissoes.length === 1 ? "permissão" : "permissões"}`}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium">
                {n.nome}
                {n.padrao && " (Padrão)"}
              </div>
              {n.padrao ? (
                <div className="mt-0.5 text-xs text-primary">Permissão padrão do sistema</div>
              ) : (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users size={12} />
                  {n.usuarios === 0 ? "Nenhum usuário" : `${n.usuarios} ${n.usuarios === 1 ? "usuário" : "usuários"}`}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Para dar um nível de acesso a alguém, vá em Configurações → Usuários e escolha o nível no cadastro do usuário.
      </p>
    </div>
  );
}
