"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProdutoValidade } from "@/lib/produtos";

const INTERVALO_MS = 15 * 60 * 1000;

/*
 * Porta o aviso de prazo de validade que o legado mostra em
 * admin/partials/sidebar.php (toast quando algum produto ativo vence em
 * ate 2 dias, ou ja venceu) — antes so existia no admin antigo, nao
 * aparecia em nenhuma tela do Next. Mesma janela de 2 dias, mesmo
 * dedup por sessionStorage (nao repete o mesmo aviso na mesma sessao do
 * navegador, so reaparece se a lista de produtos/dias restantes mudar).
 */
export function ValidadeAviso({ lojaId }: { lojaId: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!lojaId) return;
    const storageKey = `validade_notif_${lojaId}`;

    async function verificar() {
      try {
        const res = await fetch("/api/produtos/validade-check");
        const data = await res.json();
        if (!data.ok || !Array.isArray(data.produtos) || data.produtos.length === 0) return;

        const produtos: ProdutoValidade[] = data.produtos;
        const chaveAtual = produtos.map((p) => `${p.id}:${p.dias_restantes}`).sort().join(",");
        let chaveAnterior = "";
        try {
          chaveAnterior = sessionStorage.getItem(storageKey) ?? "";
        } catch {
          // sessionStorage indisponivel; segue sem dedup
        }
        if (chaveAtual === chaveAnterior) return;
        try {
          sessionStorage.setItem(storageKey, chaveAtual);
        } catch {
          // sem persistencia; ainda mostra o aviso nesta chamada
        }

        const [primeiro, ...resto] = produtos;
        const sub = resto.length > 0 ? `${primeiro.nome} e mais ${resto.length} produto${resto.length > 1 ? "s" : ""}` : primeiro.nome;

        toast.warning("Prazo de validade", {
          description: `${sub} — confira em Produtos › Prazo de validade`,
          duration: 8000,
          action: {
            label: "Ver",
            onClick: () => router.push("/produtos"),
          },
        });
      } catch {
        // silencioso — proxima verificacao tenta de novo
      }
    }

    verificar();
    const interval = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(interval);
  }, [lojaId, router]);

  return null;
}
