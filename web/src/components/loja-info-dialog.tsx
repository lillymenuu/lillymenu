"use client";

import type { ReactNode } from "react";
import { BadgeCheck, CalendarClock, FileText, Gem, Image as ImageIcon, MapPin, Phone, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { SidebarData } from "@/lib/sidebar";
import { cn } from "cn";

function resolverUrl(caminho: string | null, phpAdminUrl: string): string | null {
  if (!caminho) return null;
  return caminho.startsWith("http") ? caminho : `${phpAdminUrl}/${caminho}`;
}

/** Linha do cartao de informacoes: icone, rotulo pequeno e valor logo abaixo. */
function LinhaInfo({ icone, rotulo, children, vazio }: { icone: ReactNode; rotulo: string; children: ReactNode; vazio?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icone}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</div>
        <div className={cn("text-[13px] leading-snug", vazio ? "text-muted-foreground" : "font-medium text-foreground")}>{children}</div>
      </div>
    </div>
  );
}

export function LojaInfoDialog({
  open,
  onOpenChange,
  loja,
  plano,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loja: SidebarData["loja"];
  plano: SidebarData["plano"];
  phpAdminUrl: string;
}) {
  const logoUrl = resolverUrl(loja.logo, phpAdminUrl);
  const capaUrl = resolverUrl(loja.capa, phpAdminUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Informações da loja</DialogTitle>

        {/* Capa de ponta a ponta, com o botao de fechar por cima */}
        <div className="relative h-44 shrink-0 bg-muted">
          {capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capaUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/15 to-primary/5 text-muted-foreground">
              <ImageIcon size={22} />
              <span className="text-xs">Sem capa cadastrada</span>
            </div>
          )}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
          <DialogClose
            aria-label="Fechar"
            className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-700 shadow-sm backdrop-blur transition-colors hover:bg-white"
          >
            <X size={16} />
          </DialogClose>
        </div>

        {/* Duas colunas: perfil (logo sobre a capa, nome e etiquetas) e, ao lado, as informacoes.
            No celular as colunas empilham. */}
        <div className="grid gap-x-5 gap-y-4 px-5 pb-5 sm:grid-cols-[180px_1fr]">
          <div className="min-w-0">
            {/* relative + z-10: sem isso a capa (posicionada) e pintada por cima e corta a logo. */}
            <div className="relative z-10 -mt-10 flex size-20 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-foreground shadow-md ring-4 ring-background">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={loja.nome} className="size-full object-cover" />
              ) : (
                loja.inicial
              )}
            </div>

            <div className="mt-3 flex items-start gap-1.5">
              <h2 className="text-base leading-tight font-semibold text-foreground">{loja.nome}</h2>
              {loja.verificada && <BadgeCheck size={16} className="mt-0.5 shrink-0 text-primary" aria-label="Loja verificada" />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Loja principal</span>
              {/* "aberta" so diz se a loja NAO foi fechada manualmente (o horario nao entra aqui), entao so avisa quando esta fechada. */}
              {!loja.aberta && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  Fechada manualmente
                </span>
              )}
            </div>

            {/* Plano contratado e validade */}
            <div className="mt-3 rounded-2xl bg-muted/40 px-3 py-2.5 text-[12px]">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Gem size={11} />
                </span>
                <span className="truncate">{plano.nome || "Sem plano"}</span>
                {plano.badge && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">{plano.badge}</span>
                )}
              </div>
              <div className={cn("mt-1 flex items-center gap-1.5", plano.status === "expirado" ? "font-medium text-red-600" : "text-muted-foreground")}>
                <CalendarClock size={13} className="shrink-0" />
                {plano.status === "expirado" ? "Plano expirado" : plano.expira ? `Expira ${plano.expira.replace(/^ate/, "até")}` : "Sem data de expiração"}
              </div>
            </div>
          </div>

          <div className="self-start rounded-2xl bg-muted/40 py-1 sm:mt-4">
            <LinhaInfo icone={<Phone size={14} />} rotulo="Contato" vazio={loja.contato === ""}>
              {loja.contato !== "" ? loja.contato : "Não informado"}
            </LinhaInfo>
            <LinhaInfo icone={<FileText size={14} />} rotulo="CNPJ" vazio={loja.cnpj === ""}>
              {loja.cnpj !== "" ? loja.cnpj : "Não informado"}
            </LinhaInfo>
            <LinhaInfo icone={<MapPin size={14} />} rotulo="Endereço" vazio={loja.enderecoLinhas.length === 0}>
              {loja.enderecoLinhas.length > 0 ? loja.enderecoLinhas.map((linha, i) => <div key={i}>{linha}</div>) : "Não informado"}
            </LinhaInfo>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
