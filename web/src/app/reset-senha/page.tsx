import Link from "next/link";
import { validarTokenReset } from "@/db/queries/resetSenha";
import { NovaSenhaForm } from "@/components/auth/nova-senha-form";

export default async function ResetSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const tokenValido = token ? await validarTokenReset(token) : false;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">L</span>
            LillyMenu
          </div>
          {tokenValido ? (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Criar nova senha</h1>
              <p className="text-sm text-muted-foreground">Defina uma nova senha para continuar.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Link inválido ou expirado</h1>
              <p className="text-sm text-muted-foreground">
                Peça um novo link de redefinição na{" "}
                <Link href="/login" className="underline">
                  tela de login
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        {tokenValido && <NovaSenhaForm token={token!} />}
      </div>
    </div>
  );
}
