"use client";

import { toast } from "sonner";

/** Aviso em vermelho quando o cliente tenta passar da quantidade disponivel em estoque. */
export function avisarEstoqueIndisponivel() {
  toast.error("Quantidade do item indisponível no momento!", {
    style: { background: "#dc2626", color: "#fff", border: "none" },
  });
}
