"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CreditCard, Landmark, Network, PieChart, Table, type LucideIcon } from "lucide-react";
import { cn } from "cn";

/* Atalhos entre as telas do modulo financeiro (mesmos icones do menu lateral). */
const ATALHOS: { href: string; rotulo: string; icone: LucideIcon }[] = [
  { href: "/financialdashboard", rotulo: "Dashboard", icone: PieChart },
  { href: "/financialtransactions", rotulo: "Lançamentos", icone: ArrowLeftRight },
  { href: "/financialcategories", rotulo: "Categorias", icone: Network },
  { href: "/financialaccounts", rotulo: "Contas financeiras", icone: Landmark },
  { href: "/financialpaymentmethods", rotulo: "Formas de pagamento", icone: CreditCard },
  { href: "/financialdre", rotulo: "DRE", icone: Table },
];

export function FinanceiroAtalhos() {
  const pathname = usePathname();
  return (
    <nav aria-label="Módulo financeiro" className="scrollbar-hidden max-w-full min-w-0 overflow-x-auto">
      <div className="flex w-max gap-1.5 rounded-full border bg-card p-1 shadow-xs">
        {ATALHOS.map(({ href, rotulo, icone: Icone }) => {
          const ativo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                ativo ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icone size={14} />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
