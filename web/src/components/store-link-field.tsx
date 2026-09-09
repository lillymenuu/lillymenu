"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function StoreLinkField({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  if (!link) return null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs font-medium text-primary">Link da sua loja</span>
      <div className="flex items-center gap-1.5 rounded-full border bg-background py-1 pl-3 pr-1">
        <span className="max-w-[180px] truncate text-xs text-muted-foreground" title={link}>
          {link}
        </span>
        <button
          type="button"
          onClick={copiar}
          className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Copiar link da loja"
        >
          {copiado ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}
