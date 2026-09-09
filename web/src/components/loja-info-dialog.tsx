"use client";

import { Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { SidebarData } from "@/lib/sidebar";
import { cn } from "cn";

function resolverUrl(caminho: string | null, phpAdminUrl: string): string | null {
  if (!caminho) return null;
  return caminho.startsWith("http") ? caminho : `${phpAdminUrl}/${caminho}`;
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
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="p-4 pb-3">
          <DialogTitle>Informações da loja</DialogTitle>
        </div>

        <div className="mx-4 h-32 shrink-0 overflow-hidden rounded-xl bg-muted">
          {capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capaUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
              <ImageIcon size={22} />
              <span className="text-xs">Sem capa cadastrada</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-base font-bold text-foreground"
            )}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={loja.nome} className="size-full object-cover" />
            ) : (
              loja.inicial
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{loja.nome}</div>
            <div className="text-xs text-muted-foreground">Loja principal</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Contato</span>
            <span className="text-right font-medium text-foreground">
              {loja.contato !== "" ? loja.contato : "Não informado"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">CNPJ</span>
            <span className="text-right font-medium text-foreground">
              {loja.cnpj !== "" ? loja.cnpj : "Não informado"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-muted-foreground">Endereço</span>
            <div className="text-right font-medium text-foreground">
              {loja.enderecoLinhas.length > 0 ? (
                loja.enderecoLinhas.map((linha, i) => <div key={i}>{linha}</div>)
              ) : (
                <div>Não informado</div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
