import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

/* Destino de exigirRecurso(): a tela pedida nao esta liberada no plano da loja (ou no nivel do usuario). */
export default function SemAcessoPage() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Recurso não disponível</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Esta tela não está liberada no plano da sua loja ou no seu nível de acesso. Para usar, fale com o administrador ou veja as opções do
          seu plano.
        </p>
        <div className="mt-5 flex gap-2">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}>
            Voltar ao início
          </Link>
          <Link href="/plan-details" className={cn(buttonVariants(), "rounded-full")}>
            Ver meu plano
          </Link>
        </div>
      </div>
    </div>
  );
}
