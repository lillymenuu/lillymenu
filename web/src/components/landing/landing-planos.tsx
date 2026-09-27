import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { remapLegacyHref } from "@/lib/landing";
import type { PlanoMarketing } from "@/db/queries/landingConfig";

type Beneficio = { titulo: string; texto: string };

/** Botoes "Assine ja!" (self-serve) apontavam pro dominio antigo — o destino certo agora e o formulario de cadastro do hero. */
function resolverLinkPlano(plano: PlanoMarketing): string {
  if (/assin/i.test(plano.botaoTexto)) return "#cadastro";
  return remapLegacyHref(plano.botaoLink);
}

export function LandingPlanos({
  titulo,
  destaques,
  planos,
  beneficiosTitulo,
  beneficios,
}: {
  titulo: string;
  destaques: string[];
  planos: PlanoMarketing[];
  beneficiosTitulo: string;
  beneficios: Beneficio[];
}) {
  if (planos.length === 0) return null;

  return (
    <section id="planos" className="mx-auto max-w-6xl px-4 py-14 md:py-20 lg:px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h2>
        {destaques.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {destaques.map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" /> {d}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {planos.map((plano) => (
          <div
            key={plano.slug}
            className={cn(
              "flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm",
              plano.badge && "border-primary ring-1 ring-primary/30"
            )}
          >
            {plano.badge && (
              <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{plano.badge}</span>
            )}
            <div>
              <h3 className="text-lg font-semibold">{plano.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plano.descricao}</p>
            </div>
            {plano.preco && (
              <div className="text-2xl font-semibold tracking-tight">
                {plano.preco}
                {plano.preco !== "R$ 0,00" && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
              </div>
            )}
            <ul className="flex flex-col gap-2 text-sm">
              {plano.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a href={resolverLinkPlano(plano)} className={cn(buttonVariants({}), "mt-auto w-full")}>
              {plano.botaoTexto}
            </a>
          </div>
        ))}
      </div>

      {beneficios.length > 0 && (
        <div className="mt-16">
          <h3 className="text-center text-xl font-semibold tracking-tight">{beneficiosTitulo}</h3>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beneficios.map((b) => (
              <div key={b.titulo} className="flex flex-col gap-1.5 rounded-xl border bg-muted/30 p-5">
                <h4 className="text-sm font-semibold">{b.titulo}</h4>
                <p className="text-sm text-muted-foreground">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
