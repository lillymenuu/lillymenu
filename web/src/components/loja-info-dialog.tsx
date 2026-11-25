"use client";

import type { ReactNode } from "react";
import { BadgeCheck, FileText, Image as ImageIcon, MapPin, Phone, X } from "lucide-react";
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
    <div className="flex items-start gap-3 px-3.5 py-2.5">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icone}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{rotulo}</div>
        <div className={cn("text-sm leading-snug", vazio ? "text-muted-foreground" : "font-medium text-foreground")}>{children}</div>
      </div>
    </div>
  );
}

export function LojaInfoDialog({
  open,
  onOpenChange,
  loja,
  phpAdminUrl,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loja: SidebarData["loja"];
  phpAdminUrl: string;
}) {
  const logoUrl = resolverUrl(loja.logo, phpAdminUrl);
  const capaUrl = resolverUrl(loja.capa, phpAdminUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Informações da loja</DialogTitle>

        {/* Capa de ponta a ponta, com o botao de fechar por cima */}
        <div className="relative h-36 shrink-0 bg-muted">
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
        <div className="grid gap-x-5 gap-y-4 px-5 pb-5 sm:grid-cols-[200px_1fr]">
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
              <h2 className="text-lg leading-tight font-semibold text-foreground">{loja.nome}</h2>
              {loja.verificada && <BadgeCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-label="Loja verificada" />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Loja principal</span>
              {/* "aberta" so diz se a loja NAO foi fechada manualmente (o horario nao entra aqui), entao so avisa quando esta fechada. */}
              {!loja.aberta && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  Fechada manualmente
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/70 self-start overflow-hidden rounded-2xl border bg-muted/30 sm:mt-4">
            <LinhaInfo icone={<Phone size={15} />} rotulo="Contato" vazio={loja.contato === ""}>
              {loja.contato !== "" ? loja.contato : "Não informado"}
            </LinhaInfo>
            <LinhaInfo icone={<FileText size={15} />} rotulo="CNPJ" vazio={loja.cnpj === ""}>
              {loja.cnpj !== "" ? loja.cnpj : "Não informado"}
            </LinhaInfo>
            <LinhaInfo icone={<MapPin size={15} />} rotulo="Endereço" vazio={loja.enderecoLinhas.length === 0}>
              {loja.enderecoLinhas.length > 0 ? loja.enderecoLinhas.map((linha, i) => <div key={i}>{linha}</div>) : "Não informado"}
            </LinhaInfo>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
