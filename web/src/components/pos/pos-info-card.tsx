"use client";

import { Pencil, X } from "lucide-react";

export function PosInfoCard({
  onLimpar,
  onEditar,
  children,
}: {
  onLimpar?: () => void;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="flex shrink-0 gap-1">
          {onLimpar ? (
            <button
              type="button"
              onClick={onLimpar}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onEditar}
            className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
