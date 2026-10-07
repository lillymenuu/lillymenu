"use client";

import { FileCheck2, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { urlArquivo, type SaLoja } from "@/lib/superadmin";
import { cn } from "cn";

/* Card de loja (substitui a antiga linha de tabela) — referencia visual: card de app/integracao em
   tom preto e branco (logo, nome, descricao, acoes), com leve elevacao no hover. O selo de status
   (ativa/trial/suspensa) mantem a cor semantica ja usada no resto do superadmin — e sinal
   operacional real, nao decoracao, entao fica de fora do "so preto e branco". Clicar no card (fora
   dos botoes de acao) abre o faturamento; os botoes de Editar/Suspender/Excluir e o chip de
   "revisar comprovante" cancelam a propagacao pra nao abrir o faturamento junto. */

const STATUS_ESTILO: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-700",
  trial: "bg-amber-100 text-amber-700",
  suspensa: "bg-rose-100 text-rose-700",
};

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function SaLojaCard({
  loja,
  phpAdminUrl,
  onAbrirFaturamento,
  onEditar,
  onSuspender,
  onAtivar,
  onExcluir,
  onRevisarComprovante,
}: {
  loja: SaLoja;
  phpAdminUrl: string;
  onAbrirFaturamento: () => void;
  onEditar: () => void;
  onSuspender: () => void;
  onAtivar: () => void;
  onExcluir: () => void;
  onRevisarComprovante: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAbrirFaturamento}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-2">
        {loja.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlArquivo(loja.logo, phpAdminUrl)} alt="" className="size-11 shrink-0 rounded-xl border border-slate-200 bg-white object-cover dark:border-white/10" />
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-neutral-300">{iniciais(loja.nome)}</span>
        )}
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize", STATUS_ESTILO[loja.status] ?? "bg-slate-100 text-slate-600")}>
          {loja.status}
        </span>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-slate-900 dark:text-neutral-100">{loja.nome}</h3>
        <p className="truncate text-sm text-slate-500 dark:text-neutral-400">{loja.segmento || "Segmento não definido"}</p>
      </div>

      {loja.cobranca.aguardando_revisao && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRevisarComprovante();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onRevisarComprovante();
            }
          }}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
        >
          <FileCheck2 size={13} /> Revisar comprovante
        </span>
      )}

      <div className="mt-1 flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-white/10">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onEditar();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onEditar())}
          aria-label="Editar"
          title="Editar"
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
        >
          <Pencil size={15} />
        </span>
        {loja.ativo ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSuspender();
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onSuspender())}
            aria-label="Suspender"
            title="Suspender"
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
          >
            <PowerOff size={15} />
          </span>
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onAtivar();
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onAtivar())}
            aria-label="Ativar"
            title="Ativar"
            className="flex size-8 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            <Power size={15} />
          </span>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onExcluir();
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onExcluir())}
          aria-label="Excluir"
          title="Excluir"
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-neutral-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-400"
        >
          <Trash2 size={15} />
        </span>
      </div>
    </button>
  );
}
