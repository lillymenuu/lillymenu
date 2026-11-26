import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function SomenteAdminPrincipal() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShieldAlert size={22} />
      </span>
      <h1 className="text-lg font-semibold">Acesso restrito</h1>
      <p className="text-sm text-muted-foreground">Apenas o administrador principal da loja pode gerenciar as permissões.</p>
      <Link href="/settings" className="text-sm font-medium text-primary hover:underline">
        Voltar para Configurações
      </Link>
    </div>
  );
}
